import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from './firebase';
import type { CallCenterNewDocument, CallCenterNewMetrics, CallCenterNewSummary, CallCenterNewConvertedRow } from '../../models/callCenterNewTypes';
import type { CallCenterListItem, PagedResult } from '../../models/callCenterTypes';

// Collection name for the new dataset
const NEW_COLLECTION = 'call-center-external';

function ensureNumber(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

// Daily grouped converted users for the new dataset
export interface CallCenterNewDailyConverted {
  date: string;
  rows: CallCenterNewConvertedRow[];
}

// Fetch paged daily converted rows by listing dates and loading each date's document
export async function fetchCallCenterNewConvertedPaged(options?: { pageSize?: number; cursor?: any }): Promise<PagedResult<CallCenterNewDailyConverted>> {
  const pageSize = options?.pageSize ?? 10;
  const cursor = options?.cursor;
  // First fetch a page of dates
  const { items, nextCursor } = await fetchCallCenterNewDatesList({ pageSize, cursor });
  if (items.length === 0) return { items: [], nextCursor: undefined };

  // Load each date's converted list in parallel (bounded by pageSize)
  const docs = await Promise.all(items.map((it) => fetchCallCenterNewDocByDate(it.date || it.id)));
  const daily: CallCenterNewDailyConverted[] = [];
  for (let i = 0; i < items.length; i++) {
    const date = items[i].date || items[i].id;
    const doc = docs[i];
    const rows: CallCenterNewConvertedRow[] = Array.isArray(doc?.summary?.convertedList)
      ? (doc!.summary!.convertedList as CallCenterNewConvertedRow[])
      : [];
    daily.push({ date, rows });
  }

  return { items: daily, nextCursor };
}

export function computeCallCenterNewMetricsFromSummary(summary?: CallCenterNewSummary, date?: string): CallCenterNewMetrics {
  const conversions = ensureNumber(
    summary?.convertedCount,
    Array.isArray(summary?.convertedList) ? summary!.convertedList!.length : 0
  );
  const notContacted = ensureNumber(summary?.notConvertedCount, 0);
  const totalFromTotals = ensureNumber(summary?.totals?.total_rows, 0);
  const totalCalls = totalFromTotals > 0 ? totalFromTotals : conversions + notContacted;

  return {
    conversions,
    notContacted,
    totalCalls,
    date,
  };
}

// Fetch a single new document by date (doc ID fast-path -> fallback where('date','==',date))
export async function fetchCallCenterNewDocByDate(date: string): Promise<CallCenterNewDocument | null> {
  try {
    const dref = doc(db, NEW_COLLECTION, date);
    const dsnap = await getDoc(dref);
    if (dsnap.exists()) {
      const data = dsnap.data() as any;
      return {
        date: data?.date ?? date,
        summary: data?.summary,
        report_url: data?.report_url,
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      } as CallCenterNewDocument;
    }
  } catch (e) {
    console.warn('[CallCenterNew] fetch by doc id failed, fallback to where(date==)', e);
  }

  try {
    const collRef = collection(db, NEW_COLLECTION);
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
      } as CallCenterNewDocument;
    }
  } catch (e2) {
    console.error('[CallCenterNew] fetchCallCenterNewDocByDate failed', e2);
  }
  return null;
}

// List available dates with pagination for the new dataset
export async function fetchCallCenterNewDatesList(options?: { pageSize?: number; cursor?: any }): Promise<PagedResult<CallCenterListItem>> {
  const pageSize = options?.pageSize ?? 25;
  const cursor = options?.cursor;
  const collRef = collection(db, NEW_COLLECTION);

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
    console.warn('[CallCenterNew] fetchCallCenterNewDatesList orderBy(date) failed, falling back to created_at', err);
  }

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

// Aggregate cumulative metrics across all new documents (paged)
export async function fetchCallCenterNewCumulativeMetrics(options?: { pageSize?: number; maxPages?: number; onProgress?: (processed: number) => void }): Promise<CallCenterNewMetrics> {
  const pageSize = options?.pageSize ?? 50;
  const maxPages = options?.maxPages ?? Number.MAX_SAFE_INTEGER;
  const onProgress = options?.onProgress;

  let totalConversions = 0;
  let totalNotContacted = 0;
  let totalCalls = 0;

  let pagesFetched = 0;
  let cursor: any = undefined;
  let usedCreatedAtFallback = false;

  async function processPage(q: any) {
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data() as any;
      const summary = data?.summary as CallCenterNewSummary | undefined;
      const conversions = ensureNumber(
        summary?.convertedCount,
        Array.isArray(summary?.convertedList) ? summary!.convertedList!.length : 0
      );
      const notContacted = ensureNumber(summary?.notConvertedCount, 0);
      const totalFromTotals = ensureNumber(summary?.totals?.total_rows, 0);
      const total = totalFromTotals > 0 ? totalFromTotals : conversions + notContacted;

      totalConversions += conversions;
      totalNotContacted += notContacted;
      totalCalls += total;
    }
    cursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : undefined;
    pagesFetched += 1;
    onProgress?.(pagesFetched * pageSize);
    return snap.docs.length;
  }

  const collRef = collection(db, NEW_COLLECTION);
  try {
    while (pagesFetched < maxPages) {
      const base = query(collRef, orderBy('date', 'desc'), limit(pageSize));
      const q = cursor ? query(base, startAfter(cursor)) : base;
      const count = await processPage(q);
      if (count < pageSize) break;
    }
  } catch (e) {
    console.warn('[CallCenterNew] cumulative orderBy(date) failed, switching to created_at', e);
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
