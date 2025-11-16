import { collection, query, where, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import { 
  TrainingRecord,
  TrainingFormType,
  TrainingAssemblyItem,
  TrainingZoneGroup,
  TrainingTabCounts,
  TrainingHomeSummary 
} from '../../models/trainingTypes';
import { homePageCache, CACHE_KEYS } from './cacheUtils';

/**
 * Fetch training records from Firestore filtered by form_type
 */
export async function fetchTrainingRecords(formType: TrainingFormType): Promise<TrainingRecord[]> {
  try {
    const trainingCollection = collection(db, 'training');
    const q = query(trainingCollection, where('form_type', '==', formType));
    
    console.log(`[fetchTrainingRecords] Querying for form_type: ${formType}`);
    
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    
    console.log(`[fetchTrainingRecords] Query returned ${snapshot.size} documents for ${formType}`);
    
    const records: TrainingRecord[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Debug log first few documents
      if (records.length < 3) {
        console.log(`[fetchTrainingRecords] Document ${doc.id}:`, {
          form_type: data.form_type,
          zonal: data.zonal,
          assembly: data.assembly,
          trainingStatus: data.trainingStatus
        });
      }
 
      // Ensure required fields exist and are properly typed
      const record: TrainingRecord = {
        id: doc.id,
        zonal: cleanString(data.zonal) || 'Unknown Zone',
        assembly: cleanString(data.assembly) || 'Unknown Assembly',
        assemblyCoordinator: cleanString(data.assemblyCoordinator) || 'Unknown Coordinator',
        trainingStatus: cleanString(data.trainingStatus) || 'completed',
        dateOfTraining: cleanString(data.dateOfTraining) || '',
        slpName: cleanString(data.slpName) || 'Unknown SLP',
        attendees: safeNumberParse(data.attendees),
        attendeesOtherThanClub: safeNumberParse(data.attendeesOtherThanClub),
        form_type: data.form_type as TrainingFormType,
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
      };
      
      records.push(record);
    });
    
    console.log(`[fetchTrainingRecords] Processed ${records.length} records for ${formType}`);
    return records;
  } catch (error) {
    console.error(`[fetchTrainingRecords] Error fetching ${formType} training records:`, error);
    throw new Error(`Failed to fetch ${formType} training records`);
  }
}

/**
 * Fetch training records for both form types and return counts
 */
export async function fetchTrainingTabCounts(): Promise<TrainingTabCounts> {
  try {
    const [wtmRecords, shaktiRecords] = await Promise.all([
      fetchTrainingRecords('wtm'),
      fetchTrainingRecords('shakti-data')
    ]);
    
    return {
      wtm: wtmRecords.length,
      shakti: shaktiRecords.length
    };
  } catch (error) {
    console.error('Error fetching training tab counts:', error);
    return { wtm: 0, shakti: 0 };
  }
}

/**
 * Group training records by Zonal, then by Assembly
 */
export function groupTrainingByZonal(records: TrainingRecord[]): TrainingZoneGroup[] {
  const zonalGroups = new Map<string, TrainingRecord[]>();
  
  // Group by zonal
  records.forEach(record => {
    const zonal = record.zonal || 'Unknown Zone';
    if (!zonalGroups.has(zonal)) {
      zonalGroups.set(zonal, []);
    }
    zonalGroups.get(zonal)!.push(record);
  });
  
  const result: TrainingZoneGroup[] = [];
  
  // Process each zonal group
  for (const [zonal, zonalRecords] of zonalGroups.entries()) {
    const assemblyGroups = new Map<string, TrainingRecord[]>();
    
    // Group by assembly within this zone
    zonalRecords.forEach(record => {
      const assembly = record.assembly || 'Unknown Assembly';
      if (!assemblyGroups.has(assembly)) {
        assemblyGroups.set(assembly, []);
      }
      assemblyGroups.get(assembly)!.push(record);
    });
    
    const assemblies: TrainingAssemblyItem[] = [];
    let zoneTotalAttendees = 0;
    let zoneTotalSessions = 0;
    
    // Process each assembly group
    for (const [assembly, assemblyRecords] of assemblyGroups.entries()) {
      // Sort sessions by date (newest first)
      const sortedRecords = sortRecordsByDate(assemblyRecords);
      
      const assemblyTotalAttendees = sortedRecords.reduce(
        (sum, record) => sum + computeTotalAttendees(record), 
        0
      );
      
      const latestDate = getLatestTrainingDate(sortedRecords);
      
      assemblies.push({
        assembly,
        items: sortedRecords,
        totalAttendees: assemblyTotalAttendees,
        latestDate,
        sessionCount: sortedRecords.length
      });
      
      zoneTotalAttendees += assemblyTotalAttendees;
      zoneTotalSessions += sortedRecords.length;
    }
    
    // Sort assemblies alphabetically
    assemblies.sort((a, b) => a.assembly.localeCompare(b.assembly));
    
    result.push({
      zonal,
      assemblies,
      totals: {
        sessions: zoneTotalSessions,
        attendees: zoneTotalAttendees,
        assembliesCount: assemblies.length
      }
    });
  }
  
  // Sort zones alphabetically
  result.sort((a, b) => a.zonal.localeCompare(b.zonal));
  
  return result;
}

/**
 * Fetch lightweight Training summary for Home card with caching
 */
export async function fetchTrainingHomeSummary(forceRefresh?: boolean): Promise<TrainingHomeSummary> {
  try {
    if (forceRefresh) {
      homePageCache.delete(CACHE_KEYS.TRAINING_HOME_SUMMARY);
    }

    return await homePageCache.getOrSet(CACHE_KEYS.TRAINING_HOME_SUMMARY, async () => {
      // Fetch both forms in parallel
      const [wtmRecords, shaktiRecords] = await Promise.all([
        fetchTrainingRecords('wtm'),
        fetchTrainingRecords('shakti-data')
      ]);

      const all = [...wtmRecords, ...shaktiRecords];

      // Aggregate metrics
      const totalSessions = all.length;
      const wtmSessions = wtmRecords.length;
      const shaktiSessions = shaktiRecords.length;
      const totalAttendees = all.reduce((sum, r) => sum + computeTotalAttendees(r), 0);
      const totalAssemblies = new Set(all.map(r => (r.assembly || 'Unknown Assembly'))).size;
      const totalZones = new Set(all.map(r => (r.zonal || 'Unknown Zone'))).size;

      const summary: TrainingHomeSummary = {
        totalSessions,
        wtmSessions,
        shaktiSessions,
        totalAttendees,
        totalAssemblies,
        totalZones
      };

      console.log('[fetchTrainingHomeSummary] Fresh data:', summary);
      return summary;
    });
  } catch (error) {
    console.error('[fetchTrainingHomeSummary] Error:', error);
    return {
      totalSessions: 0,
      wtmSessions: 0,
      shaktiSessions: 0,
      totalAttendees: 0,
      totalAssemblies: 0,
      totalZones: 0
    };
  }
}

/**
 * Compute total attendees for a training record
 */
export function computeTotalAttendees(record: TrainingRecord): number {
  return (record.attendees || 0) + (record.attendeesOtherThanClub || 0);
}

/**
 * Parse training date string with multiple format support
 */
export function parseTrainingDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  const cleanDate = dateStr.trim();
  if (!cleanDate) {
    return null;
  }
  
  // Try different date formats
  const formats = [
    // YYYY-MM-DD (ISO format)
    /^\d{4}-\d{2}-\d{2}$/,
    // DD/MM/YYYY
    /^\d{2}\/\d{2}\/\d{4}$/,
    // MM/DD/YYYY
    /^\d{2}\/\d{2}\/\d{4}$/,
    // DD-MM-YYYY
    /^\d{2}-\d{2}-\d{4}$/
  ];
  
  try {
    // ISO format
    if (formats[0].test(cleanDate)) {
      return new Date(cleanDate + 'T00:00:00');
    }
    
    // DD/MM/YYYY or DD-MM-YYYY
    if (formats[1].test(cleanDate) || formats[3].test(cleanDate)) {
      const separator = cleanDate.includes('/') ? '/' : '-';
      const [day, month, year] = cleanDate.split(separator);
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try parsing as-is (fallback)
    const parsed = new Date(cleanDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.warn('Failed to parse date:', cleanDate, error);
    return null;
  }
}

/**
 * Format date for display
 */
export function formatTrainingDate(dateStr: string): string {
  const parsed = parseTrainingDate(dateStr);
  if (!parsed) {
    return dateStr || '—';
  }
  
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Get the latest training date from records
 */
function getLatestTrainingDate(records: TrainingRecord[]): Date | null {
  let latest: Date | null = null;
  
  for (const record of records) {
    const date = parseTrainingDate(record.dateOfTraining);
    if (date && (!latest || date > latest)) {
      latest = date;
    }
  }
  
  return latest;
}

/**
 * Sort records by date (newest first), with null dates at the end
 */
function sortRecordsByDate(records: TrainingRecord[]): TrainingRecord[] {
  return [...records].sort((a, b) => {
    const dateA = parseTrainingDate(a.dateOfTraining);
    const dateB = parseTrainingDate(b.dateOfTraining);
    
    // Null dates go to the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    // Sort by date descending (newest first)
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Clean string value with fallback
 */
function cleanString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Safely parse number with fallback to 0
 */
function safeNumberParse(value: any): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}
