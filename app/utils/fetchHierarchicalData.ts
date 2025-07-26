// app/utils/fetchHierarchicalData.ts
// Duplicate & extend existing fetchFirebaseData functions for the hierarchical dashboard.
// NOTE: This is a scaffolding file. Metric-specific logic will be filled in during Phase 2.

import {
  getWtmSlpSummary,
} from './fetchFirebaseData';

import { CumulativeMetrics } from '../../models/hierarchicalTypes';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, QueryDocumentSnapshot, limit } from 'firebase/firestore';
import { createAppError, logError, getFirebaseErrorCode, validateDateRange, validateAssemblyData, ERROR_CODES } from './errorUtils';

/**
 * Fetches cumulative metric data for the given scope (zone / assembly / AC / SLP).
 * Currently returns zeroes; will be implemented in Phase 2.
 */
export interface FetchMetricsOptions {
  assemblies?: string[];
  dateRange?: { startDate: string; endDate: string };
  handler_id?: string;
  level: 'zone' | 'assembly' | 'ac' | 'slp';
}

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

    // Add assembly filter only if assemblies provided
    if (assemblies && assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', assemblies));
    }

    // Add handler_id filter if provided (for AC/SLP level)
    if (handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', handler_id));
    }

    // Add date filter if provided
    if (dateRange) {
      // Use string comparison for dateOfVisit field (format: "2025-07-14")
      const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
      const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format
      
      console.log('[getHierarchicalMemberActivity] Filtering by dateOfVisit:', startDateStr, 'to', endDateStr);
      
      baseQuery1 = query(baseQuery1, where('dateOfVisit', '>=', startDateStr), where('dateOfVisit', '<=', endDateStr));
      baseQuery2 = query(baseQuery2, where('dateOfVisit', '>=', startDateStr), where('dateOfVisit', '<=', endDateStr));
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
    console.log(`[getHierarchicalMemberActivity] Final result count: ${result.length}`);
    return result;
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
      // Convert coordinator date range (YYYY-MM-DD) to ISO strings for createdAt field
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;
      
      console.log('[getHierarchicalPanchayatWaActivity] Filtering by createdAt:', startDateISO, 'to', endDateISO);
      
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

    // if (dateRange) {
    //   // Use string comparison for 'date' field (format: "2025-07-17")
    //   const startDateStr = dateRange.startDate; // Already in YYYY-MM-DD format
    //   const endDateStr = dateRange.endDate;     // Already in YYYY-MM-DD format
      
    //   console.log('[getHierarchicalMaiBahinYojnaActivity] Filtering by date:', startDateStr, 'to', endDateStr);
      
    //   baseQuery1 = query(baseQuery1, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
    //   baseQuery2 = query(baseQuery2, where('date', '>=', startDateStr), where('date', '<=', endDateStr));
    // }

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

    return Array.from(activitiesMap.values());
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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
              coveredAssemblies: coveredAssemblies // Store for reference
            });
          });
        }
      });
    });
    
    console.log(`[getHierarchicalShaktiLeaders] Found ${slpsList.length} Shakti SLPs`);
    return slpsList;
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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

    let result = Array.from(activitiesMap.values());
    
    // Apply date filtering in JavaScript for meetingDate field (DD-MM-YYYY format)
    if (dateRange) {
      console.log('[getHierarchicalShaktiBaithaks] Applying date filter for meetingDate (DD-MM-YYYY):', dateRange);
      
      // Helper function to convert DD-MM-YYYY to YYYY-MM-DD for comparison
      const convertToComparableDate = (ddmmyyyy: string): string => {
        if (!ddmmyyyy || typeof ddmmyyyy !== 'string') return '';
        const parts = ddmmyyyy.split('-');
        if (parts.length !== 3) return '';
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };
      
      const startDateComparable = dateRange.startDate; // Already YYYY-MM-DD
      const endDateComparable = dateRange.endDate;     // Already YYYY-MM-DD
      
      result = result.filter((doc) => {
        if (!doc.meetingDate) return false;
        const docDateComparable = convertToComparableDate(doc.meetingDate);
        if (!docDateComparable) return false;
        return docDateComparable >= startDateComparable && docDateComparable <= endDateComparable;
      });
      
      console.log(`[getHierarchicalShaktiBaithaks] Filtered ${result.length} baithaks by date range`);
    }
    
    return result;
  } catch (error) {
    console.error('[getHierarchicalShaktiBaithaks] Error:', error);
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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

    let result = Array.from(activitiesMap.values());
    
    // Apply date filtering in JavaScript for meetingDate field (DD-MM-YYYY format)
    if (dateRange) {
      console.log('[getHierarchicalChaupals] Applying date filter for meetingDate (DD-MM-YYYY):', dateRange);
      
      // Helper function to convert DD-MM-YYYY to YYYY-MM-DD for comparison
      const convertToComparableDate = (ddmmyyyy: string): string => {
        if (!ddmmyyyy || typeof ddmmyyyy !== 'string') return '';
        const parts = ddmmyyyy.split('-');
        if (parts.length !== 3) return '';
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };
      
      const startDateComparable = dateRange.startDate; // Already YYYY-MM-DD
      const endDateComparable = dateRange.endDate;     // Already YYYY-MM-DD
      
      result = result.filter((doc) => {
        if (!doc.meetingDate) return false;
        const docDateComparable = convertToComparableDate(doc.meetingDate);
        if (!docDateComparable) return false;
        return docDateComparable >= startDateComparable && docDateComparable <= endDateComparable;
      });
      
      console.log(`[getHierarchicalChaupals] Filtered ${result.length} chaupals by date range`);
    }
    
    return result;
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
      // Convert coordinator date range (YYYY-MM-DD) to ISO strings for createdAt field
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;
      
      console.log('[getHierarchicalCentralWaGroups] Filtering by createdAt:', startDateISO, 'to', endDateISO);
      
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
 * Fetch Assembly WA Groups for hierarchical levels
 */
const getHierarchicalAssemblyWaGroups = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
  try {
    const wtmSlpCollection = collection(db, 'wtm-slp');
    let assemblyQuery = query(wtmSlpCollection, where('form_type', '==', 'assembly-wa'));

    if (assemblies && assemblies.length > 0) {
      assemblyQuery = query(assemblyQuery, where('assembly', 'in', assemblies));
    }

    if (handler_id) {
      assemblyQuery = query(assemblyQuery, where('handler_id', '==', handler_id));
    }

    if (dateRange) {
      // Convert coordinator date range (YYYY-MM-DD) to ISO strings for createdAt field
      const startDateISO = `${dateRange.startDate}T00:00:00.000Z`;
      const endDateISO = `${dateRange.endDate}T23:59:59.999Z`;
      
      console.log('[getHierarchicalAssemblyWaGroups] Filtering by createdAt:', startDateISO, 'to', endDateISO);
      
      assemblyQuery = query(assemblyQuery, where('createdAt', '>=', startDateISO), where('createdAt', '<=', endDateISO));
    }

    const assemblySnap = await getDocs(assemblyQuery);
    const results: any[] = [];

    assemblySnap.forEach((doc) => {
      results.push({ ...doc.data(), id: doc.id, source: 'assembly' });
    });

    return results;
  } catch (error) {
    console.error('[getHierarchicalAssemblyWaGroups] Error:', error);
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('date', '>=', startDate), where('date', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('date', '>=', startDate), where('date', '<=', endDate));
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
    console.error('[getHierarchicalTrainingActivity] Error:', error);
    return [];
  }
};

export const fetchCumulativeMetrics = async (options: FetchMetricsOptions): Promise<CumulativeMetrics> => {
  try {
    console.log('[fetchCumulativeMetrics] Starting with options:', options);
    console.log('[fetchCumulativeMetrics] Assemblies:', options.assemblies);
    console.log('[fetchCumulativeMetrics] Handler ID:', options.handler_id);
    
    // Validate input parameters
    if (options.assemblies && options.assemblies.length > 0) {
      validateAssemblyData(options.assemblies);
    }
    
    if (options.dateRange) {
      validateDateRange(options.dateRange.startDate, options.dateRange.endDate);
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
      videos, 
      acVideos,
      chaupals, 
      shaktiBaithaks,
      centralWaGroups, 
      assemblyWaGroups
    ] = await Promise.allSettled([
      getWtmSlpSummary(options.dateRange?.startDate, options.dateRange?.endDate, options.assemblies),
      getHierarchicalMemberActivity(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalShaktiLeaders(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalShaktiSaathi(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalPanchayatWaActivity(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalShaktiClubs(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalMaiBahinYojnaActivity(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalShaktiForms(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalLocalIssueVideoActivity(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalAcVideos(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalChaupals(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalShaktiBaithaks(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalCentralWaGroups(options.assemblies, options.dateRange, options.handler_id),
      getHierarchicalAssemblyWaGroups(options.assemblies, options.dateRange, options.handler_id),
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
      acVideos: getResultValue(acVideos),
      chaupals: getResultValue(chaupals),
      shaktiBaithaks: getResultValue(shaktiBaithaks),
      centralWaGroups: getResultValue(centralWaGroups),
      assemblyWaGroups: getResultValue(assemblyWaGroups),
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
 * Assumes users collection stores Zonal Incharges with `role` === 'Zonal Incharge' and has `zoneId` & `zoneName` fields.
 */
export const fetchZones = async (): Promise<Zone[]> => {
  try {
    const q = query(collection(db, 'admin-users'), where('role', '==', 'zonal-incharge'));
    const snap = await getDocs(q);
    const zones: Zone[] = [];
    let counter = 0;
    snap.forEach((d: QueryDocumentSnapshot) => {
      counter += 1;
      const data = d.data() as any;
      const id = d.id;
      const assemblies: string[] = data.assemblies || [];
      const zonalName: string = data.name ? String(data.name) : 'Unknown';
      const name = `Zone ${counter} - ${zonalName}`;
      zones.push({ id, name, assemblies });
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
 * Fetch Assembly Coordinators for a given assembly.
 * Returns array of { uid, name, assembly }.
 */
export const fetchAssemblyCoordinators = async (assembly: string): Promise<AC[]> => {
  if (!assembly) return [];
  console.log('[fetchAssemblyCoordinators] Fetching ACs for assembly:', assembly);
  try {
    // Source 1: users collection
    const q1 = query(
      collection(db, 'users'),
      where('role', '==', 'Assembly Coordinator'),
      where('assembly', '==', assembly)
    );
    const snap1 = await getDocs(q1);
    console.log('[fetchAssemblyCoordinators] Users query returned', snap1.size, 'documents');
    const list: AC[] = [];
    
    snap1.forEach((d) => {
      const data = d.data() as any;
      list.push({ 
        uid: d.id, 
        name: data.name || 'AC', 
        assembly,
        handler_id: data.handler_id 
      });
    });
    
    // If no Assembly Coordinators found, try Zonal Incharge
    if (list.length === 0) {
      const q1b = query(
        collection(db, 'users'),
        where('role', '==', 'Zonal Incharge'),
        where('assembly', '==', assembly)
      );
      const snap1b = await getDocs(q1b);
      console.log('[fetchAssemblyCoordinators] Zonal Incharge query returned', snap1b.size, 'documents');
      
      snap1b.forEach((d) => {
        const data = d.data() as any;
        list.push({ 
          uid: d.id, 
          name: data.name || 'ZI', 
          assembly,
          handler_id: data.handler_id 
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
        if (coord.assembly === assembly) {
          // Avoid duplicates
          if (!list.find(ac => ac.uid === coord.id)) {
            list.push({
              uid: coord.id,
              name: coord.name || 'AC',
              assembly,
              handler_id: coord.handler_id
            });
          }
        }
      });
    });
    
    snap2.forEach((d) => {
      const data = d.data() as any;
      const coordinators = data.coveredAssemblyCoordinators || [];
      coordinators.forEach((coord: any) => {
        if (coord.assembly === assembly) {
          // Avoid duplicates
          if (!list.find(ac => ac.uid === coord.id)) {
            list.push({
              uid: coord.id,
              name: coord.name || 'AC',
              assembly,
              handler_id: coord.handler_id
            });
          }
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
            if (userSnap.exists()) {
              const udata = userSnap.data() as any;
              list.push({
                uid: hid,
                name: udata.name || 'AC',
                assembly, // Use the assembly we're querying for, not user's assembly field
                handler_id: udata.handler_id || hid,
              });
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
 * Fetch SLPs / ASLPs under a given Assembly Coordinator.
 */
export const fetchSlpsForAc = async (acId: string): Promise<SLP[]> => {
  if (!acId) return [];
  try {
    const list: SLP[] = [];
    
    // Source 1: Associated SLPs from shakti-abhiyaan coveredAssemblyCoordinators
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
      if (data.recommendedPersonName && !list.find(slp => slp.name === data.recommendedPersonName)) {
        list.push({
          uid: d.id,
          name: data.recommendedPersonName,
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

    // Add assembly filter if provided
    if (options.assemblies && options.assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', options.assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', options.assemblies));
    }

    // Add handler_id filter if provided (for AC/SLP level)
    if (options.handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', options.handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', options.handler_id));
    }

    // Add date filter if provided - meetings use dateOfVisit field with string format "YYYY-MM-DD"
    if (options.dateRange) {
      console.log('[fetchDetailedMeetings] Applying date filter:', options.dateRange);
      
      baseQuery1 = query(baseQuery1, where('dateOfVisit', '>=', options.dateRange.startDate), where('dateOfVisit', '<=', options.dateRange.endDate));
      baseQuery2 = query(baseQuery2, where('dateOfVisit', '>=', options.dateRange.startDate), where('dateOfVisit', '<=', options.dateRange.endDate));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const meetingsMap = new Map();
    
    snap1.forEach((doc) => {
      if (!meetingsMap.has(doc.id)) {
        meetingsMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });
    
    snap2.forEach((doc) => {
      if (!meetingsMap.has(doc.id)) {
        meetingsMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(meetingsMap.values());
    console.log(`[fetchDetailedMeetings] Found ${result.length} meetings`);
    return result;
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

    // Add assembly filter if provided
    if (options.assemblies && options.assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', options.assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', options.assemblies));
    }

    // Add handler_id filter if provided (for AC/SLP level)
    if (options.handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', options.handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', options.handler_id));
    }

    // Add date filter if provided - members use dateOfVisit field with string format "YYYY-MM-DD"
    if (options.dateRange) {
      console.log('[fetchDetailedMembers] Applying date filter:', options.dateRange);
      
      baseQuery1 = query(baseQuery1, where('dateOfVisit', '>=', options.dateRange.startDate), where('dateOfVisit', '<=', options.dateRange.endDate));
      baseQuery2 = query(baseQuery2, where('dateOfVisit', '>=', options.dateRange.startDate), where('dateOfVisit', '<=', options.dateRange.endDate));
    }

    const [snap1, snap2] = await Promise.all([getDocs(baseQuery1), getDocs(baseQuery2)]);
    const membersMap = new Map();
    
    snap1.forEach((doc) => {
      if (!membersMap.has(doc.id)) {
        membersMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });
    
    snap2.forEach((doc) => {
      if (!membersMap.has(doc.id)) {
        membersMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });

    const result = Array.from(membersMap.values());
    console.log(`[fetchDetailedMembers] Found ${result.length} members`);
    return result;
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

    // Add assembly filter if provided
    if (options.assemblies && options.assemblies.length > 0) {
      baseQuery1 = query(baseQuery1, where('assembly', 'in', options.assemblies));
      baseQuery2 = query(baseQuery2, where('assembly', 'in', options.assemblies));
    }

    // Add handler_id filter if provided (for AC/SLP level)
    if (options.handler_id) {
      baseQuery1 = query(baseQuery1, where('handler_id', '==', options.handler_id));
      baseQuery2 = query(baseQuery2, where('handler_id', '==', options.handler_id));
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

    let result = Array.from(videosMap.values());
    
    // Apply JavaScript date filtering if provided - videos use date_submitted field
    if (options.dateRange) {
      console.log('[fetchDetailedVideos] Applying JavaScript date filter:', options.dateRange);
      
      const startDateObj = new Date(options.dateRange.startDate);
      const endDateObj = new Date(options.dateRange.endDate);
      endDateObj.setHours(23, 59, 59, 999); // Include entire end day
      
      result = result.filter((doc) => {
        if (!doc.date_submitted) {
          console.log(`[fetchDetailedVideos] Document ${doc.id} has no date_submitted field, excluding`);
          return false;
        }
        const docDate = new Date(doc.date_submitted);
        const isInRange = docDate >= startDateObj && docDate <= endDateObj;
        if (!isInRange) {
          console.log(`[fetchDetailedVideos] Document ${doc.id} date ${doc.date_submitted} is outside range, excluding`);
        }
        return isInRange;
      });
      
      console.log(`[fetchDetailedVideos] Filtered to ${result.length} videos by date range`);
    }
    
    console.log(`[fetchDetailedVideos] Found ${result.length} videos`);
    return result;
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
    default:
      console.warn(`[fetchDetailedData] Unknown metric type: ${metricType}`);
      return [];
  }
};

// END OF SCAFFOLDING
