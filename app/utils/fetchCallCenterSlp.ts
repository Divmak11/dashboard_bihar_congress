import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { SlpIdentificationRecord, SlpIdentificationSummary, SlpIdentificationMetrics } from '../../models/callCenterSlpTypes';

/**
 * Fetch all SLP Identification records from Firestore
 * @param assemblies - Optional array of assemblies to filter by
 * @param sheetSource - Optional filter by sheet source ('old_applicant' | 'slp_applicant' | 'slp_missed_call')
 * @returns Array of SLP Identification records
 */
export async function fetchSlpIdentificationRecords(
  assemblies?: string[],
  sheetSource?: 'old_applicant' | 'slp_applicant' | 'slp_missed_call'
): Promise<SlpIdentificationRecord[]> {
  try {
    const collectionRef = collection(db, 'call_center_slp_identification');
    let q = query(collectionRef);

    // Add filters if provided
    if (sheetSource) {
      q = query(q, where('sheet_source', '==', sheetSource));
    }

    if (assemblies && assemblies.length > 0) {
      // Firestore 'in' operator supports up to 10 values
      if (assemblies.length <= 10) {
        q = query(q, where('assembly', 'in', assemblies));
      } else {
        // For more than 10 assemblies, we'll need to fetch all and filter client-side
        console.warn('[fetchSlpIdentificationRecords] More than 10 assemblies, using client-side filtering');
      }
    }

    const snapshot = await getDocs(q);
    let records: SlpIdentificationRecord[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as SlpIdentificationRecord;
      records.push({
        ...data,
        id: doc.id,
      });
    });

    // Client-side filtering for >10 assemblies
    if (assemblies && assemblies.length > 10) {
      const assemblySet = new Set(assemblies);
      records = records.filter(r => r.assembly && assemblySet.has(r.assembly));
    }

    console.log(`[fetchSlpIdentificationRecords] Fetched ${records.length} records`);
    return records;
  } catch (error) {
    console.error('[fetchSlpIdentificationRecords] Error:', error);
    throw error;
  }
}

/**
 * Fetch summary metrics for SLP Identification data
 * @param assemblies - Optional array of assemblies to filter by
 * @returns Summary with counts by source and top assemblies
 */
export async function fetchSlpIdentificationSummary(
  assemblies?: string[]
): Promise<SlpIdentificationSummary> {
  try {
    const records = await fetchSlpIdentificationRecords(assemblies);

    // Count by sheet source
    const oldApplicant = records.filter(r => r.sheet_source === 'old_applicant').length;
    const slpApplicant = records.filter(r => r.sheet_source === 'slp_applicant').length;
    const slpMissedCall = records.filter(r => r.sheet_source === 'slp_missed_call').length;

    // Count by assembly
    const assemblyCountMap: Record<string, number> = {};
    records.forEach(r => {
      if (r.assembly) {
        assemblyCountMap[r.assembly] = (assemblyCountMap[r.assembly] || 0) + 1;
      }
    });

    // Get top assemblies
    const topAssemblies = Object.entries(assemblyCountMap)
      .map(([assembly, count]) => ({ assembly, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRecords: records.length,
      oldApplicant,
      slpApplicant,
      slpMissedCall,
      uniqueAssemblies: Object.keys(assemblyCountMap).length,
      topAssemblies,
    };
  } catch (error) {
    console.error('[fetchSlpIdentificationSummary] Error:', error);
    return {
      totalRecords: 0,
      oldApplicant: 0,
      slpApplicant: 0,
      slpMissedCall: 0,
      uniqueAssemblies: 0,
      topAssemblies: [],
    };
  }
}

/**
 * Fetch detailed metrics for SLP Identification data
 * @param assemblies - Optional array of assemblies to filter by
 * @returns Detailed metrics breakdown
 */
export async function fetchSlpIdentificationMetrics(
  assemblies?: string[]
): Promise<SlpIdentificationMetrics> {
  try {
    const records = await fetchSlpIdentificationRecords(assemblies);

    // Count by source
    const bySource = {
      old_applicant: records.filter(r => r.sheet_source === 'old_applicant').length,
      slp_applicant: records.filter(r => r.sheet_source === 'slp_applicant').length,
      slp_missed_call: records.filter(r => r.sheet_source === 'slp_missed_call').length,
    };

    // Count by assembly
    const byAssembly: Record<string, number> = {};
    records.forEach(r => {
      if (r.assembly) {
        byAssembly[r.assembly] = (byAssembly[r.assembly] || 0) + 1;
      }
    });

    return {
      total: records.length,
      bySource,
      byAssembly,
    };
  } catch (error) {
    console.error('[fetchSlpIdentificationMetrics] Error:', error);
    return {
      total: 0,
      bySource: {
        old_applicant: 0,
        slp_applicant: 0,
        slp_missed_call: 0,
      },
      byAssembly: {},
    };
  }
}

/**
 * Search SLP Identification records by name or phone
 * @param searchTerm - Name or phone number to search for
 * @param assemblies - Optional array of assemblies to filter by
 * @returns Array of matching records
 */
export async function searchSlpIdentificationRecords(
  searchTerm: string,
  assemblies?: string[]
): Promise<SlpIdentificationRecord[]> {
  try {
    const records = await fetchSlpIdentificationRecords(assemblies);
    const normalizedSearch = searchTerm.toLowerCase().trim();

    return records.filter(r => {
      const name = r['Name']?.toLowerCase() || '';
      const phone = r['Mobile Number']?.toString() || '';
      
      return name.includes(normalizedSearch) || phone.includes(normalizedSearch);
    });
  } catch (error) {
    console.error('[searchSlpIdentificationRecords] Error:', error);
    return [];
  }
}
