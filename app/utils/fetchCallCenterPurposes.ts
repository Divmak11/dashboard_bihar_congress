import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { CallCenterPurposeRecord, CallCenterPurposeSummary, CallCenterPurposeFormType } from '../../models/callCenterPurposesTypes';

/**
 * Fetch all Call Center Purpose records from Firestore
 * @param formType - Optional filter by form type
 * @param assemblies - Optional array of assemblies to filter by
 * @returns Array of Call Center Purpose records
 */
export async function fetchCallCenterPurposeRecords(
  formType?: CallCenterPurposeFormType,
  assemblies?: string[]
): Promise<CallCenterPurposeRecord[]> {
  try {
    const collectionRef = collection(db, 'call_center_purposes');
    let q = query(collectionRef);

    // Add filters if provided
    if (formType) {
      q = query(q, where('form_type', '==', formType));
    }

    if (assemblies && assemblies.length > 0) {
      // Firestore 'in' operator supports up to 10 values
      if (assemblies.length <= 10) {
        q = query(q, where('assembly', 'in', assemblies));
      } else {
        console.warn('[fetchCallCenterPurposeRecords] More than 10 assemblies, using client-side filtering');
      }
    }

    const snapshot = await getDocs(q);
    let records: CallCenterPurposeRecord[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as CallCenterPurposeRecord;
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

    console.log(`[fetchCallCenterPurposeRecords] Fetched ${records.length} records`);
    return records;
  } catch (error) {
    console.error('[fetchCallCenterPurposeRecords] Error:', error);
    throw error;
  }
}

/**
 * Fetch summary metrics for all Call Center Purpose data
 * @param assemblies - Optional array of assemblies to filter by
 * @returns Summary with counts by form type and top assemblies
 */
export async function fetchCallCenterPurposeSummary(
  assemblies?: string[]
): Promise<CallCenterPurposeSummary> {
  try {
    const records = await fetchCallCenterPurposeRecords(undefined, assemblies);

    // Count by form type
    const wtm = records.filter(r => r.form_type === 'wtm').length;
    const prnd = records.filter(r => r.form_type === 'prnd').length;
    const donor = records.filter(r => r.form_type === 'donor').length;
    const aggregator = records.filter(r => r.form_type === 'aggregator').length;
    const digitalMembership1 = records.filter(r => r.form_type === 'digital membership 1').length;

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
      wtm,
      prnd,
      donor,
      aggregator,
      digitalMembership1,
      uniqueAssemblies: Object.keys(assemblyCountMap).length,
      topAssemblies,
    };
  } catch (error) {
    console.error('[fetchCallCenterPurposeSummary] Error:', error);
    return {
      totalRecords: 0,
      wtm: 0,
      prnd: 0,
      donor: 0,
      aggregator: 0,
      digitalMembership1: 0,
      uniqueAssemblies: 0,
      topAssemblies: [],
    };
  }
}

/**
 * Search Call Center Purpose records by name or phone
 * @param searchTerm - Name or phone number to search for
 * @param formType - Optional filter by form type
 * @param assemblies - Optional array of assemblies to filter by
 * @returns Array of matching records
 */
export async function searchCallCenterPurposeRecords(
  searchTerm: string,
  formType?: CallCenterPurposeFormType,
  assemblies?: string[]
): Promise<CallCenterPurposeRecord[]> {
  try {
    const records = await fetchCallCenterPurposeRecords(formType, assemblies);
    const normalizedSearch = searchTerm.toLowerCase().trim();

    return records.filter(r => {
      const name = r.Name?.toLowerCase() || '';
      const phone = r['Mobile Number']?.toString() || '';
      
      return name.includes(normalizedSearch) || phone.includes(normalizedSearch);
    });
  } catch (error) {
    console.error('[searchCallCenterPurposeRecords] Error:', error);
    return [];
  }
}
