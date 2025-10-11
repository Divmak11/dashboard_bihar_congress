import { db } from './firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { DateRange } from '../../models/gharGharYatraTypes';
import { D2DMember, D2DMemberWithMetrics, D2DMemberMetrics, D2DRole } from '../../models/d2dTypes';
import { fetchOverviewSourceData } from './fetchGharGharYatraData';

function toUtcStartMs(dateStr: string): number {
  // Force UTC day start
  return new Date(`${dateStr}T00:00:00.000Z`).getTime();
}

function toUtcEndMs(dateStr: string): number {
  // Force UTC day end
  return new Date(`${dateStr}T23:59:59.999Z`).getTime();
}

export function roleWeight(role: D2DRole): number {
  switch (role) {
    case 'AC': return 0;
    case 'SLP': return 1;
    case 'Saathi': return 2;
    default: return 3;
  }
}

function normalizePhone(p?: string): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, '');
  // Use last 10 digits for Indian numbers
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}

export async function fetchD2DMembersInRange(
  dateRange: DateRange,
  options?: { search?: string; pageSize?: number; lastDoc?: DocumentSnapshot | null }
): Promise<{ members: D2DMember[]; pagination: { hasMore: boolean; lastVisible: DocumentSnapshot | null; totalFetched: number } }> {
  const pageSize = options?.pageSize ?? 50;
  const startMs = toUtcStartMs(dateRange.startDate);
  const endMs = toUtcEndMs(dateRange.endDate);

  let qRef = query(
    collection(db, 'd2d_members'),
    where('createdAt', '>=', startMs),
    where('createdAt', '<=', endMs),
    orderBy('createdAt', 'asc'),
    limit(pageSize)
  );

  if (options?.lastDoc) {
    qRef = query(
      collection(db, 'd2d_members'),
      where('createdAt', '>=', startMs),
      where('createdAt', '<=', endMs),
      orderBy('createdAt', 'asc'),
      startAfter(options.lastDoc),
      limit(pageSize)
    );
  }

  const snap = await getDocs(qRef);
  let members: D2DMember[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<D2DMember, 'id'>) }));

  // Optional client-side search
  const term = options?.search?.trim().toLowerCase();
  if (term) {
    members = members.filter((m) =>
      m.name?.toLowerCase().includes(term) ||
      m.phoneNumber?.toLowerCase().includes(term) ||
      m.assembly?.toLowerCase().includes(term)
    );
  }

  // Sort by role precedence then name
  members.sort((a, b) => {
    const rw = roleWeight(a.role) - roleWeight(b.role);
    if (rw !== 0) return rw;
    return (a.name || '').localeCompare(b.name || '');
  });

  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  const hasMore = snap.docs.length === pageSize;

  return {
    members,
    pagination: { hasMore, lastVisible, totalFetched: members.length }
  };
}

export async function attachGgyMetricsToMembers(
  members: D2DMember[],
  dateRange: DateRange
): Promise<D2DMemberWithMetrics[]> {
  if (members.length === 0) {
    return [];
  }

  // Reuse optimized single-source fetch from GGY utilities
  const { slpData } = await fetchOverviewSourceData(dateRange.startDate, dateRange.endDate);

  // Build aggregation maps for quick lookup
  const byPhone = new Map<string, D2DMemberMetrics>();
  const bySlpId = new Map<string, D2DMemberMetrics>();

  const add = (acc: D2DMemberMetrics | undefined, t: number, u: number, d: number, tr: number): D2DMemberMetrics => {
    if (!acc) return { totalPunches: t, uniquePunches: u, doubleEntries: d, tripleEntries: tr };
    return {
      totalPunches: acc.totalPunches + t,
      uniquePunches: acc.uniquePunches + u,
      doubleEntries: acc.doubleEntries + d,
      tripleEntries: acc.tripleEntries + tr,
    };
  };

  for (const r of slpData) {
    const m = { totalPunches: r.totalPunches, uniquePunches: r.uniquePunches, doubleEntries: r.doubleEntries, tripleEntries: r.tripleEntries };
    const phoneKey = normalizePhone((r as any).slpPhoneNumber);
    if (phoneKey) byPhone.set(phoneKey, add(byPhone.get(phoneKey), m.totalPunches, m.uniquePunches, m.doubleEntries, m.tripleEntries));
    if (r.slpId) bySlpId.set(r.slpId, add(bySlpId.get(r.slpId), m.totalPunches, m.uniquePunches, m.doubleEntries, m.tripleEntries));
  }

  // Merge
  const merged: D2DMemberWithMetrics[] = members.map((mem) => {
    const zeros: D2DMemberMetrics = { totalPunches: 0, uniquePunches: 0, doubleEntries: 0, tripleEntries: 0 };
    const phoneKey = normalizePhone(mem.phoneNumber);
    let metrics: D2DMemberMetrics | undefined;

    if (phoneKey && byPhone.has(phoneKey)) {
      metrics = byPhone.get(phoneKey);
    } else if (mem.id && bySlpId.has(mem.id)) {
      metrics = bySlpId.get(mem.id);
    } else if (mem.handler_id && bySlpId.has(mem.handler_id)) {
      metrics = bySlpId.get(mem.handler_id);
    }

    return { ...mem, metrics: metrics ?? zeros };
  });

  return merged;
}
