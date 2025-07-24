// app/utils/fetchHierarchicalData.ts
// Duplicate & extend existing fetchFirebaseData functions for the hierarchical dashboard.
// NOTE: This is a scaffolding file. Metric-specific logic will be filled in during Phase 2.

import {
  getWtmSlpSummary,
} from './fetchFirebaseData';

import { CumulativeMetrics } from '../../models/hierarchicalTypes';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, QueryDocumentSnapshot } from 'firebase/firestore';
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('dateOfVisit', '>=', startDate), where('dateOfVisit', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('dateOfVisit', '>=', startDate), where('dateOfVisit', '<=', endDate));
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
    console.error('[getHierarchicalLocalIssueVideoActivity] Error:', error);
    return [];
  }
};

/**
 * Fetch Shakti Leaders for hierarchical levels
 */
const getHierarchicalShaktiLeaders = async (assemblies?: string[], dateRange?: { startDate: string; endDate: string }, handler_id?: string): Promise<any[]> => {
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

    return Array.from(activitiesMap.values());
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      centralQuery = query(centralQuery, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      assemblyQuery = query(assemblyQuery, where('date_submitted', '>=', startDate), where('date_submitted', '<=', endDate));
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
    
    // Parallel fetch all 14 metrics for performance using hierarchical functions
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
      chaupals, 
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
      getHierarchicalChaupals(options.assemblies, options.dateRange, options.handler_id),
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
      chaupals: getResultValue(chaupals),
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
      const name = `Zone ${counter}`;
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
  try {
    // Source 1: users collection
    const q1 = query(
      collection(db, 'users'),
      where('role', '==', 'Assembly Coordinator'),
      where('assembly', '==', assembly)
    );
    const snap1 = await getDocs(q1);
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

    // Add date filter if provided
    if (options.dateRange) {
      const startDate = new Date(options.dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(options.dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('dateOfVisit', '>=', startDate), where('dateOfVisit', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('dateOfVisit', '>=', startDate), where('dateOfVisit', '<=', endDate));
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

    // Add date filter if provided
    if (options.dateRange) {
      const startDate = new Date(options.dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(options.dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      baseQuery1 = query(baseQuery1, where('dateOfVisit', '>=', startDate), where('dateOfVisit', '<=', endDate));
      baseQuery2 = query(baseQuery2, where('dateOfVisit', '>=', startDate), where('dateOfVisit', '<=', endDate));
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

    // Add date filter if provided
    if (options.dateRange) {
      const startDate = new Date(options.dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(options.dateRange.endDate);
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
    case 'videos':
      return fetchDetailedVideos(options);
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
