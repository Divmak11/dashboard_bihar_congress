// app/utils/fetchHierarchicalData.ts
// Duplicate & extend existing fetchFirebaseData functions for the hierarchical dashboard.
// NOTE: This is a scaffolding file. Metric-specific logic will be filled in during Phase 2.

import {
  getWtmSlpSummary,
} from './fetchFirebaseData';


import { CumulativeMetrics } from '../../models/hierarchicalTypes';
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, documentId, doc, getDoc, QueryDocumentSnapshot, or } from 'firebase/firestore';
import { createAppError, logError, getFirebaseErrorCode, validateDateRange, validateAssemblyData, ERROR_CODES } from './errorUtils';
import { AdminUser } from '../../models/types';

/**
 * Fetches cumulative metric data for the given scope (zone / assembly / AC / SLP).
 * Currently returns zeroes; will be implemented in Phase 2.
 */
export interface FetchMetricsOptions {
  assemblies?: string[];
  dateRange?: { startDate: string; endDate: string };
  handler_id?: string;
  level: 'zone' | 'assembly' | 'ac' | 'slp' | 'vertical';
  slp?: { uid: string; handler_id?: string; isShaktiSLP?: boolean; shaktiId?: string };
  adminUser?: AdminUser | null;
  isLastDayFilter?: boolean;
  vertical?: 'wtm' | 'shakti-abhiyaan';
}

/**
 * Fetch Nukkad Meetings (AC) from wtm-slp collection.
 * Rules:
 * - form_type == 'nukkad_meeting'
 * - When vertical === 'shakti-abhiyaan' include only parentVertical === 'shakti-abhiyaan'
 * - When vertical !== 'shakti-abhiyaan' exclude parentVertical === 'shakti-abhiyaan' (client-side)
 * - Date filter on createdAt (epoch ms) with created_at (epoch ms) fallback
 * - Assembly chunking and optional handler_id filter
 */
const getHierarchicalNukkadAc = async (
  assemblies?: string[],
  dateRange?: { startDate: string; endDate: string },
  handler_id?: string,
  vertical?: 'wtm' | 'shakti-abhiyaan'
): Promise<any[]> => {
  try {
    const col = collection(db, 'wtm-slp');
    // Base query without date/assembly constraints
    let base = query(col, where('form_type', '==', 'nukkad_meeting'));
    if (handler_id) {
      base = query(base, where('handler_id', '==', handler_id));
    }
    if (vertical === 'shakti-abhiyaan') {
      // Index-friendly include for Shakti
      base = query(base, where('parentVertical', '==', 'shakti-abhiyaan'));
    }

    // Date boundaries
    let baseCreatedAt = base;
    let baseCreated_at = base;
    if (dateRange) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      const startMs = start.getTime();
      const endMs = end.getTime();
      baseCreatedAt = query(baseCreatedAt, where('createdAt', '>=', startMs), where('createdAt', '<=', endMs));
      baseCreated_at = query(baseCreated_at, where('created_at', '>=', startMs), where('created_at', '<=', endMs));
    }

    // Execute queries with assembly chunking
    const execWithAssemblies = async (qBase: any) => {
      if (assemblies && assemblies.length > 0) {
        const uniqueAssemblies = [...new Set(assemblies)];
        if (uniqueAssemblies.length <= 10) {
          const q = query(qBase, where('assembly', 'in', uniqueAssemblies));
          const s = await getDocs(q);
          return [s];
        } else {
          const chunks: string[][] = [];
          for (let i = 0; i < uniqueAssemblies.length; i += 10) {
            chunks.push(uniqueAssemblies.slice(i, i + 10));
          }
          const promises = chunks.map(chunk => getDocs(query(qBase, where('assembly', 'in', chunk))));
          return await Promise.all(promises);
        }
      } else {
        const s = await getDocs(qBase);
        return [s];
      }
    };

    const [snapsCA, snapsCA2] = await Promise.all([
      execWithAssemblies(baseCreatedAt),
      execWithAssemblies(baseCreated_at)
    ]);

    const map = new Map<string, any>();
    const addSnaps = (arr: any[]) => {
      arr.forEach((snap) => {
        snap.forEach((d: any) => {
          if (!map.has(d.id)) {
            map.set(d.id, { ...d.data(), id: d.id });
          }
        });
      });
    };
    addSnaps(snapsCA);
    addSnaps(snapsCA2);

    let result = Array.from(map.values());
    if (vertical !== 'shakti-abhiyaan') {
      result = result.filter((doc: any) => doc?.parentVertical !== 'shakti-abhiyaan');
    }
    return result;
  } catch (error) {
    console.error('[getHierarchicalNukkadAc] Error:', error);
    return [];
  }
};

/**
 * Fetch Nukkad Meetings (SLP) from slp-activity collection for WTM only.
 * - form_type == 'nukkad_meeting'
 * - Exclude parentVertical === 'shakti-abhiyaan'
 * - Date filter on createdAt (epoch ms) with created_at (epoch ms) fallback
 */
const getHierarchicalNukkadSlp = async (
  assemblies?: string[],
  dateRange?: { startDate: string; endDate: string },
  handler_id?: string,
): Promise<any[]> => {
  try {
    const col = collection(db, 'slp-activity');
    let base = query(col, where('form_type', '==', 'nukkad_meeting'));
    if (handler_id) {
      base = query(base, where('handler_id', '==', handler_id));
    }

    let baseCreatedAt = base;
    let baseCreated_at = base;
    if (dateRange) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      const startMs = start.getTime();
      const endMs = end.getTime();
      baseCreatedAt = query(baseCreatedAt, where('createdAt', '>=', startMs), where('createdAt', '<=', endMs));
      baseCreated_at = query(baseCreated_at, where('created_at', '>=', startMs), where('created_at', '<=', endMs));
    }

    const execWithAssemblies = async (qBase: any) => {
      if (assemblies && assemblies.length > 0) {
        const uniqueAssemblies = [...new Set(assemblies)];
        if (uniqueAssemblies.length <= 10) {
          const q = query(qBase, where('assembly', 'in', uniqueAssemblies));
          const s = await getDocs(q);
          return [s];
        } else {
          const chunks: string[][] = [];
          for (let i = 0; i < uniqueAssemblies.length; i += 10) {
            chunks.push(uniqueAssemblies.slice(i, i + 10));
          }
          const promises = chunks.map(chunk => getDocs(query(qBase, where('assembly', 'in', chunk))));
          return await Promise.all(promises);
        }
      } else {
        const s = await getDocs(qBase);
        return [s];
      }
    };

    const [snapsCA, snapsCA2] = await Promise.all([
      execWithAssemblies(baseCreatedAt),
      execWithAssemblies(baseCreated_at)
    ]);

    const map = new Map<string, any>();
    const addSnaps = (arr: any[]) => {
      arr.forEach((snap) => {
        snap.forEach((d: any) => {
          if (!map.has(d.id)) {
            map.set(d.id, { ...d.data(), id: d.id });
          }
        });
      });
    };
    addSnaps(snapsCA);
    addSnaps(snapsCA2);

    const result = Array.from(map.values());
    const filtered = result.filter((doc: any) => doc?.parentVertical !== 'shakti-abhiyaan');
    return filtered;
  } catch (error) {
    console.error('[getHierarchicalNukkadSlp] Error:', error);
    return [];
  }
};

// Detailed fetchers
export const fetchDetailedNukkadAc = async (options: FetchMetricsOptions): Promise<any[]> => {
  const list = await getHierarchicalNukkadAc(options.assemblies, options.dateRange, options.handler_id, options.vertical);
  // Enrich coordinatorName from appropriate collection(s)
  const ids = [...new Set(list.map((r: any) => r.handler_id).filter(Boolean))];

  let names: Map<string, string>;
  if (options.vertical === 'shakti-abhiyaan') {
    // For Shakti, query both shakti-users and users collections
    // shakti-users takes precedence, users as fallback
    const [shaktiNames, userNames] = await Promise.all([
      resolveShaktiUserNamesByIds(ids),
      resolveUserNamesByIds(ids)
    ]);

    // Merge with shakti-users taking precedence
    names = new Map([...userNames, ...shaktiNames]);

    console.log(`[fetchDetailedNukkadAc] Shakti vertical: Resolved ${shaktiNames.size} from shakti-users, ${userNames.size} from users`);
  } else {
    // For WTM, use users collection only
    names = await resolveUserNamesByIds(ids);
  }
  const mapped = list.map((doc: any) => {
    const ms = typeof doc.createdAt === 'number' ? doc.createdAt : (typeof doc.created_at === 'number' ? doc.created_at : undefined);
    const dateStr = ms ? new Date(ms).toISOString().slice(0, 10) : (doc.meetingDate || doc.dateOfVisit || '');
    const totalMembers = Array.isArray(doc.members) ? doc.members.length : (doc.totalMembers || doc.membersCount || 0);
    // Normalize images/photos into a single array for UI consumption
    const rawImages = doc?.image_links ?? doc?.imageLinks ?? doc?.photoUrls ?? doc?.photo_urls ?? doc?.photos ?? doc?.images;
    const image_links = Array.isArray(rawImages)
      ? rawImages.filter((u: any) => typeof u === 'string' && u.trim())
      : (typeof rawImages === 'string' && rawImages.trim() ? [rawImages] : []);
    return {
      ...doc,
      dateOfVisit: dateStr,
      coordinatorName: names.get(doc.handler_id) || doc.handler_id || 'Unknown',
      totalMembers,
      image_links
    };
  });
  return mapped;
};

export const fetchDetailedNukkadSlp = async (options: FetchMetricsOptions): Promise<any[]> => {
  const list = await getHierarchicalNukkadSlp(options.assemblies, options.dateRange, options.handler_id);
  const ids = [...new Set(list.map((r: any) => r.handler_id).filter(Boolean))];

  console.log('[fetchDetailedNukkadSlp] Fetching names for SLP IDs:', ids);

  // Resolve SLP names from wtm-slp using document IDs only (as per requirement)
  const names = await resolveSlpNamesFromWtmByIds(ids);
  const mapped = list.map((doc: any) => {
    const ms = typeof doc.createdAt === 'number' ? doc.createdAt : (typeof doc.created_at === 'number' ? doc.created_at : undefined);
    const dateStr = ms ? new Date(ms).toISOString().slice(0, 10) : (doc.meetingDate || doc.dateOfVisit || '');
    const totalMembers = Array.isArray(doc.members) ? doc.members.length : (doc.totalMembers || doc.membersCount || 0);
    // Normalize images/photos into a single array for UI consumption
    const rawImages = doc?.image_links ?? doc?.imageLinks ?? doc?.photoUrls ?? doc?.photo_urls ?? doc?.photos ?? doc?.images;
    const image_links = Array.isArray(rawImages)
      ? rawImages.filter((u: any) => typeof u === 'string' && u.trim())
      : (typeof rawImages === 'string' && rawImages.trim() ? [rawImages] : []);
    return {
      ...doc,
      dateOfVisit: dateStr,
      coordinatorName: names.get(doc.handler_id) || doc.handler_id || 'Unknown',
      totalMembers,
      image_links
    };
  });
  return mapped;
};


/**
 * Helper function to adjust date range for admin users.
 * For admins selecting "Last Day" filter, extends the end time by 8 hours into the current day.
 * This accommodates late data entry for report generation.
 * 
 * @param dateRange - Original date range from user selection
 * @param adminUser - Admin user object to check role
 * @param isLastDayFilter - Boolean indicating if "Last Day" filter is selected
 * @returns Adjusted date range (modified for admins on "Last Day", unchanged otherwise)
 */
export const getAdjustedDateRange = (
  dateRange: { startDate: string; endDate: string } | undefined,
  adminUser: AdminUser | null,
  isLastDayFilter: boolean = false
): { startDate: string; endDate: string } | undefined => {
  // If no date range provided, return undefined
  if (!dateRange) {
    return undefined;
  }

  // If not admin or not "Last Day" filter, return original date range
  if (!adminUser || adminUser.role !== 'admin' || !isLastDayFilter) {
    return dateRange;
  }

  // For admin with "Last Day" filter, extend end date by 8 hours
  const adjustedDateRange = { ...dateRange };

  // Parse the end date and add 8 hours
  const endDate = new Date(adjustedDateRange.endDate);
  endDate.setHours(endDate.getHours() + 8);

  // Format back to YYYY-MM-DD format
  const year = endDate.getFullYear();
  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const day = String(endDate.getDate()).padStart(2, '0');
  adjustedDateRange.endDate = `${year}-${month}-${day}`;

  console.log('[getAdjustedDateRange] Admin "Last Day" filter adjusted:', {
    original: dateRange,
    adjusted: adjustedDateRange,
    adminRole: adminUser.role
  });

  return adjustedDateRange;
};

// Helper function to check if AC is from Shakti Abhiyaan
const isShaktiAC = async (acId: string): Promise<boolean> => {
  try {
    const shaktiCollection = collection(db, 'shakti-abhiyaan');
    const q = query(shaktiCollection, where('form_type', '==', 'add-data'));
    const snap = await getDocs(q);

    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const coordinators = data.coveredAssemblyCoordinators || [];
      if (coordinators.some((coord: any) => coord.id === acId)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[isShaktiAC] Error:', error);
    return false;
  }
};

// Helper: Resolve AC/user names from 'users' collection by handler_id (batched 'in' queries)
const resolveUserNamesByIds = async (handlerIds: string[]): Promise<Map<string, string>> => {
  const nameMap = new Map<string, string>();
  const uniqueIds = [...new Set((handlerIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return nameMap;

  const usersCol = collection(db, 'users');
  const chunkSize = 10;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const batch = uniqueIds.slice(i, i + chunkSize);
    try {
      const qUsers = query(usersCol, where(documentId(), 'in', batch));
      const snap = await getDocs(qUsers);
      snap.forEach((d) => {
        const data = d.data() as any;
        const id = d.id;
        // Only use 'name' property, never displayName or fallback to ID
        const name = data?.name || 'Unknown';
        nameMap.set(id, name);
      });
    } catch (err) {
      console.error('[resolveUserNamesByIds] Error resolving batch:', err);
    }
  }
  return nameMap;
};

// Helper: Resolve AC/user names from 'shakti-users' collection by handler_id (batched 'in' queries)
const resolveShaktiUserNamesByIds = async (handlerIds: string[]): Promise<Map<string, string>> => {
  const nameMap = new Map<string, string>();
  const uniqueIds = [...new Set((handlerIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return nameMap;

  const shaktiUsersCol = collection(db, 'shakti-users');
  const chunkSize = 10;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const batch = uniqueIds.slice(i, i + chunkSize);
    try {
      const qShaktiUsers = query(shaktiUsersCol, where(documentId(), 'in', batch));
      const snap = await getDocs(qShaktiUsers);
      snap.forEach((d) => {
        const data = d.data() as any;
        const id = d.id;
        // Only use 'name' property, never displayName or fallback to ID
        const name = data?.name || 'Unknown';
        nameMap.set(id, name);
      });
    } catch (err) {
      console.error('[resolveShaktiUserNamesByIds] Error resolving batch:', err);
    }
  }
  return nameMap;
};

// Helper: Resolve SLP names from 'wtm-slp' collection using document IDs only
const resolveSlpNamesFromWtmByIds = async (slpIds: string[]): Promise<Map<string, string>> => {
  const nameMap = new Map<string, string>();
  const uniqueIds = [...new Set((slpIds || []).filter(Boolean))];

  console.log('[resolveSlpNamesFromWtmByIds] Requesting IDs:', uniqueIds);

  if (uniqueIds.length === 0) return nameMap;

  const wtmCol = collection(db, 'wtm-slp');
  const chunkSize = 10;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const batch = uniqueIds.slice(i, i + chunkSize);
    try {
      console.log(`[resolveSlpNamesFromWtmByIds] Querying batch ${i / chunkSize + 1}:`, batch);
      const qWtm = query(wtmCol, where(documentId(), 'in', batch));
      const snap = await getDocs(qWtm);
      console.log(`[resolveSlpNamesFromWtmByIds] Batch ${i / chunkSize + 1} found ${snap.size} docs`);

      snap.forEach((d) => {
        const data = d.data() as any;
        // Use 'name' primarily; older docs might have 'recommendedPersonName'
        const name = (data?.name || data?.recommendedPersonName || '').toString();

        console.log(`[resolveSlpNamesFromWtmByIds] Doc ${d.id}: name="${data?.name}", recommended="${data?.recommendedPersonName}", resolved="${name}"`);

        if (name) {
          nameMap.set(d.id, name);
        }
      });
    } catch (err) {
      console.error('[resolveSlpNamesFromWtmByIds] Error resolving batch:', err);
    }
  }

  console.log('[resolveSlpNamesFromWtmByIds] Final map size:', nameMap.size);
  return nameMap;
};

// Duplicated and modified SLP activity functions for hierarchical aggregation

/**
 * Fetch member activities (Saathi) for hierarchical levels
 * No assembly filter = get all documents regardless of assembly
 */
const getHierarchicalMemberActivity = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    console.log('[getHierarchicalMemberActivity] Assemblies:', assemblies);
    console.log('[getHierarchicalMemberActivity] Handler ID:', handler_id);
    console.log('[getHierarchicalMemberActivity] Date Range:', dateRange);
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'members'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'members'));

    // Add handler_id filter if provided (for AC/SLP level)
    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    // Add date filter if provided
    if (dateRange) {
      // Convert date range to epoch milliseconds for created_at field
      const startDateObj = new Date(`${dateRange.startDate}T00:00:00.000Z`);
      const endDateObj = new Date(`${dateRange.endDate}T23:59:59.999Z`);
      const startEpochMs = startDateObj.getTime();
      const endEpochMs = endDateObj.getTime();

      console.log('[getHierarchicalMemberActivity] Filtering by createdAt:', startEpochMs, 'to', endEpochMs);

      baseQuery1 = query(baseQuery1, where('createdAt', '>=', startEpochMs), where('createdAt', '<=', endEpochMs));
      baseQuery2 = query(baseQuery2, where('createdAt', '>=', startEpochMs), where('createdAt', '<=', endEpochMs));
    }

    // Execute queries with assembly chunking to handle >10 assembly limit
    let snap1Results = [];
    let snap2Results = [];

    if (assemblies && assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(assemblies)];

      if (uniqueAssemblies.length <= 10) {
        // Single query for <=10 assemblies
        const query1WithAssemblies = query(baseQuery1, where('assembly', 'in', uniqueAssemblies));
        const query2WithAssemblies = query(baseQuery2, where('assembly', 'in', uniqueAssemblies));
        const [snap1, snap2] = await Promise.all([getDocs(query1WithAssemblies), getDocs(query2WithAssemblies)]);
        snap1Results = [snap1];
        snap2Results = [snap2];
      } else {
        // Chunk into groups of 10 and run parallel queries
        const chunks = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }

        console.log(`[getHierarchicalMemberActivity] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);

        const query1Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery1, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const query2Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery2, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const [query1Results, query2Results] = await Promise.all([
          Promise.all(query1Promises),
          Promise.all(query2Promises)
        ]);

        snap1Results = query1Results;
        snap2Results = query2Results;
      }
    } else {
      // No assembly filter
      const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
      snap1Results = [snap1];
      snap2Results = [snap2];
    }

    const activitiesMap = new Map();

    // Process all snap1 results
    snap1Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!activitiesMap.has(doc.id)) {
          activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    // Process all snap2 results
    snap2Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!activitiesMap.has(doc.id)) {
          activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    const result = Array.from(activitiesMap.values());
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');
    console.log(`[getHierarchicalMemberActivity] Final result count: ${filteredResult.length}`);
    return filteredResult;
  } catch (error) {
    console.error('[getHierarchicalMemberActivity] Error:', error);
    return [];
  }
};

/**
 * Fetch panchayat WA activities (Clubs) for hierarchical levels
 */
const getHierarchicalPanchayatWaActivity = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'panchayat-wa'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'panchayat-wa'));

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Convert coordinator date range (YYYY-MM-DD) to ISO strings for createdAt field (stored as string)
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;

      console.log('[getHierarchicalPanchayatWaActivity] Filtering by createdAt (string):', startDateISO, 'to', endDateISO);

      baseQuery1 = query(baseQuery1, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
      baseQuery2 = query(baseQuery2, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(activitiesMap.values());
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');
    return filteredResult;
  } catch (error) {
    console.error('[getHierarchicalPanchayatWaActivity] Error:', error);
    return [];
  }
};

/**
 * Fetch Mai-Bahin-Yojna activities (Forms) for hierarchical levels
 */
const getHierarchicalMaiBahinYojnaActivity = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'mai-bahin-yojna'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'mai-bahin-yojna'));

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Use string comparison for 'date' field (format: "2025-07-17")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[getHierarchicalMaiBahinYojnaActivity] Filtering by date:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(activitiesMap.values());
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');
    return filteredResult;
  } catch (error) {
    console.error('[getHierarchicalMaiBahinYojnaActivity] Error:', error);
    return [];
  }
};

/**
 * Fetch local issue video activities (Videos) for hierarchical levels
 */
const getHierarchicalLocalIssueVideoActivity = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'local-issue-video'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'local-issue-video'));

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Use string comparison for date_submitted field (format: "2025-07-13")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[getHierarchicalLocalIssueVideoActivity] Filtering by date_submitted:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(activitiesMap.values());
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');
    console.log(`[getHierarchicalLocalIssueVideoActivity] Final result count: ${filteredResult.length}`);
    return filteredResult;
  } catch (error) {
    console.error('[getHierarchicalLocalIssueVideoActivity] Error:', error);
    return [];
  }
};

/**
 * Fetch AC Videos from wtm-slp collection for hierarchical levels
 * Similar to Local Issue Videos but fetches from wtm-slp collection
 */
const getHierarchicalAcVideos = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    console.log('[getHierarchicalAcVideos] Fetching AC videos from wtm-slp collection');
    console.log('[getHierarchicalAcVideos] Assemblies:', assemblies);
    console.log('[getHierarchicalAcVideos] Handler ID:', handler_id);

    const wtmSlpCollection = collection(db, 'wtm-slp');
    let baseQuery1 = query(wtmSlpCollection, where('form_type', '==', 'local-issue-video'));
    let baseQuery2 = query(wtmSlpCollection, where('type', '==', 'local-issue-video'));

    // Add assembly filter if provided
    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    // Add handler_id filter if provided (for AC level)
    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    // Add date filter if provided
    if (dateRange) {
      // Use string comparison for date_submitted field (format: "2025-07-13")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[getHierarchicalAcVideos] Filtering by date_submitted:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const videosMap = new Map();

    snap1.forEach((doc) => {
      if (!videosMap.has(doc.id)) {
        videosMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!videosMap.has(doc.id)) {
        videosMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(videosMap.values());
    console.log(`[getHierarchicalAcVideos] Found ${result.length} AC videos`);
    return result;
  } catch (error) {
    console.error('[getHierarchicalAcVideos] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Leaders for hierarchical levels
 * NOTE: This fetches SLPs from shakti-abhiyaan collection, not activities
 * FIXED: Now properly handles zone-level filtering using coveredAssemblies array
 */
const getHierarchicalShaktiLeaders = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    console.log('[getHierarchicalShaktiLeaders] Fetching Shakti SLPs from shakti-abhiyaan collection');
    console.log('[getHierarchicalShaktiLeaders] Zone Assemblies:', assemblies);
    console.log('[getHierarchicalShaktiLeaders] AC Handler ID:', handler_id);

    const shaktiCollection = collection(db, 'shakti-abhiyaan');
    const q = query(shaktiCollection, where('form_type', '==', 'add-data'));
    const snap = await getDocs(q);

    const slpsList: any[] = [];

    snap.forEach((doc) => {
      const data = doc.data() as any;
      const coveredAssemblies = data.coveredAssemblies || [];
      const coordinators = data.coveredAssemblyCoordinators || [];
      const documentCreatedAt = data.createdAt; // Get createdAt from document root

      // Zone Level: Check if any zone assemblies intersect with document's coveredAssemblies
      if (assemblies && assemblies.length > 0) {
        const hasIntersection = assemblies.some(assembly => coveredAssemblies.includes(assembly));
        if (!hasIntersection) {
          console.log(`[getHierarchicalShaktiLeaders] Document ${doc.id} doesn't cover zone assemblies, skipping`);
          return; // Skip this document entirely
        }
        console.log(`[getHierarchicalShaktiLeaders] Document ${doc.id} covers zone assemblies:`, coveredAssemblies);
      }

      coordinators.forEach((coord: any) => {
        // AC Level: Filter by specific AC handler_id if provided
        if (handler_id && coord.id !== handler_id) {
          return;
        }

        // Zone Level: Only include ACs whose assembly is in the zone's assemblies
        if (assemblies && assemblies.length > 0 && !assemblies.includes(coord.assembly)) {
          return;
        }

        // Add all SLPs under this coordinator
        if (coord.slps && Array.isArray(coord.slps)) {
          coord.slps.forEach((slp: any) => {
            slpsList.push({
              ...slp,
              coordinatorId: coord.id,
              coordinatorName: coord.name,
              assembly: coord.assembly,
              documentId: doc.id, // Track which document this came from
              coveredAssemblies: coveredAssemblies, // Store for reference
              createdAt: documentCreatedAt // Add document's createdAt to each SLP
            });
          });
        }
      });
    });

    // Apply local date filtering if dateRange is provided
    let filteredSlpsList = slpsList;
    if (dateRange) {
      // Convert date range strings to milliseconds for comparison
      const startDateMs = new Date(dateRange.startDate).getTime();
      const endDateMs = new Date(dateRange.endDate).setHours(23, 59, 59, 999); // End of day

      console.log(`[getHierarchicalShaktiLeaders] Date range: ${dateRange.startDate} to ${dateRange.endDate}`);
      console.log(`[getHierarchicalShaktiLeaders] Filtering by createdAt (milliseconds): ${startDateMs} to ${endDateMs}`);

      // Debug: Log first few SLPs to check createdAt values
      console.log(`[getHierarchicalShaktiLeaders] Sample SLP createdAt values:`,
        slpsList.slice(0, 3).map(slp => ({
          name: slp.name,
          createdAt: slp.createdAt,
          type: typeof slp.createdAt,
          date: slp.createdAt ? new Date(slp.createdAt).toISOString() : 'N/A'
        }))
      );

      filteredSlpsList = slpsList.filter((slp: any) => {
        if (!slp.createdAt) {
          console.log(`[getHierarchicalShaktiLeaders] SLP ${slp.name} has no createdAt`);
          return false;
        }

        if (typeof slp.createdAt !== 'number') {
          console.log(`[getHierarchicalShaktiLeaders] SLP ${slp.name} createdAt is not number:`, typeof slp.createdAt, slp.createdAt);
          return false;
        }

        const isInRange = slp.createdAt >= startDateMs && slp.createdAt <= endDateMs;
        if (!isInRange) {
          console.log(`[getHierarchicalShaktiLeaders] SLP ${slp.name} outside range: ${slp.createdAt} (${new Date(slp.createdAt).toISOString()})`);
        }

        return isInRange;
      });

      console.log(`[getHierarchicalShaktiLeaders] Filtered from ${slpsList.length} to ${filteredSlpsList.length} Shakti SLPs`);
    }

    console.log(`[getHierarchicalShaktiLeaders] Found ${filteredSlpsList.length} Shakti SLPs`);
    return filteredSlpsList;
  } catch (error) {
    console.error('[getHierarchicalShaktiLeaders] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Saathi for hierarchical levels
 */
const getHierarchicalShaktiSaathi = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(
      slpActivityCollection,
      where('form_type', '==', 'members'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );
    let baseQuery2 = query(
      slpActivityCollection,
      where('type', '==', 'members'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Convert date range to epoch milliseconds for created_at field
      const startDateObj = new Date(`${dateRange.startDate}T00:00:00.000Z`);
      const endDateObj = new Date(`${dateRange.endDate}T23:59:59.999Z`);
      const startEpochMs = startDateObj.getTime();
      const endEpochMs = endDateObj.getTime();

      console.log('[getHierarchicalShaktiSaathi] Filtering by createdAt:', startEpochMs, 'to', endEpochMs);

      baseQuery1 = query(baseQuery1, where('createdAt', '>=', startEpochMs), where('createdAt', '<=', endEpochMs));
      baseQuery2 = query(baseQuery2, where('createdAt', '>=', startEpochMs), where('createdAt', '<=', endEpochMs));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(activitiesMap.values());

    // Enrich with coordinator names using parentDocId for efficient lookup
    const coordinatorNamesMap = new Map<string, string>();

    // Get unique parentDocIds from activities
    const uniqueParentDocIds = [...new Set(result.map((activity: any) => activity.parentDocId).filter(Boolean))];

    if (uniqueParentDocIds.length > 0) {
      // Fetch specific shakti-abhiyaan documents using parentDocId
      const shaktiCollection = collection(db, 'shakti-abhiyaan');
      const parentDocPromises = uniqueParentDocIds.map(docId => getDoc(doc(shaktiCollection, docId)));
      const parentDocs = await Promise.all(parentDocPromises);

      // Create a map of parentDocId to its SLP data for quick lookup
      const parentDocSLPMap = new Map<string, any[]>();

      parentDocs.forEach((parentDoc, index) => {
        if (parentDoc.exists()) {
          const data = parentDoc.data();
          const parentDocId = uniqueParentDocIds[index];
          const allSLPs: any[] = [];

          // Collect all SLPs from coveredAssemblyCoordinators array
          if (data.coveredAssemblyCoordinators && Array.isArray(data.coveredAssemblyCoordinators)) {
            data.coveredAssemblyCoordinators.forEach((coord: any) => {
              if (coord.slps && Array.isArray(coord.slps)) {
                allSLPs.push(...coord.slps);
              }
            });
          }

          parentDocSLPMap.set(parentDocId, allSLPs);
        }
      });

      // Now map handler_ids to names using the parentDocId from each activity
      result.forEach((activity: any) => {
        if (activity.parentDocId && activity.handler_id) {
          const slpsInParentDoc = parentDocSLPMap.get(activity.parentDocId);
          if (slpsInParentDoc) {
            const matchingSLP = slpsInParentDoc.find((slp: any) =>
              slp.id === activity.handler_id || slp.uid === activity.handler_id
            );
            if (matchingSLP) {
              coordinatorNamesMap.set(activity.handler_id, matchingSLP.name || activity.handler_id);
            }
          }
        }
      });
    }

    // Add coordinator names to activity records
    const enrichedResult = result.map((activity: any) => ({
      ...activity,
      coordinatorName: coordinatorNamesMap.get(activity.handler_id) || activity.handler_id || 'Unknown'
    }));

    return enrichedResult;
  } catch (error) {
    console.error('[getHierarchicalShaktiSaathi] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Clubs for hierarchical levels
 */
const getHierarchicalShaktiClubs = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(
      slpActivityCollection,
      where('form_type', '==', 'panchayat-wa'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );
    let baseQuery2 = query(
      slpActivityCollection,
      where('type', '==', 'panchayat-wa'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Convert coordinator date range (YYYY-MM-DD) to ISO strings for createdAt field (stored as string)
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;

      console.log('[getHierarchicalShaktiClubs] Filtering by createdAt (string):', startDateISO, 'to', endDateISO);

      baseQuery1 = query(baseQuery1, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
      baseQuery2 = query(baseQuery2, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    return Array.from(activitiesMap.values());
  } catch (error) {
    console.error('[getHierarchicalShaktiClubs] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Mai-Bahin-Yojna Forms for hierarchical levels
 */
const getHierarchicalShaktiForms = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(
      slpActivityCollection,
      where('form_type', '==', 'mai-bahin-yojna'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );
    let baseQuery2 = query(
      slpActivityCollection,
      where('type', '==', 'mai-bahin-yojna'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Use string comparison for 'date' field (format: "2025-07-17")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[getHierarchicalShaktiForms] Filtering by date:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    return Array.from(activitiesMap.values());
  } catch (error) {
    console.error('[getHierarchicalShaktiForms] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Baithaks (weekly meetings under Shakti Abhiyaan) for hierarchical levels
 */
const getHierarchicalShaktiBaithaks = async (
  assemblies?: string[],
  dateRange?: { startDate: string; endDate: string },
  handler_id?: string
): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');

    // Two query variants to account for both historical and new documents
    let baseQuery1 = query(
      slpActivityCollection,
      where('form_type', '==', 'weekly_meeting'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );
    let baseQuery2 = query(
      slpActivityCollection,
      where('type', '==', 'weekly_meeting'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Use string comparison for dateFormatted field (format: "2025-07-06")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[getHierarchicalShaktiBaithaks] Filtering by dateFormatted:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('dateFormatted', '>=', startDateStr), where('dateFormatted', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('dateFormatted', '>=', startDateStr), where('dateFormatted', '<=', endDateStr));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(activitiesMap.values());
    return result;
  } catch (error) {
    console.error('[getHierarchicalShaktiBaithaks] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Local Issue Videos for hierarchical levels
 */
const getHierarchicalShaktiLocalIssueVideoActivity = async (
  assemblies?: string[],
  dateRange?: { startDate: string; endDate: string },
  handler_id?: string,
): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(
      slpActivityCollection,
      where('form_type', '==', 'local-issue-video'),
      where('parentVertical', '==', 'shakti-abhiyaan'),
    );
    let baseQuery2 = query(
      slpActivityCollection,
      where('type', '==', 'local-issue-video'),
      where('parentVertical', '==', 'shakti-abhiyaan'),
    );

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      const startDateStr = dateRange.startDate;
      const endDateStr = dateRange.endDate;

      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr));
    }

    // Execute queries with assembly chunking to handle >10 assembly limit
    let snap1Results = [];
    let snap2Results = [];

    if (assemblies && assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(assemblies)];

      if (uniqueAssemblies.length <= 10) {
        const query1WithAssemblies = query(baseQuery1, where('assembly', 'in', uniqueAssemblies));
        const query2WithAssemblies = query(baseQuery2, where('assembly', 'in', uniqueAssemblies));
        const [snap1, snap2] = await Promise.all([getDocs(query1WithAssemblies), getDocs(query2WithAssemblies)]);
        snap1Results = [snap1];
        snap2Results = [snap2];
      } else {
        const chunks = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }

        console.log(`[getHierarchicalShaktiLocalIssueVideoActivity] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);

        const query1Promises = chunks.map(chunk => getDocs(query(baseQuery1, where('assembly', 'in', chunk))));
        const query2Promises = chunks.map(chunk => getDocs(query(baseQuery2, where('assembly', 'in', chunk))));

        const [query1Results, query2Results] = await Promise.all([
          Promise.all(query1Promises),
          Promise.all(query2Promises)
        ]);

        snap1Results = query1Results;
        snap2Results = query2Results;
      }
    } else {
      const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
      snap1Results = [snap1];
      snap2Results = [snap2];
    }

    const activitiesMap = new Map();

    // Process all snap1 results
    snap1Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!activitiesMap.has(doc.id)) {
          activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    // Process all snap2 results
    snap2Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!activitiesMap.has(doc.id)) {
          activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    return Array.from(activitiesMap.values());
  } catch (error) {
    console.error('[getHierarchicalShaktiLocalIssueVideoActivity] Error:', error);
    return [];
  }
};

/**
 * Fetch Samvidhan Chaupals for hierarchical levels
 */
const getHierarchicalChaupals = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'weekly_meeting'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'weekly_meeting'));

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Use string comparison for dateFormatted field (format: "2025-07-06")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[getHierarchicalChaupals] Filtering by dateFormatted:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('dateFormatted', '>=', startDateStr), where('dateFormatted', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('dateFormatted', '>=', startDateStr), where('dateFormatted', '<=', endDateStr));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(activitiesMap.values());
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');

    // Map dateFormatted to dateOfVisit for compatibility with ActivitiesList component
    // Note: Chaupals are SLP activities, not AC activities, so no coordinatorName should be added
    const mappedResult = filteredResult.map((doc: any) => ({
      ...doc,
      dateOfVisit: doc.dateFormatted || doc.dateOfVisit // Use dateFormatted as dateOfVisit
      // Removed coordinatorName - Chaupals are SLP-created, not AC activities
    }));

    return mappedResult;
  } catch (error) {
    console.error('[getHierarchicalChaupals] Error:', error);
    return [];
  }
};

/**
 * Fetch Central WA Groups for hierarchical levels
 */
const getHierarchicalCentralWaGroups = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const callCenterCollection = collection(db, 'call-center');
    let centralQuery = query(callCenterCollection, where('form_type', '==', 'central-wa'));

    if (assemblies && assemblies.length > 0) {
      centralQuery = query(centralQuery, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      centralQuery = query(centralQuery, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Convert coordinator date range (YYYY-MM-DD) to ISO strings for createdAt field (stored as string)
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;

      console.log('[getHierarchicalCentralWaGroups] Filtering by createdAt (string):', startDateISO, 'to', endDateISO);

      centralQuery = query(centralQuery, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
    }

    const centralSnap = await getDocs(centralQuery);
    const results: any[] = [];

    centralSnap.forEach((doc) => {
      results.push({ ...doc.data(), id: doc.id, source: 'central' });
    });

    return results;
  } catch (error) {
    console.error('[getHierarchicalCentralWaGroups] Error:', error);
    return [];
  }
};

/**
 * Fetch Assembly WA Groups for hierarchical levels (WTM only)
 * - Excludes Shakti docs (parentVertical === 'shakti-abhiyaan') and treats missing parentVertical as WTM
 * - Supports assembly chunking for >10 assemblies
 */
const getHierarchicalAssemblyWaGroups = async (
  assemblies?: string[],
  dateRange?: { startDate: string; endDate: string },
  handler_id?: string
): Promise<any[]> => {
  try {
    const wtmSlpCollection = collection(db, 'wtm-slp');
    let baseQuery = query(wtmSlpCollection, where('form_type', '==', 'assembly-wa'));

    if (handler_id) {
      baseQuery = query(baseQuery, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Convert coordinator date range (YYYY-MM-DD) to ISO strings for createdAt field (stored as string)
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;
      console.log('[getHierarchicalAssemblyWaGroups] Filtering by createdAt (string):', startDateISO, 'to', endDateISO);
      baseQuery = query(baseQuery, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
    }

    // Execute queries with assembly chunking to handle >10 assembly limit
    let snaps: any[] = [];
    if (assemblies && assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(assemblies)];
      if (uniqueAssemblies.length <= 10) {
        const q1 = query(baseQuery, where('assembly', 'in', uniqueAssemblies));
        const s1 = await getDocs(q1);
        snaps = [s1];
      } else {
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }
        console.log(`[getHierarchicalAssemblyWaGroups] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);
        const promises = chunks.map(chunk => getDocs(query(baseQuery, where('assembly', 'in', chunk))));
        snaps = await Promise.all(promises);
      }
    } else {
      const s = await getDocs(baseQuery);
      snaps = [s];
    }

    // Collect and filter results to only WTM (exclude Shakti)
    const results: any[] = [];
    snaps.forEach((snap) => {
      snap.forEach((d: any) => {
        const data = d.data();
        if (data?.parentVertical === 'shakti-abhiyaan') return; // exclude Shakti
        results.push({ ...data, id: d.id, source: 'assembly' });
      });
    });

    return results;
  } catch (error) {
    console.error('[getHierarchicalAssemblyWaGroups] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Assembly WA Groups for hierarchical levels
 * - Uses composite-index-friendly query with parentVertical === 'shakti-abhiyaan'
 * - Supports assembly chunking for >10 assemblies
 */
const getHierarchicalShaktiAssemblyWaGroups = async (
  assemblies?: string[],
  dateRange?: { startDate: string; endDate: string },
  handler_id?: string
): Promise<any[]> => {
  try {
    const wtmSlpCollection = collection(db, 'wtm-slp');
    // Composite-index-friendly query with explicit parentVertical filter
    let baseQuery = query(
      wtmSlpCollection,
      where('form_type', '==', 'assembly-wa'),
      where('parentVertical', '==', 'shakti-abhiyaan')
    );

    if (handler_id) {
      baseQuery = query(baseQuery, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;
      console.log('[getHierarchicalShaktiAssemblyWaGroups] Filtering by createdAt (string):', startDateISO, 'to', endDateISO);
      baseQuery = query(baseQuery, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
    }

    // Execute queries with assembly chunking to handle >10 assembly limit
    let snaps: any[] = [];
    if (assemblies && assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(assemblies)];
      if (uniqueAssemblies.length <= 10) {
        const q1 = query(baseQuery, where('assembly', 'in', uniqueAssemblies));
        const s1 = await getDocs(q1);
        snaps = [s1];
      } else {
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }
        console.log(`[getHierarchicalShaktiAssemblyWaGroups] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);
        const promises = chunks.map(chunk => getDocs(query(baseQuery, where('assembly', 'in', chunk))));
        snaps = await Promise.all(promises);
      }
    } else {
      const s = await getDocs(baseQuery);
      snaps = [s];
    }

    // Collect results (already filtered to Shakti by query)
    const results: any[] = [];
    snaps.forEach((snap) => {
      snap.forEach((d: any) => {
        const data = d.data();
        results.push({ ...data, id: d.id, source: 'assembly' });
      });
    });

    return results;
  } catch (error) {
    console.error('[getHierarchicalShaktiAssemblyWaGroups] Error:', error);
    return [];
  }
};

/**
 * Fetch training activities (Chaupals) for hierarchical levels
 */
const getHierarchicalTrainingActivity = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'training'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'training'));

    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Use string comparison for 'date' field (format: "2025-07-17")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[getHierarchicalTrainingActivity] Filtering by date:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const activitiesMap = new Map();

    snap1.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    snap2.forEach((doc) => {
      if (!activitiesMap.has(doc.id)) {
        activitiesMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(activitiesMap.values());
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');
    return filteredResult;
  } catch (error) {
    console.error('[getHierarchicalTrainingActivity] Error:', error);
    return [];
  }
};

export const fetchCumulativeMetrics = async (options: FetchMetricsOptions): Promise<CumulativeMetrics> => {
  try {
    console.log('[fetchCumulativeMetrics] Starting with options:', options);
    console.log('[fetchCumulativeMetrics] Assemblies:', options.assemblies);
    console.log('[fetchCumulativeMetrics] Handler ID:', options.handler_id);

    // Adjust date range for admin users if needed
    const adjustedDateRange = getAdjustedDateRange(
      options.dateRange,
      options.adminUser || null,
      options.isLastDayFilter || false
    );

    // Validate input parameters
    if (options.assemblies && options.assemblies.length > 0) {
      validateAssemblyData(options.assemblies);
    }

    if (adjustedDateRange) {
      validateDateRange(adjustedDateRange.startDate, adjustedDateRange.endDate);
    }

    // Fetch all metrics for any AC type - data will naturally be 0 if no activities exist

    // Fetch all metrics for all hierarchy levels
    const [
      wtmSummary,
      saathi,
      shaktiLeaders,
      shaktiSaathi,
      clubs,
      shaktiClubs,
      forms,
      shaktiForms,
      shaktiVideos,
      videos,
      acVideos,
      chaupals,
      shaktiBaithaks,
      centralWaGroups,
      assemblyWaGroups,
      shaktiAssemblyWaGroups,
      // Nukkad metrics
      nukkadAc,
      nukkadSlp
    ] = await Promise.allSettled([
      getWtmSlpSummary(adjustedDateRange?.startDate, adjustedDateRange?.endDate, options.assemblies, options.handler_id, options.slp),
      getHierarchicalMemberActivity(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalShaktiLeaders(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalShaktiSaathi(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalPanchayatWaActivity(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalShaktiClubs(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalMaiBahinYojnaActivity(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalShaktiForms(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalShaktiLocalIssueVideoActivity(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalLocalIssueVideoActivity(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalAcVideos(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalChaupals(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalShaktiBaithaks(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalCentralWaGroups(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalAssemblyWaGroups(options.assemblies, adjustedDateRange, options.handler_id),
      getHierarchicalShaktiAssemblyWaGroups(options.assemblies, adjustedDateRange, options.handler_id),
      // New Nukkad metrics
      getHierarchicalNukkadAc(options.assemblies, adjustedDateRange, options.handler_id, options.vertical),
      getHierarchicalNukkadSlp(options.assemblies, adjustedDateRange, options.handler_id),
    ]);

    const getResultValue = (result: PromiseSettledResult<any>) => {
      if (result.status === 'fulfilled') {
        return Array.isArray(result.value) ? result.value.length : result.value || 0;
      }
      console.error('Metric fetch failed:', result.reason);
      return 0;
    };

    const getSummaryValue = (result: PromiseSettledResult<any>, field: string) => {
      if (result.status === 'fulfilled' && result.value) {
        return result.value[field] || 0;
      }
      return 0;
    };

    // AC-level metrics must be 0 when SLP level is selected
    const isSlpLevel = options.level === 'slp';
    const assemblyWaGroupsCount = isSlpLevel ? 0 : getResultValue(assemblyWaGroups);
    const shaktiAssemblyWaGroupsCount = isSlpLevel ? 0 : getResultValue(shaktiAssemblyWaGroups);
    const nukkadAcCount = isSlpLevel ? 0 : getResultValue(nukkadAc);
    const nukkadSlpCount = getResultValue(nukkadSlp);

    return {
      meetings: getSummaryValue(wtmSummary, 'totalMeetings'),
      volunteers: getSummaryValue(wtmSummary, 'totalOnboarded'),
      slps: getSummaryValue(wtmSummary, 'totalSlps'),
      saathi: getResultValue(saathi),
      shaktiLeaders: getResultValue(shaktiLeaders),
      shaktiSaathi: getResultValue(shaktiSaathi),
      clubs: getResultValue(clubs),
      shaktiClubs: getResultValue(shaktiClubs),
      forms: getResultValue(forms),
      shaktiForms: getResultValue(shaktiForms),
      videos: getResultValue(videos),
      shaktiVideos: getResultValue(shaktiVideos),
      acVideos: getResultValue(acVideos),
      chaupals: getResultValue(chaupals),
      shaktiBaithaks: getResultValue(shaktiBaithaks),
      centralWaGroups: getResultValue(centralWaGroups),
      assemblyWaGroups: assemblyWaGroupsCount,
      shaktiAssemblyWaGroups: shaktiAssemblyWaGroupsCount,
      nukkadAc: nukkadAcCount,
      nukkadSlp: nukkadSlpCount,
    };
  } catch (error) {
    const errorCode = error instanceof Error && error.message.includes('date')
      ? ERROR_CODES.INVALID_DATE_RANGE
      : error instanceof Error && error.message.includes('assembly')
        ? ERROR_CODES.DATA_VALIDATION_ERROR
        : getFirebaseErrorCode(error);

    const appError = createAppError(errorCode, error as Error, {
      function: 'fetchCumulativeMetrics',
      options
    });

    logError(appError);

    // Re-throw the error with user-friendly message for UI to handle
    throw appError;
  }
};

// Placeholder exports for navigation data – to be implemented in Phase 2
import { Zone, AC, SLP } from '../../models/hierarchicalTypes';

/**
 * Fetch list of zones.
 * Reads zoneName from admin-users.zoneName property and formats display as "Zone - {zoneName}".
 */
export const fetchZones = async (): Promise<Zone[]> => {
  try {
    const q = query(collection(db, 'admin-users'), where('role', '==', 'zonal-incharge'));
    const snap = await getDocs(q);
    const zones: Zone[] = [];
    snap.forEach((d: QueryDocumentSnapshot) => {
      const data = d.data() as any;
      const id = d.id;
      const assemblies: string[] = data.assemblies || [];
      const zoneName: string = data.zoneName ? String(data.zoneName) : 'Unknown';
      const inchargeName: string = data.name ? String(data.name) : 'Unknown';
      const name = `Zone - ${zoneName}`;
      const parentVertical: string = data.parentVertical || 'wtm';
      zones.push({ id, name, assemblies, parentVertical, zoneName, inchargeName });
    });
    // Sort alphabetically
    zones.sort((a, b) => a.name.localeCompare(b.name));
    return zones;
  } catch (err) {
    console.error('[fetchZones] error', err);
    return [];
  }
};

/**
 * Fetch list of zones specifically for WTM vertical.
 * Filters by parentVertical='wtm' AND role='zonal-incharge' from admin-users collection.
 * Reads zoneName from admin-users.zoneName property and formats display as "Zone - {zoneName}".
 */
export const fetchZonesForWTM = async (): Promise<Zone[]> => {
  try {
    const q = query(
      collection(db, 'admin-users'),
      where('role', '==', 'zonal-incharge'),
      where('parentVertical', '==', 'wtm')
    );
    const snap = await getDocs(q);
    const zones: Zone[] = [];
    snap.forEach((d: QueryDocumentSnapshot) => {
      const data = d.data() as any;
      const id = d.id;
      const assemblies: string[] = data.assemblies || [];
      const zoneName: string = data.zoneName ? String(data.zoneName) : 'Unknown';
      const inchargeName: string = data.name ? String(data.name) : 'Unknown';
      const name = `Zone - ${zoneName}`;
      const parentVertical: string = 'wtm'; // Always WTM for this function
      zones.push({ id, name, assemblies, parentVertical, zoneName, inchargeName });
    });
    // Sort alphabetically
    zones.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[fetchZonesForWTM] Fetched ${zones.length} WTM zones`);
    return zones;
  } catch (err) {
    console.error('[fetchZonesForWTM] error', err);
    return [];
  }
};

/**
 * Fetch assemblies belonging to a zone.
 * Fetch assemblies by reading `assemblies` array from selected zone document in `admin-users` collection.
 */
export const fetchAssemblies = async (zoneId: string): Promise<string[]> => {
  if (!zoneId) return [];
  try {
    const ref = doc(db, 'admin-users', zoneId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data: any = snap.data();
    const arr: string[] = (data.assemblies || []).slice();
    arr.sort();
    return arr;
  } catch (err) {
    console.error('[fetchAssemblies] error', err);
    return [];
  }
};
/**
 * Fetch Assembly Coordinators for WTM vertical (excludes shakti-abhiyaan collection).
 * Only queries users collection for Assembly Coordinators and Zonal Incharges.
 */
export const fetchAssemblyCoordinatorsForWTM = async (assembly: string): Promise<AC[]> => {
  if (!assembly) return [];

  try {
    // Query 1a: ACs with single assembly field
    const q1a = query(
      collection(db, 'users'),
      where('role', '==', 'Assembly Coordinator'),
      where('assembly', '==', assembly)
    );

    // Query 1b: ACs with multiple assemblies field
    const q1b = query(
      collection(db, 'users'),
      where('role', '==', 'Assembly Coordinator'),
      where('assemblies', 'array-contains', assembly)
    );

    // Execute both queries in parallel
    const [snap1a, snap1b] = await Promise.all([getDocs(q1a), getDocs(q1b)]);
    console.log('[fetchAssemblyCoordinatorsForWTM] AC queries returned', snap1a.size + snap1b.size, 'documents for assembly:', assembly);

    const list: AC[] = [];
    const addedUids = new Set<string>(); // Track added UIDs to avoid duplicates

    // Process both query results with deduplication
    [snap1a, snap1b].forEach((snap) => {
      snap.forEach((d) => {
        const data = d.data() as any;
        if (!addedUids.has(d.id)) {
          list.push({
            uid: d.id,
            name: data.name || 'AC',
            assembly,
            handler_id: data.handler_id
          });
          addedUids.add(d.id);
        }
      });
    });

    // If no Assembly Coordinators found, try Zonal Incharge as fallback
    if (list.length === 0) {
      const q2a = query(
        collection(db, 'users'),
        where('role', '==', 'Zonal Incharge'),
        where('assembly', '==', assembly)
      );

      const q2b = query(
        collection(db, 'users'),
        where('role', '==', 'Zonal Incharge'),
        where('assemblies', 'array-contains', assembly)
      );

      const [snap2a, snap2b] = await Promise.all([getDocs(q2a), getDocs(q2b)]);
      console.log('[fetchAssemblyCoordinatorsForWTM] Zonal Incharge fallback returned', snap2a.size + snap2b.size, 'documents');

      [snap2a, snap2b].forEach((snap) => {
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!addedUids.has(d.id)) {
            list.push({
              uid: d.id,
              name: data.name || 'ZI',
              assembly,
              handler_id: data.handler_id
            });
            addedUids.add(d.id);
          }
        });
      });
    }

    // NOTE: Explicitly excluding shakti-abhiyaan collection source for WTM vertical
    // Also excluding meeting handler_id fallback to keep AC list clean

    console.log(`[fetchAssemblyCoordinatorsForWTM] Found ${list.length} ACs for assembly ${assembly} (WTM only)`);
    return list;
  } catch (err) {
    console.error('[fetchAssemblyCoordinatorsForWTM] Error:', err);
    return [];
  }
};

/**
 * Fetch Assembly Coordinators for a given assembly.
 * Returns array of { uid, name, assembly }.
 * Uses optimized single OR query to support both single and multi-assembly ACs.
 *
 * @deprecated Deprecated in favor of vertical-specific functions to avoid cross-vertical data mixing and unnecessary reads.
 * Use:
 * - fetchAssemblyCoordinatorsForWTM(assembly) for WTM vertical
 * - fetchAssemblyCoordinatorsForShakti(assembly) for Shakti Abhiyaan vertical
 * This generic function remains for backward compatibility in non-dashboard scripts.
 */
export const fetchAssemblyCoordinators = async (assembly: string): Promise<AC[]> => {
  if (!assembly) return [];
  console.log('[fetchAssemblyCoordinators] Fetching ACs for assembly:', assembly);
  try {
    // Source 1: users collection - parallel queries for multi-assembly support
    // Note: OR query syntax has TypeScript compatibility issues with current Firebase SDK
    // Using parallel queries as optimized alternative (still better than sequential)
    const q1a = query(
      collection(db, 'users'),
      where('role', '==', 'Assembly Coordinator'),
      where('assembly', '==', assembly)
    );

    const q1b = query(
      collection(db, 'users'),
      where('role', '==', 'Assembly Coordinator'),
      where('assemblies', 'array-contains', assembly)
    );

    // Execute both queries in parallel for optimal performance
    const [snap1a, snap1b] = await Promise.all([getDocs(q1a), getDocs(q1b)]);
    console.log('[fetchAssemblyCoordinators] Single assembly query returned', snap1a.size, 'documents');
    console.log('[fetchAssemblyCoordinators] Multi-assembly query returned', snap1b.size, 'documents');

    const list: AC[] = [];
    const addedUids = new Set<string>(); // Track added UIDs to avoid duplicates

    // Process both query results with deduplication
    [snap1a, snap1b].forEach((snap) => {
      snap.forEach((d) => {
        const data = d.data() as any;
        if (!addedUids.has(d.id)) {
          list.push({
            uid: d.id,
            name: data.name || 'AC',
            assembly,
            handler_id: data.handler_id
          });
          addedUids.add(d.id);
        }
      });
    });

    // If no Assembly Coordinators found, try Zonal Incharge with same pattern
    if (list.length === 0) {
      const q2a = query(
        collection(db, 'users'),
        where('role', '==', 'Zonal Incharge'),
        where('assembly', '==', assembly)
      );

      const q2b = query(
        collection(db, 'users'),
        where('role', '==', 'Zonal Incharge'),
        where('assemblies', 'array-contains', assembly)
      );

      const [snap2a, snap2b] = await Promise.all([getDocs(q2a), getDocs(q2b)]);
      console.log('[fetchAssemblyCoordinators] Zonal Incharge queries returned', snap2a.size + snap2b.size, 'documents');

      [snap2a, snap2b].forEach((snap) => {
        snap.forEach((d) => {
          const data = d.data() as any;
          if (!addedUids.has(d.id)) {
            list.push({
              uid: d.id,
              name: data.name || 'ZI',
              assembly,
              handler_id: data.handler_id
            });
            addedUids.add(d.id);
          }
        });
      });
    }

    // Source 2: shakti-abhiyaan collection (coveredAssemblyCoordinators)
    const q2 = query(
      collection(db, 'shakti-abhiyaan'),
      where('form_type', '==', 'add-data')
    );
    const snap2 = await getDocs(q2);

    snap2.forEach((d) => {
      const data = d.data() as any;
      const coordinators = data.coveredAssemblyCoordinators || [];
      coordinators.forEach((coord: any) => {
        if (coord.assembly === assembly && !addedUids.has(coord.id)) {
          list.push({
            uid: coord.id,
            name: coord.name || 'AC',
            assembly,
            handler_id: coord.handler_id
          });
          addedUids.add(coord.id);
        }
      });
    });

    // Source 3 (fallback): If no ACs found, derive from meeting documents handler_id
    if (list.length === 0) {
      console.log('[fetchAssemblyCoordinators] No ACs found in users/shakti-abhiyaan, trying meetings fallback...');
      try {
        const meetingQuery = query(
          collection(db, 'slp-activity'),
          where('assembly', '==', assembly),
          where('form_type', '==', 'meeting'),
          limit(50)
        );
        const meetingSnap = await getDocs(meetingQuery);
        const handlerIds = new Set<string>();
        meetingSnap.forEach((d) => {
          const hid = (d.data() as any).handler_id;
          if (hid) handlerIds.add(hid);
        });
        console.log('[fetchAssemblyCoordinators] Found', handlerIds.size, 'unique handler_ids in meetings');

        for (const hid of handlerIds) {
          try {
            const userSnap = await getDoc(doc(db, 'users', hid));
            if (userSnap.exists() && !addedUids.has(hid)) {
              const udata = userSnap.data() as any;
              list.push({
                uid: hid,
                name: udata.name || 'AC',
                assembly, // Use the assembly we're querying for, not user's assembly field
                handler_id: udata.handler_id || hid,
              });
              addedUids.add(hid);
              console.log('[fetchAssemblyCoordinators] Added AC from meetings:', { uid: hid, name: udata.name, userAssembly: udata.assembly });
            }
          } catch (userErr) {
            console.warn('[fetchAssemblyCoordinators] Error fetching user for handler_id', hid, userErr);
          }
        }
      } catch (fallbackErr) {
        console.warn('[fetchAssemblyCoordinators] Meetings fallback failed', fallbackErr);
      }
    }

    console.log('[fetchAssemblyCoordinators] Final list size:', list.length);

    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  } catch (err) {
    console.error('[fetchAssemblyCoordinators] error', err);
    return [];
  }
};

/**
 * Fetch Assembly Coordinators for Shakti-Abhiyaan vertical (excludes users collection).
 * Only queries shakti-abhiyaan collection for Assembly Coordinators.
 */
export const fetchAssemblyCoordinatorsForShakti = async (assembly: string): Promise<AC[]> => {
  if (!assembly) return [];

  try {
    console.log('[fetchAssemblyCoordinatorsForShakti] Fetching Shakti ACs for assembly:', assembly);

    const list: AC[] = [];
    const addedUids = new Set<string>();

    // Only query shakti-abhiyaan collection (coveredAssemblyCoordinators)
    const shaktiQuery = query(
      collection(db, 'shakti-abhiyaan'),
      where('form_type', '==', 'add-data')
    );
    const shaktiSnap = await getDocs(shaktiQuery);

    shaktiSnap.forEach((d) => {
      const data = d.data() as any;
      const coordinators = data.coveredAssemblyCoordinators || [];
      coordinators.forEach((coord: any) => {
        if (coord.assembly === assembly && coord.id && !addedUids.has(coord.id)) {
          list.push({
            uid: coord.id,
            name: coord.name || 'AC',
            assembly,
            handler_id: coord.handler_id,
            isShaktiAC: true // Mark as Shakti AC
          });
          addedUids.add(coord.id);
          console.log('[fetchAssemblyCoordinatorsForShakti] Added Shakti AC:', { uid: coord.id, name: coord.name, assembly });
        }
      });
    });

    console.log(`[fetchAssemblyCoordinatorsForShakti] Found ${list.length} Shakti ACs for assembly ${assembly}`);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('[fetchAssemblyCoordinatorsForShakti] Error:', err);
    return [];
  }
};

/**
 * Fetch SLPs / ASLPs under a given Assembly Coordinator.
 */
export const fetchSlpsForAc = async (acId: string): Promise<SLP[]> => {
  if (!acId) return [];
  try {
    const list: SLP[] = [];

    // First, check if this AC is from shakti-abhiyaan or users collection
    let isShaktiAc = false;
    try {
      const acDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', acId)));
      if (!acDoc.empty) {
        // If AC is in users collection, it's not a Shakti AC
        isShaktiAc = false;
      } else {
        // Check if AC exists in shakti-abhiyaan
        const shaktiQuery = query(
          collection(db, 'shakti-abhiyaan'),
          where('form_type', '==', 'add-data')
        );
        const shaktiSnap = await getDocs(shaktiQuery);
        shaktiSnap.forEach((d) => {
          const data = d.data() as any;
          const coordinators = data.coveredAssemblyCoordinators || [];
          coordinators.forEach((coord: any) => {
            if (coord.id === acId) {
              isShaktiAc = true;
            }
          });
        });
      }
    } catch (err) {
      console.log(`[fetchSlpsForAc] Error checking AC source:`, err);
    }

    // Source 1: Associated SLPs from shakti-abhiyaan (only if AC is from Shakti)
    if (isShaktiAc) {
      const q1 = query(
        collection(db, 'shakti-abhiyaan'),
        where('form_type', '==', 'add-data')
      );
      const snap1 = await getDocs(q1);

      snap1.forEach((d) => {
        const data = d.data() as any;
        const coordinators = data.coveredAssemblyCoordinators || [];
        coordinators.forEach((coord: any) => {
          if (coord.id === acId && coord.slps) {
            coord.slps.forEach((slp: any) => {
              list.push({
                uid: slp.id || slp.uid,
                name: slp.name || 'SLP',
                assembly: slp.assembly || '',
                role: slp.role || 'SLP',
                handler_id: slp.handler_id || acId,
                isShaktiSLP: true, // Mark as Shakti SLP
                shaktiId: slp.id, // Store the original Shakti ID
              });
            });
          }
        });
      });
    }

    // Source 2: Meeting SLPs from wtm-slp where handler_id matches AC
    const q2 = query(
      collection(db, 'wtm-slp'),
      where('form_type', '==', 'meeting'),
      where('recommendedPosition', '==', 'SLP'),
      where('handler_id', '==', acId)
    );
    const snap2 = await getDocs(q2);

    snap2.forEach((d) => {
      const data = d.data() as any;
      if (data.name && !list.find(slp => slp.name === data.name)) {
        list.push({
          uid: d.id,
          name: data.name,
          assembly: data.assembly || '',
          role: 'SLP',
          handler_id: acId,
        });
      }
    });

    // Source 3: Independent SLPs (always shown when SLP dropdown is visible)
    // Get independent SLPs from users collection
    const q3 = query(
      collection(db, 'users'),
      where('role', '==', 'SLP'),
      where('independent', '==', true)
    );
    const snap3 = await getDocs(q3);

    snap3.forEach((d) => {
      const data = d.data() as any;
      if (!list.find(slp => slp.uid === d.id)) {
        list.push({
          uid: d.id,
          name: data.name || 'Independent SLP',
          assembly: data.assembly || '',
          role: 'SLP',
          handler_id: data.handler_id,
          independent: true,
        });
      }
    });

    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  } catch (err) {
    console.error('[fetchSlpsForAc] error', err);
    return [];
  }
};

// Detailed Data Fetching Functions for Bottom Panel

/**
 * Fetch detailed meeting data for the selected hierarchy level
 */
export const fetchDetailedMeetings = async (options: FetchMetricsOptions): Promise<any[]> => {
  try {
    console.log('[fetchDetailedMeetings] Fetching with options:', options);

    const wtmSlpCollection = collection(db, 'wtm-slp');
    let baseQuery1 = query(wtmSlpCollection, where('form_type', '==', 'meeting'));
    let baseQuery2 = query(wtmSlpCollection, where('type', '==', 'meeting'));

    // Add handler_id filter if provided (for AC/SLP level)
    if (options.handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', options.handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', options.handler_id));
    }

    // Add date filter if provided - meetings use created_at field with epoch timestamp (to match getWtmSlpSummary)
    if (options.dateRange) {
      console.log('[fetchDetailedMeetings] Applying date filter:', options.dateRange);

      // Use UTC boundaries to match getWtmSlpSummary filtering logic
      const startDateObj = new Date(`${options.dateRange.startDate}T00:00:00.000Z`);
      const endDateObj = new Date(`${options.dateRange.endDate}T23:59:59.999Z`);

      const startEpochMs = startDateObj.getTime();
      const endEpochMs = endDateObj.getTime();

      console.log(`[fetchDetailedMeetings] Date filter range: ${startEpochMs} to ${endEpochMs}`);

      baseQuery1 = query(baseQuery1, where('created_at', '>=', startEpochMs), where('created_at', '<=', endEpochMs), orderBy('created_at', 'desc'));
      baseQuery2 = query(baseQuery2, where('created_at', '>=', startEpochMs), where('created_at', '<=', endEpochMs), orderBy('created_at', 'desc'));
    } else {
      // Add orderBy for consistent sorting even without date filter
      baseQuery1 = query(baseQuery1, orderBy('created_at', 'desc'));
      baseQuery2 = query(baseQuery2, orderBy('created_at', 'desc'));
    }

    // Execute queries with assembly chunking to handle >10 assembly limit
    let snap1Results = [];
    let snap2Results = [];

    if (options.assemblies && options.assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(options.assemblies)];

      if (uniqueAssemblies.length <= 10) {
        // Single query for <=10 assemblies
        const query1WithAssemblies = query(baseQuery1, where('assembly', 'in', uniqueAssemblies));
        const query2WithAssemblies = query(baseQuery2, where('assembly', 'in', uniqueAssemblies));
        const [snap1, snap2] = await Promise.all([getDocs(query1WithAssemblies), getDocs(query2WithAssemblies)]);
        snap1Results = [snap1];
        snap2Results = [snap2];
      } else {
        // Chunk into groups of 10 and run parallel queries
        const chunks = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }

        console.log(`[fetchDetailedMeetings] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);

        const query1Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery1, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const query2Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery2, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const [query1Results, query2Results] = await Promise.all([
          Promise.all(query1Promises),
          Promise.all(query2Promises)
        ]);

        snap1Results = query1Results;
        snap2Results = query2Results;
      }
    } else {
      // No assembly filter
      const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
      snap1Results = [snap1];
      snap2Results = [snap2];
    }

    const meetingsMap = new Map();

    // Process all snap1 results
    snap1Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!meetingsMap.has(doc.id)) {
          meetingsMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    // Process all snap2 results
    snap2Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!meetingsMap.has(doc.id)) {
          meetingsMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    const result = Array.from(meetingsMap.values());

    // Enrich with coordinator names (AC names from users collection)
    const coordinatorNamesMap = new Map<string, string>();
    const uniqueHandlerIds = [...new Set(result.map((meeting: any) => meeting.handler_id).filter(Boolean))];

    console.log(`[fetchDetailedMeetings] Found ${uniqueHandlerIds.length} unique handler IDs:`, uniqueHandlerIds);

    if (uniqueHandlerIds.length > 0) {
      const usersCollection = collection(db, 'users');

      // Handle Firebase 'IN' query limit of 30 by batching
      const batchSize = 30;
      for (let i = 0; i < uniqueHandlerIds.length; i += batchSize) {
        const batch = uniqueHandlerIds.slice(i, i + batchSize);
        // Try querying by document ID first since handler_id might be the document ID
        const usersQuery = query(usersCollection, where(documentId(), 'in', batch));
        const usersSnap = await getDocs(usersQuery);

        console.log(`[fetchDetailedMeetings] Batch:`, batch);
        console.log(`[fetchDetailedMeetings] Found ${usersSnap.size} user documents`);

        usersSnap.forEach((doc) => {
          const userData = doc.data();
          console.log(`[fetchDetailedMeetings] User doc ${doc.id}:`, { name: userData.name });

          // Only match by document ID (handler_id should be the document ID)
          if (batch.includes(doc.id)) {
            // Only use 'name' property, fallback to 'Unknown'
            coordinatorNamesMap.set(doc.id, userData.name || 'Unknown');
            console.log(`[fetchDetailedMeetings] Mapped: ${doc.id} -> ${userData.name || 'Unknown'}`);
          }
        });
      }
    }

    // Add coordinator names to meeting records
    const enrichedResult = result.map((meeting: any) => ({
      ...meeting,
      coordinatorName: coordinatorNamesMap.get(meeting.handler_id) || 'Unknown'
    }));

    console.log(`[fetchDetailedMeetings] Found ${enrichedResult.length} meetings with coordinator names`);
    return enrichedResult;
  } catch (error) {
    console.error('[fetchDetailedMeetings] Error:', error);
    return [];
  }
};

/**
 * Fetch detailed member activities (Saathi) for the selected hierarchy level
 */
export const fetchDetailedMembers = async (options: FetchMetricsOptions): Promise<any[]> => {
  try {
    console.log('[fetchDetailedMembers] Fetching with options:', options);

    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'members'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'members'));

    // Add handler_id filter if provided (for AC/SLP level)
    if (options.handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', options.handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', options.handler_id));
    }

    // Add date filter if provided - members use createdAt field with epoch ms format (to match getHierarchicalMemberActivity)
    if (options.dateRange) {
      console.log('[fetchDetailedMembers] Applying date filter:', options.dateRange);

      // Use UTC boundaries to ensure full 24-hour coverage regardless of timezone
      const startDateObj = new Date(`${options.dateRange.startDate}T00:00:00.000Z`);
      const endDateObj = new Date(`${options.dateRange.endDate}T23:59:59.999Z`);
      const startEpochMs = startDateObj.getTime();
      const endEpochMs = endDateObj.getTime();

      console.log(`[fetchDetailedMembers] Date filter range: ${startEpochMs} to ${endEpochMs}`);
      console.log(`[fetchDetailedMembers] Start date: ${startDateObj.toISOString()}`);
      console.log(`[fetchDetailedMembers] End date: ${endDateObj.toISOString()}`);

      baseQuery1 = query(baseQuery1, where('createdAt', '>=', startEpochMs), where('createdAt', '<=', endEpochMs), orderBy('createdAt', 'desc'));
      baseQuery2 = query(baseQuery2, where('createdAt', '>=', startEpochMs), where('createdAt', '<=', endEpochMs), orderBy('createdAt', 'desc'));
    } else {
      // Add orderBy for consistent sorting even without date filter
      baseQuery1 = query(baseQuery1, orderBy('createdAt', 'desc'));
      baseQuery2 = query(baseQuery2, orderBy('createdAt', 'desc'));
    }

    // Execute queries with assembly chunking to handle >10 assembly limit
    let snap1Results = [];
    let snap2Results = [];

    if (options.assemblies && options.assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(options.assemblies)];

      if (uniqueAssemblies.length <= 10) {
        // Single query for <=10 assemblies
        const query1WithAssemblies = query(baseQuery1, where('assembly', 'in', uniqueAssemblies));
        const query2WithAssemblies = query(baseQuery2, where('assembly', 'in', uniqueAssemblies));
        const [snap1, snap2] = await Promise.all([getDocs(query1WithAssemblies), getDocs(query2WithAssemblies)]);
        snap1Results = [snap1];
        snap2Results = [snap2];
      } else {
        // Chunk into groups of 10 and run parallel queries
        const chunks = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }

        console.log(`[fetchDetailedMembers] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);

        const query1Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery1, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const query2Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery2, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const [query1Results, query2Results] = await Promise.all([
          Promise.all(query1Promises),
          Promise.all(query2Promises)
        ]);

        snap1Results = query1Results;
        snap2Results = query2Results;
      }
    } else {
      // No assembly filter
      const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
      snap1Results = [snap1];
      snap2Results = [snap2];
    }
    // Calculate total document counts from all result snapshots
    const totalSnap1Docs = snap1Results.reduce((total, snap) => total + snap.size, 0);
    const totalSnap2Docs = snap2Results.reduce((total, snap) => total + snap.size, 0);

    console.log(`[fetchDetailedMembers] Query 1 (form_type='members') returned: ${totalSnap1Docs} documents`);
    console.log(`[fetchDetailedMembers] Query 2 (type='members') returned: ${totalSnap2Docs} documents`);

    const membersMap = new Map();
    let documentsWithoutCreatedAt = 0;
    let documentsOutsideRange = 0;

    // Process all snap1 results
    snap1Results.forEach((snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        if (!membersMap.has(doc.id)) {
          // Debug createdAt field
          if (!data.createdAt) {
            documentsWithoutCreatedAt++;
            console.log(`[fetchDetailedMembers] Document ${doc.id} missing createdAt field`);
          } else if (options.dateRange) {
            const startEpochMs = new Date(`${options.dateRange.startDate}T00:00:00.000Z`).getTime();
            const endEpochMs = new Date(`${options.dateRange.endDate}T23:59:59.999Z`).getTime();
            if (data.createdAt < startEpochMs || data.createdAt > endEpochMs) {
              documentsOutsideRange++;
              console.log(`[fetchDetailedMembers] Document ${doc.id} createdAt ${data.createdAt} outside range`);
            }
          }
          membersMap.set(doc.id, { ...data, id: doc.id });
        }
      });
    });

    // Process all snap2 results
    snap2Results.forEach((snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        if (!membersMap.has(doc.id)) {
          // Debug createdAt field
          if (!data.createdAt) {
            documentsWithoutCreatedAt++;
            console.log(`[fetchDetailedMembers] Document ${doc.id} missing createdAt field`);
          } else if (options.dateRange) {
            const startEpochMs = new Date(`${options.dateRange.startDate}T00:00:00.000Z`).getTime();
            const endEpochMs = new Date(`${options.dateRange.endDate}T23:59:59.999Z`).getTime();
            if (data.createdAt < startEpochMs || data.createdAt > endEpochMs) {
              documentsOutsideRange++;
              console.log(`[fetchDetailedMembers] Document ${doc.id} createdAt ${data.createdAt} outside range`);
            }
          }
          membersMap.set(doc.id, { ...data, id: doc.id });
        }
      });
    });

    console.log(`[fetchDetailedMembers] Total unique documents after merge: ${membersMap.size}`);
    console.log(`[fetchDetailedMembers] Documents without createdAt: ${documentsWithoutCreatedAt}`);
    console.log(`[fetchDetailedMembers] Documents outside date range: ${documentsOutsideRange}`);

    const result = Array.from(membersMap.values());

    // Debug parentVertical filtering
    const beforeShaktiFilter = result.length;
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');
    const shaktiFiltered = beforeShaktiFilter - filteredResult.length;

    console.log(`[fetchDetailedMembers] Before shakti filter: ${beforeShaktiFilter}`);
    console.log(`[fetchDetailedMembers] Shakti documents filtered out: ${shaktiFiltered}`);
    console.log(`[fetchDetailedMembers] Final result count: ${filteredResult.length}`);

    // Sample a few documents for debugging
    if (filteredResult.length > 0) {
      console.log('[fetchDetailedMembers] Sample documents:');
      filteredResult.slice(0, 3).forEach((doc, index) => {
        console.log(`  ${index + 1}. ID: ${doc.id}, createdAt: ${doc.createdAt}, date: ${new Date(doc.createdAt).toISOString()}`);
      });
    }

    // Enrich with coordinator names (SLP names from wtm-slp collection)
    const coordinatorNamesMap = new Map<string, string>();
    const uniqueHandlerIds = [...new Set(filteredResult.map((member: any) => member.handler_id).filter(Boolean))];

    if (uniqueHandlerIds.length > 0) {
      console.log(`[fetchDetailedMembers] Looking up ${uniqueHandlerIds.length} unique handler IDs for SLP names`);

      // Handle Firebase 'IN' query limit of 30 by batching
      const batchSize = 30;
      for (let i = 0; i < uniqueHandlerIds.length; i += batchSize) {
        const batch = uniqueHandlerIds.slice(i, i + batchSize);

        // Look up SLP names from wtm-slp collection using document IDs
        const wtmSlpCollection = collection(db, 'wtm-slp');
        const wtmSlpQuery = query(wtmSlpCollection, where(documentId(), 'in', batch));
        const wtmSlpSnap = await getDocs(wtmSlpQuery);

        console.log(`[fetchDetailedMembers] Batch ${Math.floor(i / batchSize) + 1}: Found ${wtmSlpSnap.size} SLP records for ${batch.length} handler IDs`);

        wtmSlpSnap.forEach((doc) => {
          const data = doc.data();
          const slpName = data.name || data.recommendedPersonName || doc.id;
          coordinatorNamesMap.set(doc.id, slpName);
          console.log(`[fetchDetailedMembers] Mapped handler_id ${doc.id} to SLP name: ${slpName}`);
        });
      }

      console.log(`[fetchDetailedMembers] Successfully mapped ${coordinatorNamesMap.size} handler IDs to SLP names`);
    }

    // Add coordinator names to member records
    const enrichedResult = filteredResult.map((member: any) => ({
      ...member,
      coordinatorName: coordinatorNamesMap.get(member.handler_id) || member.handler_id || 'Unknown'
    }));

    return enrichedResult;
  } catch (error) {
    console.error('[fetchDetailedMembers] Error:', error);
    return [];
  }
};

/**
 * Fetch detailed video activities for the selected hierarchy level
 */
/**
 * Fetch detailed volunteers data (meeting entries with onboardingStatus === 'Onboarded')
 */
export const fetchDetailedVolunteers = async (options: FetchMetricsOptions): Promise<any[]> => {
  const meetings = await fetchDetailedMeetings(options);
  return meetings.filter(m => (m.onboardingStatus || '').toLowerCase() === 'onboarded');
};

/**
 * Fetch detailed SLP (Samvidhan Leader) data (meeting entries with recommendedPosition === 'SLP')
 */
export const fetchDetailedLeaders = async (options: FetchMetricsOptions): Promise<any[]> => {
  const meetings = await fetchDetailedMeetings(options);
  return meetings.filter(m => (m.recommendedPosition || '').toLowerCase() === 'slp');
};

export const fetchDetailedVideos = async (options: FetchMetricsOptions): Promise<any[]> => {
  try {
    console.log('[fetchDetailedVideos] Fetching with options:', options);

    const slpActivityCollection = collection(db, 'slp-activity');
    let baseQuery1 = query(slpActivityCollection, where('form_type', '==', 'local-issue-video'));
    let baseQuery2 = query(slpActivityCollection, where('type', '==', 'local-issue-video'));

    // Add handler_id filter if provided (for AC/SLP level)
    if (options.handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', options.handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', options.handler_id));
    }

    // Add date filtering using Firestore queries - videos use date_submitted field with string comparison (YYYY-MM-DD format)
    if (options.dateRange) {
      const startDateStr = options.dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = options.dateRange.endDate;     // Already in YYYY-MM-DD format

      console.log('[fetchDetailedVideos] Applying Firestore date filter:', startDateStr, 'to', endDateStr);

      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr), orderBy('date_submitted', 'desc'));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDateStr), where('date_submitted', '<=', endDateStr), orderBy('date_submitted', 'desc'));
    } else {
      // Add orderBy for consistent sorting even without date filter
      baseQuery1 = query(baseQuery1, orderBy('date_submitted', 'desc'));
      baseQuery2 = query(baseQuery2, orderBy('date_submitted', 'desc'));
    }

    // Execute queries with assembly chunking to handle >10 assembly limit
    let snap1Results = [];
    let snap2Results = [];

    if (options.assemblies && options.assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(options.assemblies)];

      if (uniqueAssemblies.length <= 10) {
        // Single query for <=10 assemblies
        const query1WithAssemblies = query(baseQuery1, where('assembly', 'in', uniqueAssemblies));
        const query2WithAssemblies = query(baseQuery2, where('assembly', 'in', uniqueAssemblies));
        const [snap1, snap2] = await Promise.all([getDocs(query1WithAssemblies), getDocs(query2WithAssemblies)]);
        snap1Results = [snap1];
        snap2Results = [snap2];
      } else {
        // Chunk into groups of 10 and run parallel queries
        const chunks = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }

        console.log(`[fetchDetailedVideos] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);

        const query1Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery1, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const query2Promises = chunks.map(chunk => {
          const chunkQuery = query(baseQuery2, where('assembly', 'in', chunk));
          return getDocs(chunkQuery);
        });

        const [query1Results, query2Results] = await Promise.all([
          Promise.all(query1Promises),
          Promise.all(query2Promises)
        ]);

        snap1Results = query1Results;
        snap2Results = query2Results;
      }
    } else {
      // No assembly filter
      const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
      snap1Results = [snap1];
      snap2Results = [snap2];
    }

    // Calculate total document counts from all result snapshots
    const totalSnap1Docs = snap1Results.reduce((total, snap) => total + snap.size, 0);
    const totalSnap2Docs = snap2Results.reduce((total, snap) => total + snap.size, 0);

    console.log(`[fetchDetailedVideos] Query 1 (form_type='local-issue-video') returned: ${totalSnap1Docs} documents`);
    console.log(`[fetchDetailedVideos] Query 2 (type='local-issue-video') returned: ${totalSnap2Docs} documents`);

    const videosMap = new Map();

    // Process all snap1 results
    snap1Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!videosMap.has(doc.id)) {
          videosMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    // Process all snap2 results
    snap2Results.forEach((snap) => {
      snap.forEach((doc) => {
        if (!videosMap.has(doc.id)) {
          videosMap.set(doc.id, { ...doc.data(), id: doc.id });
        }
      });
    });

    const result = Array.from(videosMap.values());
    const filteredResult = result.filter((doc: any) => doc.parentVertical !== 'shakti-abhiyaan');

    // Enrich with coordinator names (SLP names from shakti-abhiyaan collection)
    const coordinatorNamesMap = new Map<string, string>();
    const uniqueHandlerIds = [...new Set(filteredResult.map((member: any) => member.handler_id).filter(Boolean))];

    if (uniqueHandlerIds.length > 0) {
      // Handle Firebase 'IN' query limit of 30 by batching
      const batchSize = 30;
      for (let i = 0; i < uniqueHandlerIds.length; i += batchSize) {
        const batch = uniqueHandlerIds.slice(i, i + batchSize);

        // Look up SLP names from shakti-abhiyaan collection structure
        const shaktiCollection = collection(db, 'shakti-abhiyaan');
        const shaktiQuery = query(shaktiCollection, where('form_type', '==', 'add-data'));
        const shaktiSnap = await getDocs(shaktiQuery);

        shaktiSnap.forEach((doc) => {
          const data = doc.data();
          const coordinators = data.coveredAssemblyCoordinators || [];

          coordinators.forEach((coord: any) => {
            if (coord.slps) {
              coord.slps.forEach((slp: any) => {
                // Check if this SLP's ID or handler_id matches our batch
                if (batch.includes(slp.id) || batch.includes(slp.uid)) {
                  coordinatorNamesMap.set(slp.id || slp.uid, slp.name || slp.id || slp.uid);
                }
                if (slp.handler_id && batch.includes(slp.handler_id)) {
                  coordinatorNamesMap.set(slp.handler_id, slp.name || slp.handler_id);
                }
              });
            }
          });
        });

        // Also try to look up from wtm-slp collection for meeting-based SLPs
        const wtmSlpCollection = collection(db, 'wtm-slp');
        const wtmSlpQuery = query(wtmSlpCollection, where('handler_id', 'in', batch));
        const wtmSlpSnap = await getDocs(wtmSlpQuery);

        wtmSlpSnap.forEach((doc) => {
          const data = doc.data();
          if (data.name && batch.includes(data.handler_id)) {
            coordinatorNamesMap.set(data.handler_id, data.name);
          }
        });
      }
    }

    // Add coordinator names to video records
    const enrichedResult = filteredResult.map((video: any) => ({
      ...video,
      coordinatorName: coordinatorNamesMap.get(video.handler_id) || video.handler_id || 'Unknown'
    }));

    console.log(`[fetchDetailedVideos] Found ${enrichedResult.length} videos with coordinator names`);
    return enrichedResult;
  } catch (error) {
    console.error('[fetchDetailedVideos] Error:', error);
    return [];
  }
};

/**
 * Generic function to fetch detailed data based on metric type
 */
export const fetchDetailedData = async (metricType: string, options: FetchMetricsOptions): Promise<any[]> => {
  console.log(`[fetchDetailedData] Fetching ${metricType} with options:`, options);

  switch (metricType) {
    case 'meetings':
      return fetchDetailedMeetings(options);
    case 'saathi':
      return fetchDetailedMembers(options);
    case 'volunteers':
      return fetchDetailedVolunteers(options);
    case 'slps':
      return fetchDetailedLeaders(options);
    case 'videos':
      return fetchDetailedVideos(options);
    case 'acVideos':
      return getHierarchicalAcVideos(options.assemblies, options.dateRange, options.handler_id);
    case 'clubs':
      return getHierarchicalPanchayatWaActivity(options.assemblies, options.dateRange, options.handler_id);
    case 'forms':
      return getHierarchicalMaiBahinYojnaActivity(options.assemblies, options.dateRange, options.handler_id);
    case 'chaupals':
      return getHierarchicalChaupals(options.assemblies, options.dateRange, options.handler_id);
    case 'shaktiLeaders':
      return getHierarchicalShaktiLeaders(options.assemblies, options.dateRange, options.handler_id);
    case 'shaktiSaathi':
      return getHierarchicalShaktiSaathi(options.assemblies, options.dateRange, options.handler_id);
    case 'shaktiClubs':
      return getHierarchicalShaktiClubs(options.assemblies, options.dateRange, options.handler_id);
    case 'shaktiBaithaks':
      return getHierarchicalShaktiBaithaks(options.assemblies, options.dateRange, options.handler_id);
    case 'shaktiForms':
      return getHierarchicalShaktiForms(options.assemblies, options.dateRange, options.handler_id);
    case 'centralWaGroups':
      return getHierarchicalCentralWaGroups(options.assemblies, options.dateRange, options.handler_id);
    case 'assemblyWaGroups':
      return getHierarchicalAssemblyWaGroups(options.assemblies, options.dateRange, options.handler_id);
    case 'shaktiAssemblyWaGroups':
      return getHierarchicalShaktiAssemblyWaGroups(options.assemblies, options.dateRange, options.handler_id);
    case 'nukkadAc':
      // For SLP level, align with summary gating: return empty list
      if (options.level === 'slp') return [];
      return fetchDetailedNukkadAc(options);
    case 'nukkadSlp':
      return fetchDetailedNukkadSlp(options);
    default:
      console.warn(`[fetchDetailedData] Unknown metric type: ${metricType}`);
      return [];
  }
};

/**
 * Lightweight paged fetcher (fallback) that wraps fetchDetailedData
 * - Orders results by best-effort date field guess (DESC)
 * - Applies a simple cursor (items with orderValue < cursorBefore)
 * - Returns page items and nextCursor.lastOrderValue for subsequent calls
 *
 * NOTE: This is an in-memory pagination fallback intended to unblock UI.
 *       It will be replaced by a proper Paged Query Controller with Firestore cursors.
 */
export const fetchDetailedDataPaged = async (
  metricType: string,
  options: FetchMetricsOptions & { pageSize?: number; cursorBefore?: number | string | undefined }
): Promise<{ items: any[]; hasMore: boolean; nextCursor?: { lastOrderValue: number } }> => {
  const { pageSize = 25, cursorBefore } = options as { pageSize?: number; cursorBefore?: number | string | undefined };

  // Try server-side paging for supported metrics; fallback to in-memory
  const supported = new Set([
    'videos', 'acVideos', 'forms', 'chaupals', 'clubs', 'nukkadAc', 'nukkadSlp'
  ]);
  try {
    if (supported.has(metricType)) {
      const res = await serverPagedFetchForMetric(metricType, options, pageSize, cursorBefore);
      // If server paging yielded items, return directly
      if (res) {
        // Enrich with coordinator names if needed (since serverPagedFetchForMetric returns raw data)
        if (metricType === 'nukkadSlp') {
          const ids = [...new Set(res.items.map((r: any) => r.handler_id).filter(Boolean))];
          console.log('[fetchDetailedDataPaged] Enriching nukkadSlp names for IDs:', ids);
          const names = await resolveSlpNamesFromWtmByIds(ids);
          res.items = res.items.map((doc: any) => ({
            ...doc,
            coordinatorName: names.get(doc.handler_id) || doc.handler_id || 'Unknown'
          }));
        } else if (metricType === 'nukkadAc') {
          const ids = [...new Set(res.items.map((r: any) => r.handler_id).filter(Boolean))];
          let names: Map<string, string>;

          if (options.vertical === 'shakti-abhiyaan') {
            const [shaktiNames, userNames] = await Promise.all([
              resolveShaktiUserNamesByIds(ids),
              resolveUserNamesByIds(ids)
            ]);
            names = new Map([...userNames, ...shaktiNames]);
            console.log(`[fetchDetailedDataPaged] Shakti AC enrichment: Resolved ${shaktiNames.size} from shakti-users, ${userNames.size} from users`);
          } else {
            names = await resolveUserNamesByIds(ids);
          }

          res.items = res.items.map((doc: any) => ({
            ...doc,
            coordinatorName: names.get(doc.handler_id) || doc.handler_id || 'Unknown'
          }));
        }

        return res;
      }
    }
  } catch (err) {
    console.warn('[fetchDetailedDataPaged] Server-side paging failed, falling back:', err);
  }

  // Fallback: Reuse existing detailed fetcher and paginate in-memory
  const all = await fetchDetailedData(metricType, options);

  // Heuristics to derive an order value (ms since epoch)
  const toMs = (val: any): number | undefined => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const t = Date.parse(val);
      return isNaN(t) ? undefined : t;
    }
    // Firestore Timestamp objects
    // - { seconds: number, nanoseconds: number }
    if (typeof val === 'object') {
      if (typeof (val as any).toDate === 'function') {
        try { return (val as any).toDate().getTime(); } catch { }
      }
      if (typeof (val as any).seconds === 'number') {
        return (val as any).seconds * 1000;
      }
    }
    return undefined;
  };

  const candidateKeys: string[] = [
    // Common normalized fields first
    'dateOfVisit', 'date_submitted', 'dateFormatted', 'date',
    // Raw created fields
    'createdAt', 'created_at'
  ];

  const withOrder = all.map((row: any) => {
    let v: number | undefined;
    for (const k of candidateKeys) {
      v = toMs(row[k]);
      if (typeof v === 'number') break;
    }
    // As a final fallback, try nested metadata
    if (v === undefined && row?.metadata) {
      for (const k of candidateKeys) {
        v = toMs(row.metadata[k]);
        if (typeof v === 'number') break;
      }
    }
    return { row, orderValue: typeof v === 'number' ? v : 0 };
  });

  // Sort DESC (newest first)
  withOrder.sort((a, b) => b.orderValue - a.orderValue);

  // Apply cursor: include items strictly older than cursorBefore
  let filtered = withOrder;
  if (cursorBefore !== undefined && cursorBefore !== null) {
    const cbNum = typeof cursorBefore === 'string' ? (Date.parse(cursorBefore) || 0) : Number(cursorBefore);
    filtered = withOrder.filter(item => item.orderValue < cbNum);
  }

  const pageItems = filtered.slice(0, pageSize).map(x => x.row);
  const hasMore = filtered.length > pageItems.length;
  const lastOrder = pageItems.length ? Math.min(...pageItems.map((r: any) => {
    let v: number | undefined;
    for (const k of candidateKeys) {
      const t = toMs(r[k]);
      if (typeof t === 'number') { v = t; break; }
    }
    if (v === undefined && r?.metadata) {
      for (const k of candidateKeys) {
        const t = toMs(r.metadata[k]);
        if (typeof t === 'number') { v = t; break; }
      }
    }
    return typeof v === 'number' ? v : 0;
  })) : undefined;

  return {
    items: pageItems,
    hasMore,
    nextCursor: hasMore && typeof lastOrder === 'number' ? { lastOrderValue: lastOrder } : undefined,
  };
};

// Helper: attempt server-side Firestore pagination for specific metrics
const serverPagedFetchForMetric = async (
  metricType: string,
  options: FetchMetricsOptions & { cursorBefore?: number | string | undefined },
  pageSize: number,
  cursorBefore?: number | string
): Promise<{ items: any[]; hasMore: boolean; nextCursor?: { lastOrderValue: number } } | null> => {
  const assemblies = options.assemblies || [];
  const handler_id = options.handler_id;
  const vertical = options.vertical;
  const dateRange = options.dateRange;

  // Determine collection, filters, and date field per metric
  type MetricConfig = {
    collectionName: 'slp-activity' | 'wtm-slp';
    formTypes: string[]; // match against either form_type or legacy type
    dateField: string; // field used for ordering and bounds
    dateKind: 'string' | 'number';
    includeParentVerticalEq?: 'shakti-abhiyaan'; // when filtering shakti explicitly
    excludeParentVerticalShaktiClient?: boolean; // when we must exclude client-side
  };

  const cfgMap: Record<string, MetricConfig> = {
    videos: { collectionName: 'slp-activity', formTypes: ['local-issue-video'], dateField: 'date_submitted', dateKind: 'string', excludeParentVerticalShaktiClient: true },
    acVideos: { collectionName: 'wtm-slp', formTypes: ['local-issue-video'], dateField: 'date_submitted', dateKind: 'string' },
    forms: { collectionName: 'slp-activity', formTypes: ['mai-bahin-yojna'], dateField: 'date', dateKind: 'string', excludeParentVerticalShaktiClient: true },
    chaupals: { collectionName: 'slp-activity', formTypes: ['weekly_meeting'], dateField: 'dateFormatted', dateKind: 'string', excludeParentVerticalShaktiClient: true },
    clubs: { collectionName: 'slp-activity', formTypes: ['panchayat-wa'], dateField: 'createdAt', dateKind: 'string', excludeParentVerticalShaktiClient: true },
    nukkadAc: { collectionName: 'wtm-slp', formTypes: ['nukkad_meeting'], dateField: 'createdAt', dateKind: 'number', includeParentVerticalEq: vertical === 'shakti-abhiyaan' ? 'shakti-abhiyaan' : undefined, excludeParentVerticalShaktiClient: vertical !== 'shakti-abhiyaan' },
    nukkadSlp: { collectionName: 'slp-activity', formTypes: ['nukkad_meeting'], dateField: 'createdAt', dateKind: 'number', excludeParentVerticalShaktiClient: true },
  } as const;

  const cfg = cfgMap[metricType];
  if (!cfg) return null;

  // Normalize end bound using cursorBefore if provided
  const convertMsToDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  let endBound: string | number | undefined = undefined;
  if (cursorBefore !== undefined && cursorBefore !== null) {
    endBound = typeof cursorBefore === 'number' ? (cfg.dateKind === 'string' ? convertMsToDateStr(cursorBefore) : cursorBefore) : cursorBefore;
  } else if (dateRange?.endDate) {
    endBound = cfg.dateKind === 'string' ? dateRange.endDate : new Date(`${dateRange.endDate}T23:59:59.999Z`).getTime();
  }
  const startBound = dateRange?.startDate
    ? (cfg.dateKind === 'string' ? dateRange.startDate : new Date(`${dateRange.startDate}T00:00:00.000Z`).getTime())
    : undefined;

  // Build two base queries (form_type and legacy type) and merge
  const colRef = collection(db, cfg.collectionName);

  const buildBase = (useLegacyType: boolean) => {
    let qBase: any = query(colRef, where(useLegacyType ? 'type' : 'form_type', '==', cfg.formTypes[0]));
    if (assemblies.length > 0) {
      // Assemblies filtered later via chunking
    }
    if (handler_id) {
      qBase = query(qBase, where('handler_id', '==', handler_id));
    }
    if (cfg.includeParentVerticalEq) {
      qBase = query(qBase, where('parentVertical', '==', cfg.includeParentVerticalEq));
    }
    // Apply date bounds if available. Use <= endBound and >= startBound.
    if (startBound !== undefined) {
      qBase = query(qBase, where(cfg.dateField as any, '>=', startBound as any));
    }
    if (endBound !== undefined) {
      qBase = query(qBase, where(cfg.dateField as any, '<', endBound as any));
    }
    // Order by dateField DESC for pagination
    qBase = query(qBase, orderBy(cfg.dateField as any, 'desc'), limit(pageSize));
    return qBase;
  };

  // Execute with optional assembly chunking
  const execWithAssemblies = async (qBase: any) => {
    if (assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(assemblies)];
      if (uniqueAssemblies.length <= 10) {
        const q1 = query(qBase, where('assembly', 'in', uniqueAssemblies));
        return [await getDocs(q1)];
      } else {
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }
        const promises = chunks.map(chunk => getDocs(query(qBase, where('assembly', 'in', chunk))));
        return await Promise.all(promises);
      }
    }
    return [await getDocs(qBase)];
  };

  const [snaps1, snaps2] = await Promise.all([
    execWithAssemblies(buildBase(false)),
    execWithAssemblies(buildBase(true))
  ]);

  // Merge and dedupe by doc id, then apply client-side vertical exclusion if needed
  const map = new Map<string, any>();
  const add = (arr: any[]) => {
    arr.forEach(snap => {
      snap.forEach((d: any) => {
        if (!map.has(d.id)) map.set(d.id, { ...d.data(), id: d.id });
      });
    });
  };
  add(snaps1); add(snaps2);
  let merged = Array.from(map.values());

  if (cfg.excludeParentVerticalShaktiClient) {
    merged = merged.filter((doc: any) => doc?.parentVertical !== 'shakti-abhiyaan');
  }

  // Sort DESC by date field and truncate to pageSize; compute hasMore
  const toMsLocal = (v: any): number => {
    if (cfg.dateKind === 'number') {
      if (typeof v === 'number') return v;
      if (typeof v === 'object' && typeof v?.seconds === 'number') return v.seconds * 1000;
      return 0;
    } else {
      if (typeof v === 'string') {
        const t = Date.parse(v);
        return isNaN(t) ? 0 : t;
      }
      return 0;
    }
  };
  merged.sort((a: any, b: any) => toMsLocal(b[cfg.dateField]) - toMsLocal(a[cfg.dateField]));

  const items = merged.slice(0, pageSize);
  const hasMore = merged.length > pageSize;
  const lastOrderValue = items.length ? Math.min(...items.map((it: any) => toMsLocal(it[cfg.dateField]))) : undefined;

  return {
    items,
    hasMore,
    nextCursor: hasMore && typeof lastOrderValue === 'number' ? { lastOrderValue } : undefined
  };
};

// END OF SCAFFOLDING
