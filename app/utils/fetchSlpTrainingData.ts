import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { SlpTrainingRecord, SlpTrainingAssemblyGroup, SlpTrainingSummary, SlpTrainingPageData } from '../../models/slpTrainingTypes';

/**
 * Fetch all SLP training records from Firestore
 */
export async function fetchAllSlpTrainingRecords(): Promise<SlpTrainingRecord[]> {
  try {
    console.log('[fetchSlpTrainingData] Fetching all SLP training records...');
    
    const slpTrainingCollection = collection(db, 'slp_training');
    const snapshot = await getDocs(slpTrainingCollection);
    const records: SlpTrainingRecord[] = [];
    
    snapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      } as SlpTrainingRecord);
    });
    
    // Sort in memory to avoid composite indexes
    const sorted = records
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.assembly.localeCompare(b.assembly));

    console.log(`[fetchSlpTrainingData] Retrieved ${sorted.length} SLP training records`);
    return sorted;
  } catch (error) {
    console.error('[fetchSlpTrainingData] Error fetching SLP training records:', error);
    throw error;
  }
}

/**
 * Fetch SLP training records for a specific assembly
 */
export async function fetchSlpTrainingByAssembly(assembly: string): Promise<SlpTrainingRecord[]> {
  try {
    console.log(`[fetchSlpTrainingData] Fetching SLP training records for assembly: ${assembly}`);
    
    const slpTrainingCollection = collection(db, 'slp_training');
    const q = query(
      slpTrainingCollection,
      where('assembly', '==', assembly)
    );

    const snapshot = await getDocs(q);
    const records: SlpTrainingRecord[] = [];
    
    snapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      } as SlpTrainingRecord);
    });
    
    // Sort in memory
    const sorted = records.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[fetchSlpTrainingData] Retrieved ${sorted.length} SLP training records for ${assembly}`);
    return sorted;
  } catch (error) {
    console.error(`[fetchSlpTrainingData] Error fetching SLP training records for ${assembly}:`, error);
    throw error;
  }
}

/**
 * Group SLP training records by assembly
 */
export function groupSlpTrainingByAssembly(records: SlpTrainingRecord[]): SlpTrainingAssemblyGroup[] {
  const grouped = records.reduce((acc, record) => {
    if (!acc[record.assembly]) {
      acc[record.assembly] = [];
    }
    acc[record.assembly].push(record);
    return acc;
  }, {} as Record<string, SlpTrainingRecord[]>);

  return Object.entries(grouped)
    .map(([assembly, slps]) => ({
      assembly,
      slpCount: slps.length,
      slps: slps.sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => a.assembly.localeCompare(b.assembly));
}

/**
 * Calculate summary statistics from SLP training records
 */
export function calculateSlpTrainingSummary(records: SlpTrainingRecord[]): SlpTrainingSummary {
  const statusCounts = records.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const assemblies = new Set(records.map(r => r.assembly));

  return {
    totalSlps: records.length,
    totalAssemblies: assemblies.size,
    trainedCount: statusCounts.trained || 0,
    pendingCount: statusCounts.pending || 0,
    inProgressCount: statusCounts['in-progress'] || 0
  };
}

/**
 * Fetch complete SLP training page data (summary + grouped by assembly)
 */
export async function fetchSlpTrainingPageData(): Promise<SlpTrainingPageData> {
  try {
    console.log('[fetchSlpTrainingData] Fetching complete SLP training page data...');
    
    const records = await fetchAllSlpTrainingRecords();
    const summary = calculateSlpTrainingSummary(records);
    const assemblies = groupSlpTrainingByAssembly(records);
    
    console.log('[fetchSlpTrainingData] Successfully processed SLP training data:', {
      totalRecords: records.length,
      totalAssemblies: assemblies.length,
      summary
    });
    
    return {
      summary,
      assemblies
    };
  } catch (error) {
    console.error('[fetchSlpTrainingData] Error fetching SLP training page data:', error);
    throw error;
  }
}

/**
 * Fetch SLP training summary for home page card
 */
export async function fetchSlpTrainingSummary(): Promise<SlpTrainingSummary> {
  try {
    console.log('[fetchSlpTrainingData] Fetching SLP training summary for home page...');
    
    const records = await fetchAllSlpTrainingRecords();
    const summary = calculateSlpTrainingSummary(records);
    
    console.log('[fetchSlpTrainingData] SLP training summary:', summary);
    return summary;
  } catch (error) {
    console.error('[fetchSlpTrainingData] Error fetching SLP training summary:', error);
    // Return default values on error to prevent home page crash
    return {
      totalSlps: 0,
      totalAssemblies: 0,
      trainedCount: 0,
      pendingCount: 0,
      inProgressCount: 0
    };
  }
}
