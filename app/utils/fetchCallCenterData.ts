import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import type { CallCenterDocument, CallCenterOldMetrics, CallCenterSummary } from '../../models/callCenterTypes';

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
