import { db } from './firebase';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, startAfter } from 'firebase/firestore';
import type { CumulativeMetrics } from '../../models/hierarchicalTypes';
import type { AdminUser } from '../../models/types';
import { fetchCumulativeMetrics } from './fetchHierarchicalData';

export type SupportedUserRole = 'Assembly Coordinator' | 'Zonal Incharge';

export interface DisplayUser {
  uid: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  assembly?: string;
  assemblies?: string[];
  district?: string;
  block?: string;
  village?: string;
  state?: string;
  vertical?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface FetchUsersParams {
  role?: SupportedUserRole;
  search?: string;
  pageSize?: number;
  startAfterName?: string; // works with orderBy('name')
}

export interface FetchUsersResult {
  users: DisplayUser[];
  nextCursorName?: string;
}

export function formatUserForDisplay(raw: any, id: string): DisplayUser {
  const display: DisplayUser = {
    uid: id,
    name: raw?.name || 'Unnamed',
    role: raw?.role || '',
    phone: raw?.phoneNumber || raw?.phone || undefined,
    email: raw?.email || undefined,
    assembly: raw?.assembly || undefined,
    assemblies: Array.isArray(raw?.assemblies) ? raw.assemblies : undefined,
    district: raw?.district || undefined,
    block: raw?.block || undefined,
    village: raw?.village || undefined,
    state: raw?.state || undefined,
    vertical: raw?.vertical || undefined,
    createdAt: typeof raw?.createdAt === 'number' ? raw.createdAt : undefined,
    updatedAt: typeof raw?.updatedAt === 'number' ? raw.updatedAt : undefined,
  };
  return display;
}

export async function fetchAllUsersPaged(params: FetchUsersParams = {}): Promise<FetchUsersResult> {
  const { role, search, pageSize = 100, startAfterName } = params;
  const usersRef = collection(db, 'users');
  const users: DisplayUser[] = [];
  let nextCursorName: string | undefined = undefined;

  try {
    const qParts: any[] = [];
    if (role) {
      qParts.push(where('role', '==', role));
    }
    // Primary path: order by name for stable paging
    qParts.push(orderBy('name'));
    qParts.push(limit(pageSize));

    let q = query(usersRef, ...qParts);
    if (startAfterName) {
      q = query(usersRef, ...[...qParts.slice(0, -1), startAfter(startAfterName), qParts[qParts.length - 1]]);
    }
    const snap = await getDocs(q);
    snap.forEach((docu) => {
      const d = formatUserForDisplay(docu.data(), docu.id);
      users.push(d);
    });
  } catch (err) {
    console.warn('[fetchAllUsersPaged] orderBy(name) path failed, falling back to simple query:', err);
    // Fallback: no orderBy (avoids composite index), no cursor
    const fallbackParts: any[] = [];
    if (role) fallbackParts.push(where('role', '==', role));
    fallbackParts.push(limit(pageSize));
    const q = query(usersRef, ...fallbackParts);
    const snap = await getDocs(q);
    snap.forEach((docu) => {
      const d = formatUserForDisplay(docu.data(), docu.id);
      users.push(d);
    });
  }

  // Compute next cursor from sorted (if any) or last element name
  if (users.length > 0) {
    nextCursorName = users[users.length - 1].name;
  }

  // Client-side search filter (name/email/phone)
  const normalizedSearch = (search || '').trim().toLowerCase();
  const filtered = normalizedSearch
    ? users.filter(u =>
        (u.name || '').toLowerCase().includes(normalizedSearch) ||
        (u.email || '').toLowerCase().includes(normalizedSearch) ||
        (u.phone || '').toLowerCase().includes(normalizedSearch)
      )
    : users;

  return {
    users: filtered,
    nextCursorName,
  };
}

export async function getZonalAssembliesForUser(uid: string, selectedVertical: 'wtm' | 'shakti-abhiyaan'): Promise<string[]> {
  // Priority 1: admin-users.assemblies (as requested)
  try {
    const adminDocRef = doc(db, 'admin-users', uid);
    const adminDoc = await getDoc(adminDocRef);
    if (adminDoc.exists()) {
      const adminData: any = adminDoc.data();
      const assemblies = Array.isArray(adminData?.assemblies) ? adminData.assemblies : [];
      if (assemblies.length > 0) {
        return Array.from(new Set(assemblies.filter((a: any) => typeof a === 'string' && a.trim().length > 0)));
      }
    }
  } catch (e) {
    console.warn('[getZonalAssembliesForUser] Error reading admin-users doc:', e);
  }

  // Priority 2: users.assemblies
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData: any = userDoc.data();
      const assemblies = Array.isArray(userData?.assemblies) ? userData.assemblies : [];
      if (assemblies.length > 0) {
        return Array.from(new Set(assemblies.filter((a: any) => typeof a === 'string' && a.trim().length > 0)));
      }
    }
  } catch (e) {
    console.warn('[getZonalAssembliesForUser] Error reading users doc:', e);
  }

  // Priority 3: zones where zonalIncharge == uid
  try {
    const zonesRef = collection(db, 'zones');
    const q = query(zonesRef, where('zonalIncharge', '==', uid), where('parentVertical', '==', selectedVertical));
    const snap = await getDocs(q);
    const assemblies: string[] = [];
    snap.forEach((docu) => {
      const data = docu.data() as any;
      if (Array.isArray(data?.assemblies)) assemblies.push(...data.assemblies);
    });
    if (assemblies.length > 0) {
      return Array.from(new Set(assemblies.filter((a: any) => typeof a === 'string' && a.trim().length > 0)));
    }
  } catch (e) {
    console.warn('[getZonalAssembliesForUser] Error reading zones:', e);
  }

  return [];
}

export async function fetchUserCumulativeMetrics(
  user: DisplayUser,
  dateRange: { startDate: string; endDate: string } | undefined,
  vertical: 'wtm' | 'shakti-abhiyaan',
  adminUser?: AdminUser | null,
  isLastDayFilter?: boolean
): Promise<CumulativeMetrics> {
  const role = (user.role || '').toLowerCase();
  if (role === 'assembly coordinator') {
    const assemblies = user.assemblies && user.assemblies.length > 0
      ? user.assemblies
      : (user.assembly ? [user.assembly] : []);
    return await fetchCumulativeMetrics({
      level: 'ac',
      handler_id: user.uid,
      assemblies,
      dateRange,
      vertical,
      adminUser: adminUser ?? null,
      isLastDayFilter: !!isLastDayFilter,
    });
  }
  if (role === 'zonal incharge') {
    const assemblies = await getZonalAssembliesForUser(user.uid, vertical);
    return await fetchCumulativeMetrics({
      level: 'zone',
      assemblies,
      dateRange,
      vertical,
      adminUser: adminUser ?? null,
      isLastDayFilter: !!isLastDayFilter,
    });
  }
  // Unsupported roles: return zero-filled structure
  const zero: CumulativeMetrics = {
    meetings: 0, volunteers: 0, slps: 0, saathi: 0,
    shaktiLeaders: 0, shaktiSaathi: 0, clubs: 0, shaktiClubs: 0,
    forms: 0, shaktiForms: 0, videos: 0, shaktiVideos: 0, acVideos: 0,
    nukkadAc: 0, nukkadSlp: 0, chaupals: 0, shaktiBaithaks: 0,
    centralWaGroups: 0, assemblyWaGroups: 0, shaktiAssemblyWaGroups: 0,
  };
  return zero;
}
