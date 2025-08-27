import type { 
  ReportData, 
  ZoneData, 
  AssemblyData, 
  ACPerformance,
  DetailedActivity,
  ExecutiveSummary,
  ReportHeader,
  ReportGenerationOptions
} from '../../models/reportTypes';
import type { CumulativeMetrics, Zone, AC, SLP } from '../../models/hierarchicalTypes';
import { 
  fetchCumulativeMetrics,
  fetchDetailedMeetings,
  fetchDetailedMembers,
  fetchDetailedVolunteers,
  fetchDetailedLeaders,
  fetchDetailedData
} from './fetchHierarchicalData';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getWtmSlpSummary } from './fetchFirebaseData';

export interface DateFilter {
  startDate: string;
  endDate: string;
  label: string;
}

export interface LocalReportData {
  reportTitle: string;
  generatedAt: string;
  dateFilter: DateFilter;
  vertical: 'wtm-slp' | 'shakti-abhiyaan';
  summary: {
    totalZones: number;
    totalAssemblies: number;
    totalACs: number;
    totalSLPs: number;
    metrics: CumulativeMetrics;
  };
  zones: ZoneReportData[];
}

export interface ZoneReportData {
  id: string;
  name: string;
  inchargeName: string;
  metrics: CumulativeMetrics;
  assemblies: AssemblyReportData[];
}

export interface AssemblyReportData {
  id: string;
  name: string;
  metrics: CumulativeMetrics;
  coordinators: ACReportData[];
}

export interface ACReportData {
  id: string;
  name: string;
  assembly: string;
  metrics: CumulativeMetrics;
  slps: any[]; // Simplified for now
}

export interface SLPReportData {
  id: string;
  name: string;
  assembly: string;
  acName: string;
  isShaktiSLP: boolean;
  shaktiId?: string;
  metrics: CumulativeMetrics;
  recentActivities: {
    meetings: any[];
    members: any[];
    volunteers: any[];
    leaders: any[];
  };
}

/**
 * Main function to aggregate all report data for PDF generation
 * Uses already fetched dashboard data and groups by AC/Assembly from detailed views
 */
export async function aggregateReportData(
  dateFilter: DateFilter,
  vertical: 'wtm-slp' | 'shakti-abhiyaan',
  options?: ReportGenerationOptions
): Promise<LocalReportData> {
  console.log('[aggregateReportData] Starting data aggregation for:', { dateFilter, vertical });
  const startTime = Date.now();
  
  /**
   * Resolve AC names from users collection for ACs without coordinator names
   */
  const resolveACNames = async (
    acMap: Map<string, any>, 
    acNameCache: Map<string, string>
  ) => {
    const missingNameACs = [];
    
    // Find ACs that need name resolution
    for (const [acId, acData] of acMap) {
      if (acData.acName.startsWith('AC-') && acId !== 'unknown') {
        missingNameACs.push(acId);
      }
    }
    
    if (missingNameACs.length === 0) {
      console.log('[resolveACNames] All AC names already resolved');
      return;
    }
    
    console.log(`[resolveACNames] Resolving names for ${missingNameACs.length} ACs`);
    
    try {
      // Batch query users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', 'in', missingNameACs));
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        const acId = userData.uid;
        const acName = userData.name || userData.displayName || `AC-${acId.substring(0, 8)}`;
        
        // Update cache and AC map
        acNameCache.set(acId, acName);
        if (acMap.has(acId)) {
          acMap.get(acId)!.acName = acName;
        }
      });
      
      console.log(`[resolveACNames] Resolved ${snapshot.size} AC names from users collection`);
    } catch (error) {
      console.error('[resolveACNames] Error resolving AC names:', error);
    }
  };
  
  try {
    // Step 1: Get overall metrics from dashboard (already fetched)
    const handler_id = vertical === 'shakti-abhiyaan' ? 'shakti-abhiyaan' : undefined;
    
    // Handle "All Time" filter by using a reasonable date range
    let adjustedDateFilter = dateFilter;
    if (dateFilter.label === 'All Time' || !dateFilter.startDate || dateFilter.startDate === '') {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6); // Limit to 6 months for "All Time" to avoid 2-year limit
      
      adjustedDateFilter = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: dateFilter.label
      };
      console.log('[aggregateReportData] Adjusted All Time filter to 6 months:', adjustedDateFilter);
    }
    
    const overallMetrics = await fetchCumulativeMetrics({
      level: 'zone', // Use 'zone' with no specific assemblies to get all data
      dateRange: adjustedDateFilter,
      handler_id
    });
    console.log('[aggregateReportData] Overall metrics:', overallMetrics);

    // Step 2: Fetch detailed view data for each metric > 0
    const detailedData: {
      meetings: any[];
      members: any[];
      volunteers: any[];
      leaders: any[];
      videos: any[];
      forms: any[];
      clubs: any[];
      waGroups: any[];
    } = {
      meetings: [],
      members: [],
      volunteers: [],
      leaders: [],
      videos: [],
      forms: [],
      clubs: [],
      waGroups: []
    };

    // Fetch all detailed data to ensure we capture all ACs regardless of overall metrics
    // This is crucial because different ACs may have different activity types
    const fetchOptions = {
      level: 'zone' as const,
      dateRange: adjustedDateFilter,
      handler_id 
    };

    try {
      const [meetings, members, volunteers, leaders, videos, forms, clubs, assemblyWaGroups, centralWaGroups] = await Promise.all([
        fetchDetailedMeetings(fetchOptions),
        fetchDetailedMembers(fetchOptions),
        fetchDetailedVolunteers(fetchOptions),
        fetchDetailedLeaders(fetchOptions),
        fetchDetailedData('videos', fetchOptions),
        fetchDetailedData('forms', fetchOptions),
        fetchDetailedData('clubs', fetchOptions),
        fetchDetailedData('assemblyWaGroups', fetchOptions),
        fetchDetailedData('centralWaGroups', fetchOptions)
      ]);

      detailedData.meetings = meetings;
      detailedData.members = members;
      detailedData.volunteers = volunteers;
      detailedData.leaders = leaders;
      detailedData.videos = videos;
      detailedData.forms = forms;
      detailedData.clubs = clubs;
      detailedData.waGroups = [...assemblyWaGroups, ...centralWaGroups];

      console.log(`[aggregateReportData] Fetched detailed data:`, {
        meetings: meetings.length,
        members: members.length,
        volunteers: volunteers.length,
        leaders: leaders.length,
        videos: videos.length,
        forms: forms.length,
        clubs: clubs.length,
        assemblyWaGroups: assemblyWaGroups.length,
        centralWaGroups: centralWaGroups.length
      });
    } catch (error) {
      console.error('[aggregateReportData] Error fetching detailed data:', error);
      // Continue with empty arrays if fetch fails
    }

    // Step 3: Group detailed data by AC and Assembly
    const acMap = new Map<string, {
      acId: string;
      acName: string;
      assembly: string;
      zone?: string;
      activities: {
        meetings: any[];
        members: any[];
        volunteers: any[];
        leaders: any[];
        videos: any[];
        forms: any[];
        clubs: any[];
        waGroups: any[];
      };
      metrics: CumulativeMetrics;
    }>();
    
    // Cache for AC names to avoid duplicate queries
    const acNameCache = new Map<string, string>();

    // Helper function to extract AC info and add to map
    const addActivityToAC = (item: any, activityType: string) => {
      const acId = item.handler_id || 'unknown';
      const assembly = item.assembly || item.assemblyName || 'Unknown Assembly';
      const zone = item.zone || item.zoneName;
      
      // Get AC name from Coordinator Name field if available
      let acName = item.coordinatorName || item['Coordinator Name'] || null;
      
      if (!acMap.has(acId)) {
        acMap.set(acId, {
          acId,
          acName: acName || `AC-${acId.substring(0, 8)}`, // Temporary name, will be resolved later
          assembly,
          zone,
          activities: {
            meetings: [],
            members: [],
            volunteers: [],
            leaders: [],
            videos: [],
            forms: [],
            clubs: [],
            waGroups: []
          },
          metrics: {
            meetings: 0,
            volunteers: 0,
            slps: 0,
            saathi: 0,
            shaktiLeaders: 0,
            shaktiSaathi: 0,
            clubs: 0,
            shaktiClubs: 0,
            forms: 0,
            shaktiForms: 0,
            videos: 0,
            shaktiVideos: 0,
            acVideos: 0,
            chaupals: 0,
            shaktiBaithaks: 0,
            centralWaGroups: 0,
            assemblyWaGroups: 0
          } as CumulativeMetrics
        });
      } else {
        // Update AC name if we found a better one
        const acData = acMap.get(acId)!;
        if (acName && !acData.acName.startsWith('AC-')) {
          acData.acName = acName;
        }
      }
      
      const acData = acMap.get(acId)!;
      (acData.activities as any)[activityType].push(item);
      
      // Update metrics count
      if (activityType === 'meetings') acData.metrics.meetings = Number(acData.metrics.meetings) + 1;
      else if (activityType === 'members') acData.metrics.saathi = Number(acData.metrics.saathi) + 1;
      else if (activityType === 'volunteers') acData.metrics.volunteers = Number(acData.metrics.volunteers) + 1;
      else if (activityType === 'leaders') {
        // Only count SLPs, not all leaders
        if ((item as any).recommendedPosition === 'SLP') {
          acData.metrics.slps = Number(acData.metrics.slps) + 1;
        }
      }
      else if (activityType === 'videos') acData.metrics.videos = Number(acData.metrics.videos) + 1;
      else if (activityType === 'forms') acData.metrics.forms = Number(acData.metrics.forms) + 1;
      else if (activityType === 'clubs') acData.metrics.clubs = Number(acData.metrics.clubs) + 1;
    };

    // Process all detailed data
    detailedData.meetings.forEach(item => addActivityToAC(item, 'meetings'));
    detailedData.members.forEach(item => addActivityToAC(item, 'members'));
    detailedData.volunteers.forEach(item => addActivityToAC(item, 'volunteers'));
    detailedData.leaders.forEach(item => addActivityToAC(item, 'leaders'));
    detailedData.videos.forEach(item => addActivityToAC(item, 'videos'));
    detailedData.forms.forEach(item => addActivityToAC(item, 'forms'));
    detailedData.clubs.forEach(item => addActivityToAC(item, 'clubs'));
    detailedData.waGroups.forEach(item => {
      // For WA Groups, use handler_id if ac_id is not available
      const acId = item.ac_id || item.uid || item.handler_id;
      if (!acId) {
        console.warn('[aggregateReportData] WA Group item missing identifier:', item);
        return;
      }
      
      // Get or create AC data
      let acData = acMap.get(acId);
      if (!acData) {
        // Create a new AC entry if it doesn't exist
        const newAcData = {
          acId: acId,
          acName: 'Unknown AC',
          assembly: item.assembly || 'Unknown',
          zone: item.zone || 'Unknown Zone',
          metrics: {
            meetings: 0,
            volunteers: 0,
            slps: 0,
            saathi: 0,
            shaktiLeaders: 0,
            shaktiSaathi: 0,
            clubs: 0,
            shaktiClubs: 0,
            forms: 0,
            shaktiForms: 0,
            videos: 0,
            shaktiVideos: 0,
            acVideos: 0,
            chaupals: 0,
            shaktiBaithaks: 0,
            assemblyWaGroups: 0,
            centralWaGroups: 0
          },
          activities: {
            meetings: [],
            members: [],
            volunteers: [],
            leaders: [],
            videos: [],
            forms: [],
            clubs: [],
            waGroups: []
          }
        };
        acMap.set(acId, newAcData);
        acData = newAcData;
        
        // Mark for name resolution if needed
        if (!item.handler_name && !item.ac_name && item.handler_id) {
          // Will be resolved in resolveACNames function
        }
      }
      
      // Add to activities
      acData.activities.waGroups.push(item);
      
      // Count WA groups based on their type
      if (item.type === 'assemblyWaGroups' || item.form_type === 'assembly-wa') {
        acData.metrics.assemblyWaGroups = (Number(acData.metrics.assemblyWaGroups) || 0) + 1;
      } else if (item.type === 'centralWaGroups' || item.form_type === 'central-wa') {
        acData.metrics.centralWaGroups = (Number(acData.metrics.centralWaGroups) || 0) + 1;
      }
    });
    
    // Step 3.5: Resolve missing AC names from users collection
    await resolveACNames(acMap, acNameCache);

    console.log(`[aggregateReportData] Grouped data for ${acMap.size} ACs`);

    // Step 4: Group ACs by Assembly and Zone
    const assemblyMap = new Map<string, {
      assembly: string;
      zone: string;
      coordinators: ACReportData[];
      metrics: CumulativeMetrics;
    }>();

    acMap.forEach((acData, acId) => {
      const assembly = acData.assembly;
      
      if (!assemblyMap.has(assembly)) {
        assemblyMap.set(assembly, {
          assembly,
          zone: acData.zone || 'Unknown Zone',
          coordinators: [],
          metrics: {
            meetings: 0,
            volunteers: 0,
            slps: 0,
            saathi: 0,
            shaktiLeaders: 0,
            shaktiSaathi: 0,
            clubs: 0,
            shaktiClubs: 0,
            forms: 0,
            shaktiForms: 0,
            videos: 0,
            shaktiVideos: 0,
            acVideos: 0,
            chaupals: 0,
            shaktiBaithaks: 0,
            centralWaGroups: 0,
            assemblyWaGroups: 0
          } as CumulativeMetrics
        });
      }
      
      const assemblyData = assemblyMap.get(assembly)!;
      
      // Add AC to assembly
      assemblyData.coordinators.push({
        id: acData.acId,
        name: acData.acName,
        assembly: acData.assembly,
        metrics: acData.metrics,
        slps: [] // We don't fetch SLP details in this approach
      });
      
      // Aggregate assembly metrics
      Object.keys(acData.metrics).forEach(key => {
        const numValue = Number(acData.metrics[key as keyof CumulativeMetrics]) || 0;
        const currentValue = Number(assemblyData.metrics[key as keyof CumulativeMetrics]) || 0;
        (assemblyData.metrics as any)[key] = currentValue + numValue;
      });
    });

    console.log(`[aggregateReportData] Grouped data for ${assemblyMap.size} assemblies`);

    // Step 5: Build final report structure (simplified)
    const zoneReportData: any[] = [];
    
    if (options?.selectedZone) {
      // If a specific zone is selected, build zone structure
      const zoneAssemblies = Array.from(assemblyMap.values()).filter(a => a.zone === options.selectedZone);
      
      zoneReportData.push({
        id: options.selectedZone,
        name: options.selectedZone,
        inchargeName: options.selectedZone,
        assemblies: zoneAssemblies.map(assembly => ({
          id: assembly.assembly,
          name: assembly.assembly,
          coordinators: assembly.coordinators,
          metrics: assembly.metrics
        })),
        metrics: overallMetrics
      });
    } else {
      // No specific zone selected, group all assemblies
      const allAssemblies = Array.from(assemblyMap.values());
      zoneReportData.push({
        id: 'all',
        name: 'All Areas',
        inchargeName: 'All Areas',
        assemblies: allAssemblies.map(assembly => ({
          id: assembly.assembly,
          name: assembly.assembly,
          coordinators: assembly.coordinators,
          metrics: assembly.metrics
        })),
        metrics: overallMetrics
      });
    }

    console.log(`[aggregateReportData] Grouped data for ${zoneReportData.length} zones, ${assemblyMap.size} assemblies, ${acMap.size} ACs`);
    console.log('[aggregateReportData] Zone data structure:', zoneReportData.map(z => ({
      name: z.name,
      assembliesCount: z.assemblies.length,
      firstAssembly: z.assemblies[0]?.name,
      firstAssemblyACs: z.assemblies[0]?.coordinators?.length || 0
    })));

    // Step 6: Calculate summary metrics
    const totalACs = acMap.size;
    const totalSLPs = 0; // Simplified - not tracking SLPs in this approach
    
    // Build performance summary
    const performanceSummary = {
      high: 0,
      moderate: 0,
      poor: 0
    };
    
    // Build key metrics array (only show metrics > 0)
    const keyMetrics: { name: string; value: number }[] = [];
    
    if (Number(overallMetrics.meetings) > 0) {
      keyMetrics.push({ name: 'Meetings', value: Number(overallMetrics.meetings) });
    }
    if (Number(overallMetrics.volunteers) > 0) {
      keyMetrics.push({ name: 'Volunteers', value: Number(overallMetrics.volunteers) });
    }
    if (Number(overallMetrics.slps) > 0) {
      keyMetrics.push({ name: 'Samvidhan Leaders', value: Number(overallMetrics.slps) });
    }
    if (Number(overallMetrics.shaktiLeaders) > 0) {
      keyMetrics.push({ name: 'Shakti Leaders', value: Number(overallMetrics.shaktiLeaders) });
    }
    if (Number(overallMetrics.clubs) > 0) {
      keyMetrics.push({ name: 'Clubs', value: Number(overallMetrics.clubs) });
    }
    if (Number(overallMetrics.assemblyWaGroups) > 0) {
      keyMetrics.push({ name: 'Assembly WA Groups', value: Number(overallMetrics.assemblyWaGroups) });
    }
    if (Number(overallMetrics.chaupals) > 0) {
      keyMetrics.push({ name: 'Chaupals', value: Number(overallMetrics.chaupals) });
    }
    
    const executiveSummary: ExecutiveSummary = {
      totalZones: options?.selectedZone ? 1 : 0, // Only show zones if zone is selected
      totalAssemblies: assemblyMap.size,
      totalACs,
      totalSLPs,
      activeACs: totalACs, // Simplified - assume all ACs are active
      activeSLPs: 0, // Simplified - not tracking SLPs in this approach
      keyMetrics,
      performanceSummary
    };

    // Build report header
    const reportHeader: ReportHeader = {
      title: `${vertical === 'shakti-abhiyaan' ? 'Shakti Abhiyaan' : 'WTM-SLP'} Activity Report`,
      vertical,
      dateRange: adjustedDateFilter,
      generatedAt: new Date().toISOString(),
      generatedBy: 'System Admin', // TODO: Get from auth context
      hierarchy: {
        zone: options?.selectedZone,
        assembly: options?.selectedAssembly,
        ac: options?.selectedAC,
        slp: options?.selectedSLP
      }
    };

    // Transform zone data to new format - always include assembly data
    const transformedZones = transformZoneData(zoneReportData);

    const reportData: any = {
      header: reportHeader,
      summary: executiveSummary,
      zones: transformedZones,
      metadata: {
        totalRecords: acMap.size, // Simplified
        processingTime: Date.now() - startTime,
        dataSource: 'Firebase Firestore'
      }
    };

    // Add detailed activities if requested
    if (options?.includeDetails) {
      // Limit detailed activities to first 100 assemblies to avoid excessive data
      const allAssemblyIds = Array.from(assemblyMap.keys());
      const limitedAssemblies = allAssemblyIds.slice(0, 100);
      reportData.detailedActivities = await fetchAllDetailedActivities(
        limitedAssemblies,
        dateFilter,
        handler_id
      );
    }

    console.log('[aggregateReportData] Aggregation complete. Summary:', {
      zones: reportData.summary.totalZones,
      assemblies: reportData.summary.totalAssemblies,
      acs: reportData.summary.totalACs,
      slps: reportData.summary.totalSLPs
    });

    return reportData;

  } catch (error) {
    console.error('[aggregateReportData] Error during aggregation:', error);
    throw error;
  }
}

/**
 * Helper function to get recent activities for a specific handler
 */
async function getRecentActivities(
  assemblies: string[],
  dateRange: DateFilter,
  handler_id?: string
) {
  const options = {
    level: 'assembly' as const,
    assemblies,
    dateRange,
    handler_id
  };

  try {
    const [meetings, members, volunteers, leaders] = await Promise.all([
      fetchDetailedMeetings(options),
      fetchDetailedMembers(options),
      fetchDetailedVolunteers(options),
      fetchDetailedLeaders(options)
    ]);

    return {
      meetings: meetings.slice(0, 10), // Limit to 10 most recent
      members: members.slice(0, 10),
      volunteers: volunteers.slice(0, 10),
      leaders: leaders.slice(0, 10)
    };
  } catch (error) {
    console.error('[getRecentActivities] Error fetching activities:', error);
    return {
      meetings: [],
      members: [],
      volunteers: [],
      leaders: []
    };
  }
}

/**
 * Helper function to calculate performance summary
 */
function calculatePerformanceSummary(zones: ZoneReportData[]): { high: number; moderate: number; poor: number } {
  let high = 0;
  let moderate = 0;
  let poor = 0;

  zones.forEach(zone => {
    zone.assemblies.forEach(assembly => {
      assembly.coordinators.forEach(ac => {
        const meetingCount = Number(ac.metrics.meetings) || 0;
        if (meetingCount >= 10) {
          high++;
        } else if (meetingCount >= 5) {
          moderate++;
        } else {
          poor++;
        }
      });
    });
  });

  return { high, moderate, poor };
}

/**
 * Helper function to count active ACs
 */
function countActiveACs(zones: ZoneReportData[]): number {
  let count = 0;
  zones.forEach(zone => {
    zone.assemblies.forEach(assembly => {
      assembly.coordinators.forEach(ac => {
        if (Number(ac.metrics.meetings) > 0) {
          count++;
        }
      });
    });
  });
  return count;
}

/**
 * Helper function to count active SLPs
 */
function countActiveSLPs(zones: ZoneReportData[]): number {
  let count = 0;
  zones.forEach(zone => {
    zone.assemblies.forEach(assembly => {
      assembly.coordinators.forEach(ac => {
        ac.slps.forEach(slp => {
          if (Number(slp.metrics.meetings) > 0) {
            count++;
          }
        });
      });
    });
  });
  return count;
}

/**
 * Transform zone data to new report format
 */
function transformZoneData(zones: ZoneReportData[]): ZoneData[] {
  return zones.map(zone => {
    const assemblies: AssemblyData[] = zone.assemblies.map(assembly => {
      const acs: ACPerformance[] = assembly.coordinators.map(ac => {
        const meetingCount = Number(ac.metrics.meetings) || 0;
        let performanceLevel: 'high' | 'moderate' | 'poor' = 'poor';
        if (meetingCount >= 10) {
          performanceLevel = 'high';
        } else if (meetingCount >= 5) {
          performanceLevel = 'moderate';
        }

        return {
          id: ac.id,
          name: ac.name,
          assembly: ac.assembly,
          meetingCount,
          performanceLevel,
          metrics: {
            meetings: Number(ac.metrics.meetings) || 0,
            members: Number(ac.metrics.saathi) || 0,
            volunteers: Number(ac.metrics.volunteers) || 0,
            leaders: Number(ac.metrics.shaktiLeaders) || 0,
            slps: Number(ac.metrics.slps) || 0,
            videos: Number(ac.metrics.videos) || 0,
            clubs: Number(ac.metrics.clubs) || 0,
            forms: Number(ac.metrics.forms) || 0,
            chaupals: Number(ac.metrics.chaupals) || 0,
            assemblyWaGroups: Number(ac.metrics.assemblyWaGroups) || 0,
            centralWaGroups: Number(ac.metrics.centralWaGroups) || 0
          }
        };
      });

      return {
        name: assembly.name,
        totalACs: assembly.coordinators.length,
        activeACs: assembly.coordinators.filter(ac => Number(ac.metrics.meetings) > 0).length,
        acs,
        metrics: {
          meetings: Number(assembly.metrics.meetings) || 0,
          members: Number(assembly.metrics.saathi) || 0,
          volunteers: Number(assembly.metrics.volunteers) || 0,
          leaders: Number(assembly.metrics.shaktiLeaders) || 0,
          slps: Number(assembly.metrics.slps) || 0,
          videos: Number(assembly.metrics.videos) || 0,
          clubs: Number(assembly.metrics.clubs) || 0,
          forms: Number(assembly.metrics.forms) || 0,
          assemblyWaGroups: Number(assembly.metrics.assemblyWaGroups) || 0,
          centralWaGroups: Number(assembly.metrics.centralWaGroups) || 0
        }
      };
    });

    return {
      name: zone.name,
      inchargeName: zone.inchargeName,
      assemblies,
      totalAssemblies: zone.assemblies.length,
      totalACs: zone.assemblies.reduce((sum, a) => sum + a.coordinators.length, 0),
      activeACs: zone.assemblies.reduce((sum, a) => 
        sum + a.coordinators.filter(ac => Number(ac.metrics.meetings) > 0).length, 0
      ),
      metrics: [
        { name: 'Meetings', value: Number(zone.metrics.meetings) || 0 },
        { name: 'Members', value: Number(zone.metrics.saathi) || 0 },
        { name: 'Volunteers', value: Number(zone.metrics.volunteers) || 0 },
        { name: 'Leaders', value: Number(zone.metrics.shaktiLeaders) || 0 },
        { name: 'Videos', value: Number(zone.metrics.videos) || 0 },
        { name: 'Clubs', value: Number(zone.metrics.clubs) || 0 },
        { name: 'Forms', value: Number(zone.metrics.forms) || 0 },
        { name: 'Chaupals', value: Number(zone.metrics.chaupals) || 0 },
        { name: 'Assembly WA Groups', value: Number(zone.metrics.assemblyWaGroups) || 0 },
        { name: 'Central WA Groups', value: Number(zone.metrics.centralWaGroups) || 0 }
      ]
    };
  });
}

/**
 * Calculate total records processed
 */
function calculateTotalRecords(zones: ZoneReportData[]): number {
  let total = 0;
  zones.forEach(zone => {
    zone.assemblies.forEach(assembly => {
      assembly.coordinators.forEach(ac => {
        total += Number(ac.metrics.meetings) || 0;
        total += Number(ac.metrics.saathi) || 0;
        total += Number(ac.metrics.volunteers) || 0;
        total += Number(ac.metrics.shaktiLeaders) || 0;
      });
    });
  });
  return total;
}

/**
 * Fetch all detailed activities for report
 */
async function fetchAllDetailedActivities(
  assemblies: string[],
  dateRange: DateFilter,
  handler_id?: string
): Promise<{
  meetings?: DetailedActivity[];
  members?: DetailedActivity[];
  volunteers?: DetailedActivity[];
  videos?: DetailedActivity[];
}> {
  // Process assemblies in chunks to avoid Firebase limits
  const assemblyChunks: string[][] = [];
  for (let i = 0; i < assemblies.length; i += 30) {
    assemblyChunks.push(assemblies.slice(i, i + 30));
  }
  
  console.log(`[fetchAllDetailedActivities] Processing ${assemblies.length} assemblies in ${assemblyChunks.length} chunks`);
  
  const allMeetings: any[] = [];
  const allMembers: any[] = [];
  const allVolunteers: any[] = [];
  const allVideos: any[] = [];
  
  // Fetch data for each chunk
  for (const chunk of assemblyChunks) {
    const options = {
      level: 'assembly' as const, // Changed from 'zone' to 'assembly' to avoid composite index
      assemblies: chunk,
      dateRange,
      handler_id
    };

    try {
      const [meetings, members, volunteers, videos] = await Promise.all([
        fetchDetailedData('meetings', options),
        fetchDetailedData('members', options),
        fetchDetailedData('volunteers', options),
        fetchDetailedData('videos', options)
      ]);
      
      allMeetings.push(...meetings);
      allMembers.push(...members);
      allVolunteers.push(...volunteers);
      allVideos.push(...videos);
    } catch (error) {
      console.error(`[fetchAllDetailedActivities] Error fetching chunk:`, error);
    }
  }
  
  // Transform to DetailedActivity format
  const transformActivity = (activity: any): DetailedActivity => ({
    id: activity.id || '',
    date: activity.date_submitted || activity.date || '',
    type: activity.form_type || activity.type || '',
    assembly: activity.assembly || '',
    ac: activity.ac_name || '',
    slp: activity.slp_name || '',
    description: activity.description || activity.name || '',
    handler_id: activity.handler_id || '',
    ...activity
  });
  
  return {
    meetings: allMeetings.map(transformActivity),
    members: allMembers.map(transformActivity),
    volunteers: allVolunteers.map(transformActivity),
    videos: allVideos.map(transformActivity)
  };
}

/**
 * Helper function to create date filter from predefined ranges
 */
export function createDateFilter(range: 'last-day' | 'last-week' | 'last-month' | 'all-time'): DateFilter {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  switch (range) {
    case 'last-day':
      return {
        startDate: today,
        endDate: today,
        label: 'Last Day'
      };
    
    case 'last-week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        startDate: weekAgo.toISOString().split('T')[0],
        endDate: today,
        label: 'Last Week'
      };
    
    case 'last-month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return {
        startDate: monthAgo.toISOString().split('T')[0],
        endDate: today,
        label: 'Last Month'
      };
    
    case 'all-time':
      return {
        startDate: '2020-01-01',
        endDate: today,
        label: 'All Time'
      };
    
    default:
      return {
        startDate: today,
        endDate: today,
        label: 'Today'
      };
  }
}
