import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from './firebase';
import type { CallCenterDocument, CallCenterListItem, CallCenterOldMetrics, CallCenterSummary, PagedResult } from '../../models/callCenterTypes';

// Helper: safely get count for a status using exact key first, then case-insensitive fallback
function getStatusCount(statusCounts: Record<string, number> | undefined, target: string): number {
  if (!statusCounts) return 0;
  if (target in statusCounts) return statusCounts[target] ?? 0;

  // Fallback: case-insensitive and trimmed comparison
  const normTarget = target.trim().toLowerCase();
  for (const key of Object.keys(statusCounts)) {
    if (key.trim().toLowerCase() === normTarget) {
      return statusCounts[key] ?? 0;
    }
  }
  return 0;
}

// NEW: Fetch a single document by date (fast path: doc id is the date). Fallback to where('date','==', date)
export async function fetchCallCenterDocByDate(date: string): Promise<CallCenterDocument | null> {
  try {
    // Try document ID first (common case)
    const dref = doc(db, 'call-center', date);
    const dsnap = await getDoc(dref);
    if (dsnap.exists()) {
      const data = dsnap.data() as any;
      return {
        date: data?.date ?? date,
        summary: data?.summary,
        report_url: data?.report_url,
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      } as CallCenterDocument;
    }
  } catch (e) {
    console.warn('[CallCenter] fetch by doc id failed, will fallback to where(date == value)', e);
  }

  try {
    const collRef = collection(db, 'call-center');
    const q = query(collRef, where('date', '==', date), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data() as any;
      return {
        date: data?.date ?? date,
        summary: data?.summary,
        report_url: data?.report_url,
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      } as CallCenterDocument;
    }
  } catch (e2) {
    console.error('[CallCenter] fetchCallCenterDocByDate failed', e2);
  }
  return null;
}

// NEW: List available dates with pagination. Primary order by 'date' desc; fallback to 'created_at' desc
export async function fetchCallCenterDatesList(options?: { pageSize?: number; cursor?: any }): Promise<PagedResult<CallCenterListItem>> {
  const pageSize = options?.pageSize ?? 25;
  const cursor = options?.cursor;
  const collRef = collection(db, 'call-center');

  // Prefer ordering by 'date' desc
  try {
    const base = query(collRef, orderBy('date', 'desc'), limit(pageSize));
    const q = cursor ? query(base, startAfter(cursor)) : base;
    const snap = await getDocs(q);
    const items: CallCenterListItem[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        date: data?.date ?? d.id,
        report_url: data?.report_url,
        created_at: data?.created_at,
      };
    });
    const nextCursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : undefined;
    return { items, nextCursor };
  } catch (err) {
    console.warn('[CallCenter] fetchCallCenterDatesList orderBy(date) failed, falling back to created_at', err);
  }

  // Fallback to created_at desc
  const base2 = query(collRef, orderBy('created_at', 'desc'), limit(pageSize));
  const q2 = cursor ? query(base2, startAfter(cursor)) : base2;
  const snap2 = await getDocs(q2);
  const items2: CallCenterListItem[] = snap2.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      date: data?.date ?? d.id,
      report_url: data?.report_url,
      created_at: data?.created_at,
    };
  });
  const nextCursor2 = snap2.docs.length === pageSize ? snap2.docs[snap2.docs.length - 1] : undefined;
  return { items: items2, nextCursor: nextCursor2 };
}

// NEW: Aggregate cumulative metrics across all documents (paginated). Optionally report progress.
export async function fetchCallCenterCumulativeMetrics(options?: { pageSize?: number; maxPages?: number; onProgress?: (processed: number, total?: number) => void }): Promise<CallCenterOldMetrics> {
  const pageSize = options?.pageSize ?? 50;
  const maxPages = options?.maxPages ?? Number.MAX_SAFE_INTEGER;
  const onProgress = options?.onProgress;

  let totalConversions = 0;
  let totalNotContacted = 0;
  let totalCalls = 0;

  let pagesFetched = 0;
  let cursor: any = undefined;
  let usedCreatedAtFallback = false;

  // Helper to process one page given a query
  async function processPage(q: any) {
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data() as any;
      const summary = data?.summary as CallCenterSummary | undefined;
      const statusCounts = summary?.status_counts;
      totalConversions += getStatusCount(statusCounts, 'Conversation Done with Female');
      totalConversions += getStatusCount(statusCounts, 'Conversation Done with Female via Male');
      totalNotContacted += getStatusCount(statusCounts, 'Not contacted');
      totalCalls += sumStatusCounts(statusCounts);
    }
    cursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : undefined;
    pagesFetched += 1;
    onProgress?.(pagesFetched * pageSize);
    return snap.docs.length;
  }

  const collRef = collection(db, 'call-center');
  try {
    // Primary path: order by date desc
    while (pagesFetched < maxPages) {
      const base = query(collRef, orderBy('date', 'desc'), limit(pageSize));
      const q = cursor ? query(base, startAfter(cursor)) : base;
      const count = await processPage(q);
      if (count < pageSize) break;
    }
  } catch (e) {
    console.warn('[CallCenter] cumulative orderBy(date) failed, switching to created_at', e);
    usedCreatedAtFallback = true;
  }

  if (usedCreatedAtFallback && pagesFetched < maxPages) {
    cursor = undefined;
    while (pagesFetched < maxPages) {
      const base2 = query(collRef, orderBy('created_at', 'desc'), limit(pageSize));
      const q2 = cursor ? query(base2, startAfter(cursor)) : base2;
      const count2 = await processPage(q2);
      if (count2 < pageSize) break;
    }
  }

  return {
    conversions: totalConversions,
    notContacted: totalNotContacted,
    totalCalls: totalCalls,
  };
}

function sumStatusCounts(statusCounts: Record<string, number> | undefined): number {
  if (!statusCounts) return 0;
  return Object.values(statusCounts).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
}

export function computeCallCenterOldMetricsFromSummary(summary?: CallCenterSummary, date?: string, reportUrl?: string): CallCenterOldMetrics {
  const statusCounts = summary?.status_counts;
  const conversions =
    getStatusCount(statusCounts, 'Conversation Done with Female') +
    getStatusCount(statusCounts, 'Conversation Done with Female via Male');

  const notContacted = getStatusCount(statusCounts, 'Not contacted');
  const totalCalls = sumStatusCounts(statusCounts);

  // Optional debug: compare with totals.total_rows, but do not alter computation
  const totalRows = summary?.totals?.total_rows ?? undefined;
  if (typeof totalRows === 'number' && totalRows !== totalCalls) {
    console.warn('[CallCenter] total_rows mismatch with sum(status_counts):', { totalRows, totalCalls });
  }

  return {
    conversions,
    notContacted,
    totalCalls,
    date,
    reportUrl,
  };
}

export async function fetchLatestCallCenterDocument(): Promise<CallCenterDocument | null> {
  try {
    const collRef = collection(db, 'call-center');

    // Try ordering by 'date' (desc) first
    try {
      const q1 = query(collRef, orderBy('date', 'desc'), limit(1));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        const doc = snap1.docs[0];
        const data = doc.data() as any;
        return {
          date: data?.date,
          summary: data?.summary,
          report_url: data?.report_url,
          created_at: data?.created_at,
          updated_at: data?.updated_at,
        } as CallCenterDocument;
      }
    } catch (err) {
      console.warn('[CallCenter] orderBy(date) failed or no docs, falling back to created_at', err);
    }

    // Fallback ordering by created_at (desc)
    try {
      const q2 = query(collRef, orderBy('created_at', 'desc'), limit(1));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const doc = snap2.docs[0];
        const data = doc.data() as any;
        return {
          date: data?.date,
          summary: data?.summary,
          report_url: data?.report_url,
          created_at: data?.created_at,
          updated_at: data?.updated_at,
        } as CallCenterDocument;
      }
    } catch (err2) {
      console.error('[CallCenter] orderBy(created_at) fallback failed', err2);
    }

    return null;
  } catch (error) {
    console.error('[CallCenter] fetchLatestCallCenterDocument error', error);
    return null;
  }
}
