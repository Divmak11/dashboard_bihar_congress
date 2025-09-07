import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Date filter interface
 */
export interface DateFilter {
  startDate: string;
  endDate: string;
  label?: string;
}

/**
 * Interface for attendance check result
 */
export interface AttendanceResult {
  acId: string;
  isUnavailable: boolean;
  attendanceDate?: Date;
}

/**
 * Interface for assembly work determination result
 */
export interface AssemblyWorkResult {
  acId: string;
  workedAssembly: string | null;
  meetingCount: number;
  allAssignedAssemblies: string[];
}

/**
 * Check attendance for ACs on a specific date
 * If an attendance document exists for an AC on the given date, they are marked unavailable
 * 
 * @param acIds - Array of AC document IDs to check
 * @param dateFilter - Date filter for the report
 * @returns Map of AC ID to attendance status
 */
export async function checkACAttendance(
  acIds: string[],
  dateFilter: DateFilter
): Promise<Map<string, AttendanceResult>> {
  console.log(`[checkACAttendance] Checking attendance for ${acIds.length} ACs`);
  
  const attendanceMap = new Map<string, AttendanceResult>();
  
  // Initialize all ACs as available by default
  acIds.forEach(acId => {
    attendanceMap.set(acId, {
      acId,
      isUnavailable: false
    });
  });
  
  if (acIds.length === 0) {
    return attendanceMap;
  }
  
  try {
    // Get UTC day boundaries for the date filter
    const startDate = new Date(dateFilter.startDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const startTimestamp = startDate.getTime();
    
    const endDate = new Date(dateFilter.endDate);
    endDate.setUTCHours(23, 59, 59, 999);
    const endTimestamp = endDate.getTime();
    
    // Calculate total expected days in the date range
    const totalExpectedDays = Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000)) + 1;
    
    console.log(`[checkACAttendance] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`[checkACAttendance] Timestamp range: ${startTimestamp} to ${endTimestamp}`);
    console.log(`[checkACAttendance] Total expected days: ${totalExpectedDays}`);
    
    // Track attendance records per AC
    const acAttendanceCount = new Map<string, number>();
    
    // Initialize count for all ACs
    acIds.forEach(acId => {
      acAttendanceCount.set(acId, 0);
    });
    
    // Process in chunks to avoid Firebase 'in' query limit of 10
    const chunks: string[][] = [];
    for (let i = 0; i < acIds.length; i += 10) {
      chunks.push(acIds.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      // Query attendance collection
      const attendanceRef = collection(db, 'attendence'); // Note: collection name is 'attendence' not 'attendance'
      const q = query(
        attendanceRef,
        where('handler_id', 'in', chunk),
        where('created_at', '>=', startTimestamp),
        where('created_at', '<=', endTimestamp)
      );
      
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const acId = data.handler_id;
        const createdAt = data.created_at;
        
        if (acId && createdAt) {
          // Count attendance records per AC
          const currentCount = acAttendanceCount.get(acId) || 0;
          acAttendanceCount.set(acId, currentCount + 1);
        }
      });
    }
    
    // Apply inverted logic: Mark as unavailable only if attendance records exist for ALL days
    acAttendanceCount.forEach((recordCount, acId) => {
      const missingDays = totalExpectedDays - recordCount;
      
      if (missingDays > 0) {
        // AC has missing days - mark as AVAILABLE (partial presence)
        attendanceMap.set(acId, {
          acId,
          isUnavailable: false
        });
        console.log(`[checkACAttendance] AC ${acId} marked AVAILABLE - ${recordCount} records, ${missingDays} missing days (partial presence)`);
      } else {
        // AC has records for all days - mark as UNAVAILABLE (completely absent)
        attendanceMap.set(acId, {
          acId,
          isUnavailable: true,
          attendanceDate: new Date() // Use current date as fallback
        });
        console.log(`[checkACAttendance] AC ${acId} marked UNAVAILABLE - ${recordCount} records for all ${totalExpectedDays} days (completely absent)`);
      }
    });
    
    // Log summary
    const unavailableCount = Array.from(attendanceMap.values()).filter(a => a.isUnavailable).length;
    const availableCount = acIds.length - unavailableCount;
    console.log(`[checkACAttendance] Attendance check complete: ${availableCount} available, ${unavailableCount} unavailable out of ${acIds.length} ACs`);
    console.log(`[checkACAttendance] Logic: Available = missing days > 0, Unavailable = records for all ${totalExpectedDays} days`);
    
  } catch (error) {
    console.error('[checkACAttendance] Error checking attendance:', error);
    // Return default (all available) on error
  }
  
  return attendanceMap;
}

/**
 * Determine which single assembly each AC worked in on a given day
 * ACs can only work in one assembly per day based on their meeting activity
 * 
 * @param acIds - Array of AC document IDs
 * @param meetingsData - Pre-fetched meeting data from fetchDetailedMeetings
 * @param acAssemblyMap - Map of AC ID to their assigned assemblies
 * @returns Map of AC ID to the assembly they worked in
 */
export async function determineACWorkAssembly(
  acIds: string[],
  meetingsData: any[], // Meeting data already fetched
  acAssemblyMap: Map<string, string[]>
): Promise<Map<string, AssemblyWorkResult>> {
  console.log(`[determineACWorkAssembly] Determining work assembly for ${acIds.length} ACs from ${meetingsData.length} meetings`);
  
  const workAssemblyMap = new Map<string, AssemblyWorkResult>();
  
  if (acIds.length === 0) {
    return workAssemblyMap;
  }
  
  try {
    // Process each AC individually to determine their work assembly
    for (const acId of acIds) {
      const assignedAssemblies = acAssemblyMap.get(acId) || [];
      
      // Skip if AC has no assigned assemblies
      if (assignedAssemblies.length === 0) {
        console.log(`[determineACWorkAssembly] AC ${acId} has no assigned assemblies`);
        continue;
      }
      
      // Filter meetings for this AC from the pre-fetched data
      const acMeetings = meetingsData.filter(meeting => 
        meeting.handler_id === acId
      );
      
      console.log(`[determineACWorkAssembly] AC ${acId} has ${acMeetings.length} meetings in data`);
      
      // Count meetings per assembly
      const assemblyMeetingCount = new Map<string, number>();
      
      acMeetings.forEach(meeting => {
        const assembly = meeting.assembly || meeting.assemblyName;
        
        if (assembly) {
          const currentCount = assemblyMeetingCount.get(assembly) || 0;
          assemblyMeetingCount.set(assembly, currentCount + 1);
        }
      });
      
      // Determine which assembly the AC worked in
      let workedAssembly: string | null = null;
      let maxMeetings = 0;
      
      if (assemblyMeetingCount.size > 0) {
        // Find assembly with most meetings (or first if tied)
        for (const [assembly, count] of assemblyMeetingCount.entries()) {
          if (count > maxMeetings) {
            workedAssembly = assembly;
            maxMeetings = count;
          }
        }
        
        if (assemblyMeetingCount.size > 1) {
          console.log(`[determineACWorkAssembly] WARNING: AC ${acId} has meetings in multiple assemblies on same day:`, 
            Array.from(assemblyMeetingCount.entries()));
          console.log(`[determineACWorkAssembly] Using assembly with most meetings: ${workedAssembly} (${maxMeetings} meetings)`);
        } else {
          console.log(`[determineACWorkAssembly] AC ${acId} worked in ${workedAssembly} with ${maxMeetings} meetings`);
        }
      } else {
        console.log(`[determineACWorkAssembly] AC ${acId} has no meetings in data`);
      }
      
      // Store result
      workAssemblyMap.set(acId, {
        acId,
        workedAssembly,
        meetingCount: maxMeetings,
        allAssignedAssemblies: assignedAssemblies
      });
    }
    
    // Log summary
    const acsWithWork = Array.from(workAssemblyMap.values()).filter(r => r.workedAssembly !== null).length;
    console.log(`[determineACWorkAssembly] Work assembly determination complete: ${acsWithWork}/${acIds.length} ACs worked in assemblies`);
    
  } catch (error) {
    console.error('[determineACWorkAssembly] Error determining work assemblies:', error);
  }
  
  return workAssemblyMap;
}

/**
 * Apply attendance and assembly logic to filter assembly-AC combinations
 * This function determines which assembly-AC combinations should be included in the report
 * 
 * @param assemblyAcMap - Map of assembly::acId to AC data
 * @param dateFilter - Date filter for the report
 * @param meetingsData - Pre-fetched meeting data from fetchDetailedMeetings
 * @returns Updated map with filtered assembly-AC combinations
 */
export async function applyAttendanceAndAssemblyLogic(
  assemblyAcMap: Map<string, any>,
  dateFilter: DateFilter,
  meetingsData?: any[] // Optional pre-fetched meeting data
): Promise<Map<string, any>> {
  console.log(`[applyAttendanceAndAssemblyLogic] Processing ${assemblyAcMap.size} assembly-AC combinations`);
  
  // Extract unique AC IDs and build AC-to-assemblies mapping
  const uniqueAcIds = new Set<string>();
  const acAssemblyMapping = new Map<string, string[]>();
  
  assemblyAcMap.forEach((acData, key) => {
    const [assembly, acId] = key.split('::');
    
    // Skip placeholder entries
    if (acId === 'no-ac-assigned' || acId === 'unknown') {
      return;
    }
    
    uniqueAcIds.add(acId);
    
    if (!acAssemblyMapping.has(acId)) {
      acAssemblyMapping.set(acId, []);
    }
    acAssemblyMapping.get(acId)!.push(assembly);
  });
  
  console.log(`[applyAttendanceAndAssemblyLogic] Found ${uniqueAcIds.size} unique ACs across assemblies`);
  
  // Step 1: Check attendance for all ACs
  const acIdArray = Array.from(uniqueAcIds);
  const attendanceResults = await checkACAttendance(acIdArray, dateFilter);
  
  // Step 2: For available ACs, determine which assembly they worked in
  const availableAcIds = acIdArray.filter(acId => !attendanceResults.get(acId)?.isUnavailable);
  console.log(`[applyAttendanceAndAssemblyLogic] ${availableAcIds.length} ACs are available (not on leave)`);
  
  let workAssemblyResults: Map<string, AssemblyWorkResult>;
  
  if (meetingsData && meetingsData.length > 0) {
    // Use pre-fetched meeting data (preferred approach)
    console.log(`[applyAttendanceAndAssemblyLogic] Using pre-fetched meeting data (${meetingsData.length} meetings)`);
    workAssemblyResults = await determineACWorkAssembly(availableAcIds, meetingsData, acAssemblyMapping);
  } else {
    // Fallback: Log warning and return empty results (should not happen in normal flow)
    console.warn(`[applyAttendanceAndAssemblyLogic] No pre-fetched meeting data provided - assembly work determination skipped`);
    workAssemblyResults = new Map<string, AssemblyWorkResult>();
  }
  
  // Step 3: Create filtered map based on results
  const filteredMap = new Map<string, any>();
  
  assemblyAcMap.forEach((acData, key) => {
    const [assembly, acId] = key.split('::');
    
    // Always include placeholder entries
    if (acId === 'no-ac-assigned' || acId === 'unknown') {
      filteredMap.set(key, acData);
      return;
    }
    
    const attendance = attendanceResults.get(acId);
    const workAssembly = workAssemblyResults.get(acId);
    
    // If AC is unavailable, mark them as such in all their assemblies
    if (attendance?.isUnavailable) {
      // Add a modified version with unavailable flag
      const modifiedData = {
        ...acData,
        isUnavailable: true,
        unavailableReason: 'On leave/attendance',
        // Zero out metrics for unavailable ACs
        metrics: Object.keys(acData.metrics).reduce((acc, key) => {
          acc[key] = 0;
          return acc;
        }, {} as any)
      };
      filteredMap.set(key, modifiedData);
      console.log(`[applyAttendanceAndAssemblyLogic] AC ${acData.acName} marked unavailable in ${assembly}`);
    }
    // If AC is available, apply 3-condition logic
    else if (workAssembly) {
      // CONDITION 2: AC not absent + multiple assemblies
      if (workAssembly.workedAssembly === assembly) {
        // This is the assembly the AC worked in - include with color grading
        const modifiedData = {
          ...acData,
          includeInColorGrading: true,
          workStatus: 'worked_here'
        };
        filteredMap.set(key, modifiedData);
        console.log(`[applyAttendanceAndAssemblyLogic] AC ${acData.acName} worked in ${assembly} - including for color grading`);
      } else if (workAssembly.allAssignedAssemblies.includes(assembly)) {
        // This is an assigned assembly but AC didn't work here - show data but no color grading
        const modifiedData = {
          ...acData,
          includeInColorGrading: false,
          workStatus: `worked_in_${workAssembly.workedAssembly}`,
          // Preserve all metrics - exclude from color grading only
          metrics: { ...acData.metrics }
        };
        filteredMap.set(key, modifiedData);
        console.log(`[applyAttendanceAndAssemblyLogic] *** CRITICAL *** AC ${acData.acName} assigned to ${assembly} but worked in ${workAssembly.workedAssembly} - setting includeInColorGrading: FALSE`);
        console.log(`[applyAttendanceAndAssemblyLogic] Modified data:`, JSON.stringify(modifiedData, null, 2));
      }
    }
    // CONDITION 3: AC not absent + no meetings detected
    else {
      // Check if AC has single or multiple assemblies
      const acAssemblies = acAssemblyMapping.get(acId) || [];
      
      if (acAssemblies.length === 1) {
        // CONDITION 3: Single assembly + no meetings = RED (poor performance)
        const modifiedData = {
          ...acData,
          includeInColorGrading: true,
          workStatus: 'no_work_single_assembly',
          shouldBeRed: true,
          // Preserve all metrics as they are
          metrics: { ...acData.metrics }
        };
        filteredMap.set(key, modifiedData);
        console.log(`[applyAttendanceAndAssemblyLogic] AC ${acData.acName} single assembly ${assembly} with no meetings - marking for RED`);
      } else {
        // Multiple assemblies but no meetings = RED for all assigned assemblies
        const modifiedData = {
          ...acData,
          includeInColorGrading: true,
          workStatus: 'no_work_multiple_assemblies',
          shouldBeRed: true,
          // Preserve all metrics as they are
          metrics: { ...acData.metrics }
        };
        filteredMap.set(key, modifiedData);
        console.log(`[applyAttendanceAndAssemblyLogic] AC ${acData.acName} multiple assemblies including ${assembly} with no meetings - marking for RED`);
      }
    }
  });
  
  console.log(`[applyAttendanceAndAssemblyLogic] Filtered map contains ${filteredMap.size} assembly-AC combinations`);
  
  // Log summary statistics
  let unavailableCount = 0;
  let activeCount = 0;
  let noActivityCount = 0;
  
  filteredMap.forEach(acData => {
    if (acData.isUnavailable) unavailableCount++;
    else if (!acData.includeInColorGrading) noActivityCount++;
    else activeCount++;
  });
  
  console.log(`[applyAttendanceAndAssemblyLogic] Summary: ${activeCount} active, ${noActivityCount} no activity, ${unavailableCount} unavailable`);
  
  return filteredMap;
}
