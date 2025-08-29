import type { 
  ReportData, 
  ZoneData, 
  AssemblyData, 
  ACPerformance,
  DetailedActivity,
  ExecutiveSummary,
  ReportHeader,
  ReportGenerationOptions,
  ReportMetric
} from '../../models/reportTypes';
import type { CumulativeMetrics, Zone, AC, SLP } from '../../models/hierarchicalTypes';
import { 
  fetchCumulativeMetrics,
  fetchDetailedMeetings,
  fetchDetailedMembers,
  fetchDetailedData,
  fetchZones,
  fetchAssemblyCoordinators
} from './fetchHierarchicalData';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
   * Resolve AC names from users collection using handler_id as document ID
   */
  const resolveACNames = async (
    assemblyAcMap: Map<string, any>, 
    acNameCache: Map<string, string>
  ) => {
    const acIdsToResolve = new Set<string>();
    
    // Find unique AC IDs that need name resolution
    for (const [key, acData] of assemblyAcMap) {
      const acId = acData.acId;
      if (acId === 'unknown') {
        continue; // Skip unknown ACs
      }
      
      // Check if name needs resolution (temporary names start with 'Pending-')
      if (acData.acName && acData.acName.startsWith('Pending-')) {
        if (!acNameCache.has(acId)) {
          acIdsToResolve.add(acId);
        }
      }
    }
    
    if (acIdsToResolve.size === 0) {
      console.log('[resolveACNames] All AC names already resolved or cached');
      return;
    }
    
    console.log(`[resolveACNames] Resolving names for ${acIdsToResolve.size} unique ACs from users collection`);
    
    try {
      // Fetch each AC document directly using handler_id as document ID
      const resolvePromises = Array.from(acIdsToResolve).map(async (handlerId) => {
        try {
          const userDocRef = doc(db, 'users', handlerId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const acName = userData.name; // Use only 'name' property, no fallback to displayName
            
            if (acName) {
              // Update cache
              acNameCache.set(handlerId, acName);
              
              // Update all assembly-AC combinations for this AC
              for (const [key, acData] of assemblyAcMap) {
                if (acData.acId === handlerId) {
                  acData.acName = acName;
                  console.log(`[resolveACNames] Resolved AC ${handlerId}: ${acName} for assembly ${acData.assembly}`);
                }
              }
              
              return { handlerId, acName, found: true };
            } else {
              console.warn(`[resolveACNames] AC ${handlerId} found but no 'name' property`);
              // Set to 'Unknown' for ACs without name
              for (const [key, acData] of assemblyAcMap) {
                if (acData.acId === handlerId) {
                  acData.acName = 'Unknown';
                }
              }
              return { handlerId, acName: null, found: false };
            }
          } else {
            console.warn(`[resolveACNames] AC document not found for handler_id: ${handlerId}`);
            // Set to 'Unknown' for missing AC documents
            for (const [key, acData] of assemblyAcMap) {
              if (acData.acId === handlerId) {
                acData.acName = 'Unknown';
              }
            }
            return { handlerId, acName: null, found: false };
          }
        } catch (error) {
          console.error(`[resolveACNames] Error fetching AC ${handlerId}:`, error);
          return { handlerId, acName: null, found: false };
        }
      });
      
      const results = await Promise.all(resolvePromises);
      const resolved = results.filter(r => r.found).length;
      const notFound = results.filter(r => !r.found).length;
      
      console.log(`[resolveACNames] Resolution complete: ${resolved} resolved, ${notFound} not found or missing name property`);
    } catch (error) {
      console.error('[resolveACNames] Error during AC name resolution:', error);
    }
  };
  
  /**
   * Build complete AC roster for all assemblies in the selected vertical
   */
  const buildACRosterForVertical = async (assemblies: string[], vertical: string) => {
    const acRoster = new Map<string, any[]>(); // assembly -> AC[]
    console.log(`[buildACRosterForVertical] Building AC roster for ${assemblies.length} assemblies in vertical: ${vertical}`);
    
    // Performance optimization: Process assemblies in chunks to avoid overwhelming Firestore
    const chunkSize = 10; // Process 10 assemblies at a time
    let totalACs = 0;
    
    for (let i = 0; i < assemblies.length; i += chunkSize) {
      const chunk = assemblies.slice(i, i + chunkSize);
      console.log(`[buildACRosterForVertical] Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(assemblies.length/chunkSize)} (${chunk.length} assemblies)`);
      
      const rosterPromises = chunk.map(async (assembly) => {
        try {
          const acs = await fetchAssemblyCoordinators(assembly);
          console.log(`[buildACRosterForVertical] Found ${acs.length} ACs for assembly: ${assembly}`);
          return { assembly, acs };
        } catch (error) {
          console.error(`[buildACRosterForVertical] Error fetching ACs for assembly ${assembly}:`, error);
          return { assembly, acs: [] };
        }
      });
      
      const chunkResults = await Promise.all(rosterPromises);
      
      chunkResults.forEach(({ assembly, acs }) => {
        acRoster.set(assembly, acs);
        totalACs += acs.length;
      });
    }
    
    console.log(`[buildACRosterForVertical] Built roster: ${totalACs} total ACs across ${assemblies.length} assemblies`);
    return acRoster;
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
    
    // Step 1.5: Fetch zones and assemblies for selected vertical first
    const zones = await fetchZones();
    const verticalZones = zones.filter(z => 
      vertical === 'shakti-abhiyaan' ? z.parentVertical === 'shakti-abhiyaan' : z.parentVertical === 'wtm'
    );
    const allAssemblies = verticalZones.flatMap(zone => zone.assemblies);
    console.log(`[aggregateReportData] Found ${allAssemblies.length} assemblies in ${verticalZones.length} zones for vertical: ${vertical}`);
    
    // Create assembly-to-zone mapping early for reference
    const assemblyToZoneMap = new Map<string, { zoneId: string; zoneName: string; inchargeName: string }>();
    verticalZones.forEach(zone => {
      const inchargeName = zone.name.split(' - ')[1] || 'Unknown'; // Extract incharge name from "Zone X - Name" format
      zone.assemblies.forEach(assembly => {
        assemblyToZoneMap.set(assembly, {
          zoneId: zone.id,
          zoneName: zone.name,
          inchargeName
        });
      });
    });
    console.log(`[aggregateReportData] Created assembly-to-zone mapping for ${assemblyToZoneMap.size} assemblies`);
    
    const summaryMetrics = await fetchCumulativeMetrics({
      level: 'zone', // Use 'zone' with no specific assemblies to get all data
      dateRange: adjustedDateFilter,
      handler_id
    });
    console.log('[aggregateReportData] Overall metrics:', summaryMetrics);

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

    // Step 1: Get overall summary metrics to determine which cards have data
    const fetchOptions = {
      level: 'zone' as const,
      dateRange: adjustedDateFilter,
      handler_id 
    };

    const overallMetrics = await fetchCumulativeMetrics(fetchOptions);
    console.log('[aggregateReportData] Summary metrics:', overallMetrics);

    try {
      // Step 2: Build dynamic fetch array based on non-zero metrics
      const fetchPromises: Promise<any>[] = [];
      const fetchTypes: string[] = [];

      // Conditionally fetch meetings only if count > 0
      if (Number(overallMetrics.meetings) > 0) {
        fetchPromises.push(fetchDetailedMeetings(fetchOptions));
        fetchTypes.push('meetings');
      }

      // Conditionally fetch members only if count > 0
      if (Number(overallMetrics.saathi) > 0) {
        fetchPromises.push(fetchDetailedMembers(fetchOptions));
        fetchTypes.push('members');
      }

      // Conditionally fetch other data types based on summary counts
      if (Number(overallMetrics.videos) > 0) {
        fetchPromises.push(fetchDetailedData('videos', fetchOptions));
        fetchTypes.push('videos');
      }

      if (Number(overallMetrics.acVideos) > 0) {
        fetchPromises.push(fetchDetailedData('acVideos', fetchOptions));
        fetchTypes.push('acVideos');
      }

      if (Number(overallMetrics.forms) > 0) {
        fetchPromises.push(fetchDetailedData('forms', fetchOptions));
        fetchTypes.push('forms');
      }

      if (Number(overallMetrics.clubs) > 0) {
        fetchPromises.push(fetchDetailedData('clubs', fetchOptions));
        fetchTypes.push('clubs');
      }

      if (Number(overallMetrics.assemblyWaGroups) > 0) {
        fetchPromises.push(fetchDetailedData('assemblyWaGroups', fetchOptions));
        fetchTypes.push('assemblyWaGroups');
      }

      if (Number(overallMetrics.centralWaGroups) > 0) {
        fetchPromises.push(fetchDetailedData('centralWaGroups', fetchOptions));
        fetchTypes.push('centralWaGroups');
      }

      console.log(`[aggregateReportData] Fetching detailed data for: ${fetchTypes.join(', ')}`);
      
      // Step 3: Execute only necessary fetches
      const results = await Promise.all(fetchPromises);
      
      // Step 4: Map results back to data structure with defaults
      let resultIndex = 0;
      
      // Initialize with empty arrays
      let meetings: any[] = [];
      let members: any[] = [];
      let videos: any[] = [];
      let acVideos: any[] = [];
      let forms: any[] = [];
      let clubs: any[] = [];
      let assemblyWaGroups: any[] = [];
      let centralWaGroups: any[] = [];
      
      // Map conditional results based on what was fetched
      if (Number(overallMetrics.meetings) > 0) {
        meetings = results[resultIndex++];
      }
      
      if (Number(overallMetrics.saathi) > 0) {
        members = results[resultIndex++];
      }
      
      if (Number(overallMetrics.videos) > 0) {
        videos = results[resultIndex++];
      }
      
      if (Number(overallMetrics.acVideos) > 0) {
        acVideos = results[resultIndex++];
      }
      
      if (Number(overallMetrics.forms) > 0) {
        forms = results[resultIndex++];
      }
      
      if (Number(overallMetrics.clubs) > 0) {
        clubs = results[resultIndex++];
      }
      
      if (Number(overallMetrics.assemblyWaGroups) > 0) {
        assemblyWaGroups = results[resultIndex++];
      }
      
      if (Number(overallMetrics.centralWaGroups) > 0) {
        centralWaGroups = results[resultIndex++];
      }
      
      // Filter meetings locally for volunteers/leaders (only if meetings were fetched)
      const volunteers = meetings.filter(m => (m.onboardingStatus || '').toLowerCase() === 'onboarded');
      const leaders = meetings.filter(m => (m.recommendedPosition || '').toLowerCase() === 'slp');
      
      console.log(`[aggregateReportData] Processed data - meetings: ${meetings.length}, volunteers: ${volunteers.length}, leaders: ${leaders.length}`);

      detailedData.meetings = meetings;
      detailedData.members = members;
      detailedData.volunteers = volunteers; // Filtered locally from meetings
      detailedData.leaders = leaders; // Filtered locally from meetings
      detailedData.videos = videos;
      detailedData.forms = forms;
      detailedData.clubs = clubs;
      detailedData.waGroups = [...assemblyWaGroups, ...centralWaGroups];
      
      // Add AC Videos to detailed data
      (detailedData as any).acVideos = acVideos;

      console.log(`[aggregateReportData] Fetched detailed data:`, {
        meetings: meetings.length,
        members: members.length,
        volunteers: volunteers.length,
        leaders: leaders.length,
        videos: videos.length,
        acVideos: acVideos.length,
        forms: forms.length,
        clubs: clubs.length,
        assemblyWaGroups: assemblyWaGroups.length,
        centralWaGroups: centralWaGroups.length
      });
    } catch (error) {
      console.error('[aggregateReportData] Error fetching detailed data:', error);
      // Continue with empty arrays if fetch fails
    }

    // Step 2: Build complete AC roster for all assemblies
    const acRoster = await buildACRosterForVertical(allAssemblies, vertical);
    
    // Step 3: Group data by Assembly-AC combination
    // This allows the same AC to appear under multiple assemblies with assembly-specific metrics
    const assemblyAcMap = new Map<string, {
      acId: string;
      acName: string;
      assembly: string;
      zone: string;
      primaryAssembly?: string; // AC's primary assembly from user profile
      activities: {
        meetings: any[];
        members: any[];
        volunteers: any[];
        leaders: any[];
        videos: any[];
        acVideos: any[];
        forms: any[];
        clubs: any[];
        waGroups: any[];
      };
      metrics: CumulativeMetrics;
    }>();
    
    // Cache for AC names and primary assemblies to avoid duplicate queries
    const acInfoCache = new Map<string, { name: string; primaryAssembly?: string }>();
    
    // Track unique ACs for later resolution
    const uniqueAcIds = new Set<string>();

    // Helper function to create assembly-AC key
    const getAssemblyAcKey = (assembly: string, acId: string) => `${assembly}::${acId}`;
    
    // Step 3.5: Pre-seed assemblyAcMap with complete AC roster
    let totalPreseededACs = 0;
    
    for (const [assembly, acs] of acRoster) {
      const zoneInfo = assemblyToZoneMap.get(assembly);
      const zone = zoneInfo?.zoneName || 'Unknown Zone';
      
      for (const ac of acs) {
        const key = getAssemblyAcKey(assembly, ac.uid);
        
        if (!assemblyAcMap.has(key)) {
          // Cache AC info for later use
          if (ac.name) {
            acInfoCache.set(ac.uid, {
              name: ac.name,
              primaryAssembly: assembly // This is the assembly they're assigned to
            });
          }
          
          assemblyAcMap.set(key, {
            acId: ac.uid,
            acName: ac.name || `Pending-${ac.uid.substring(0, 8)}`,
            assembly,
            zone,
            primaryAssembly: assembly,
            activities: {
              meetings: [],
              members: [],
              volunteers: [],
              leaders: [],
              videos: [],
              acVideos: [],
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
            }
          });
          
          uniqueAcIds.add(ac.uid);
          totalPreseededACs++;
        }
      }
    }
    
    console.log(`[aggregateReportData] Pre-seeded ${totalPreseededACs} assembly-AC combinations from roster`);
    
    // Helper function to add activity to assembly-AC combination
    const addActivityToAssemblyAc = async (item: any, activityType: string) => {
      const acId = item.handler_id || 'unknown';
      let assembly = item.assembly || item.assemblyName;
      const zone = item.zone || item.zoneName || 'Unknown Zone';
      
      // Fallback: If assembly is missing or seems incorrect, try to get from AC's profile
      if (!assembly || assembly === 'Unknown Assembly' || assembly === 'unknown') {
        if (acId !== 'unknown') {
          // Check cache first
          const cachedInfo = acInfoCache.get(acId);
          if (cachedInfo?.primaryAssembly) {
            assembly = cachedInfo.primaryAssembly;
            console.log(`[addActivityToAssemblyAc] Using cached primary assembly '${assembly}' for AC ${acId}`);
          } else {
            // Fetch from user profile if not cached
            try {
              const userDocRef = doc(db, 'users', acId);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const profileAssembly = userData.assembly || userData.primaryAssembly || userData.assignedAssembly;
                if (profileAssembly) {
                  assembly = profileAssembly;
                  // Cache for future use
                  acInfoCache.set(acId, {
                    name: userData.name || 'Unknown',
                    primaryAssembly: assembly
                  });
                  console.log(`[addActivityToAssemblyAc] Using AC's profile assembly '${assembly}' for AC ${acId}`);
                }
              }
            } catch (error) {
              console.error(`[addActivityToAssemblyAc] Error fetching assembly for AC ${acId}:`, error);
            }
          }
        }
      }
      
      // Final fallback if still no assembly
      if (!assembly || assembly === 'unknown') {
        assembly = 'Unknown Assembly';
        console.warn(`[addActivityToAssemblyAc] No valid assembly found for activity of AC ${acId}, using 'Unknown Assembly'`);
      }
      
      // Track unique AC IDs for later resolution
      uniqueAcIds.add(acId);
      
      // IMPORTANT: Do not use coordinatorName from activity as it may contain participant names
      // AC name will be resolved later from users collection only
      let acName = null;
      
      // Check cache for AC name
      const cachedInfo = acInfoCache.get(acId);
      if (cachedInfo?.name) {
        acName = cachedInfo.name;
      }
      
      // Create unique key for assembly-AC combination
      const key = getAssemblyAcKey(assembly, acId);
      
      if (!assemblyAcMap.has(key)) {
        assemblyAcMap.set(key, {
          acId,
          acName: acName || `Pending-${acId.substring(0, 8)}`, // Temporary name, will be resolved from users collection
          assembly,
          zone,
          activities: {
            meetings: [],
            members: [],
            volunteers: [],
            leaders: [],
            videos: [],
            acVideos: [],
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
          }
        });
      } else {
        // Update AC name if we found a better one
        const acData = assemblyAcMap.get(key)!;
        if (acName && acData.acName.startsWith('Pending-')) {
          acData.acName = acName;
        }
      }
      
      const acData = assemblyAcMap.get(key)!;
      (acData.activities as any)[activityType].push(item);
      
      // Update metrics count - ASSEMBLY-SCOPED
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
      else if (activityType === 'acVideos') acData.metrics.acVideos = Number(acData.metrics.acVideos) + 1;
      else if (activityType === 'forms') acData.metrics.forms = Number(acData.metrics.forms) + 1;
      else if (activityType === 'clubs') acData.metrics.clubs = Number(acData.metrics.clubs) + 1;
    };

    // Process all detailed data with assembly-scoped aggregation
    // Use Promise.all for async processing
    await Promise.all([
      ...detailedData.meetings.map(item => addActivityToAssemblyAc(item, 'meetings')),
      ...detailedData.members.map(item => addActivityToAssemblyAc(item, 'members')),
      ...detailedData.volunteers.map(item => addActivityToAssemblyAc(item, 'volunteers')),
      ...detailedData.leaders.map(item => addActivityToAssemblyAc(item, 'leaders')),
      ...detailedData.videos.map(item => addActivityToAssemblyAc(item, 'videos')),
      ...((detailedData as any).acVideos || []).map((item: any) => addActivityToAssemblyAc(item, 'acVideos')),
      ...detailedData.forms.map(item => addActivityToAssemblyAc(item, 'forms')),
      ...detailedData.clubs.map(item => addActivityToAssemblyAc(item, 'clubs'))
    ]);
    // Process WA Groups separately as they have different handling
    await Promise.all(detailedData.waGroups.map(async item => {
      // For WA Groups, use handler_id if ac_id is not available
      const acId = item.ac_id || item.uid || item.handler_id;
      if (!acId) {
        console.warn('[aggregateReportData] WA Group item missing identifier:', item);
        return;
      }
      
      const assembly = item.assembly || 'Unknown Assembly';
      const zone = item.zone || 'Unknown Zone';
      const key = getAssemblyAcKey(assembly, acId);
      
      // Track unique AC IDs
      uniqueAcIds.add(acId);
      
      // Get or create assembly-AC data
      let acData = assemblyAcMap.get(key);
      if (!acData) {
        // Create a new assembly-AC entry if it doesn't exist
        const newAcData = {
          acId: acId,
          acName: item.handler_name || item.ac_name || 'Pending-' + acId.substring(0, 8),
          assembly,
          zone,
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
            acVideos: [],
            forms: [],
            clubs: [],
            waGroups: []
          }
        };
        assemblyAcMap.set(key, newAcData);
        acData = newAcData;
      }
      
      // Add to activities
      acData.activities.waGroups.push(item);
      
      // Count WA groups based on their type - ASSEMBLY-SCOPED
      if (item.type === 'assemblyWaGroups' || item.form_type === 'assembly-wa') {
        acData.metrics.assemblyWaGroups = (Number(acData.metrics.assemblyWaGroups) || 0) + 1;
      } else if (item.type === 'centralWaGroups' || item.form_type === 'central-wa') {
        acData.metrics.centralWaGroups = (Number(acData.metrics.centralWaGroups) || 0) + 1;
      }
    }));
    
    // Step 3.5: Resolve remaining AC names from users collection
    // Only fetch for ACs not already in cache
    const resolveRemainingACInfo = async () => {
      const uncachedAcIds = Array.from(uniqueAcIds).filter(acId => 
        acId !== 'unknown' && !acInfoCache.has(acId)
      );
      
      if (uncachedAcIds.length > 0) {
        console.log(`[aggregateReportData] Resolving info for ${uncachedAcIds.length} uncached ACs`);
        
        const resolvePromises = uncachedAcIds.map(async (acId) => {
          try {
            const userDocRef = doc(db, 'users', acId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // IMPORTANT: Only use 'name' property, no fallback to displayName to prevent participant name leakage
              const acName = userData.name || 'Unknown';
              
              acInfoCache.set(acId, {
                name: acName,
                primaryAssembly: userData.assembly || userData.primaryAssembly || userData.assignedAssembly
              });
              
              console.log(`[aggregateReportData] Resolved AC ${acId}: name='${acName}', assembly='${userData.assembly || userData.primaryAssembly || 'not set'}'`);
            } else {
              console.warn(`[aggregateReportData] User document not found for AC: ${acId}`);
              acInfoCache.set(acId, {
                name: 'Unknown',
                primaryAssembly: undefined
              });
            }
          } catch (error) {
            console.error(`[aggregateReportData] Error fetching user info for ${acId}:`, error);
            acInfoCache.set(acId, {
              name: 'Unknown',
              primaryAssembly: undefined
            });
          }
        });
        
        await Promise.all(resolvePromises);
      }
      
      // Update all assembly-AC entries with resolved names
      assemblyAcMap.forEach((acData, key) => {
        const cachedInfo = acInfoCache.get(acData.acId);
        if (cachedInfo) {
          // Update name if it's still a temporary placeholder
          if (cachedInfo.name && (acData.acName.startsWith('Pending-') || acData.acName === 'Unknown')) {
            acData.acName = cachedInfo.name;
            console.log(`[aggregateReportData] Updated AC name for ${acData.acId} in assembly ${acData.assembly}: ${cachedInfo.name}`);
          }
          // Primary assembly already set during activity processing
        }
      });
    };
    
    await resolveRemainingACInfo();

    console.log(`[aggregateReportData] Grouped data for ${assemblyAcMap.size} Assembly-AC combinations from ${uniqueAcIds.size} unique ACs`);

    // Step 4: Group ACs by Assembly and Zone
    const assemblyMap = new Map<string, {
      assembly: string;
      zone: string;
      coordinators: ACReportData[];
      metrics: CumulativeMetrics;
    }>();

    // Step 4: Verify AC roles and group by Assembly
    // First, fetch role information for all unique ACs to filter only Assembly Coordinators
    const acRoleVerification = new Map<string, boolean>();
    
    console.log(`[aggregateReportData] Verifying roles for ${uniqueAcIds.size} unique ACs`);
    
    // Verify AC roles in parallel
    const roleVerificationPromises = Array.from(uniqueAcIds).map(async (acId) => {
      if (acId === 'unknown') {
        acRoleVerification.set(acId, false);
        return;
      }
      
      try {
        const userDocRef = doc(db, 'users', acId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isAssemblyCoordinator = userData.role === 'Assembly Coordinator';
          acRoleVerification.set(acId, isAssemblyCoordinator);
          
          if (!isAssemblyCoordinator) {
            console.log(`[aggregateReportData] Filtering out non-AC user: ${acId}, role: ${userData.role}`);
          }
        } else {
          console.warn(`[aggregateReportData] User document not found for AC: ${acId}`);
          acRoleVerification.set(acId, false);
        }
      } catch (error) {
        console.error(`[aggregateReportData] Error verifying role for AC ${acId}:`, error);
        acRoleVerification.set(acId, false);
      }
    });
    
    await Promise.all(roleVerificationPromises);
    
    const verifiedACs = Array.from(acRoleVerification.entries()).filter(([_, isAC]) => isAC).length;
    const filteredACs = Array.from(acRoleVerification.entries()).filter(([_, isAC]) => !isAC).length;
    
    console.log(`[aggregateReportData] Role verification complete: ${verifiedACs} verified ACs, ${filteredACs} filtered out`);

    // Step 4.5: Implement zero-filling for all AC-assembly combinations
    // Create a set of all assemblies where each AC has worked
    const acAssemblyWorkMap = new Map<string, Set<string>>(); // acId -> Set of assemblies
    
    assemblyAcMap.forEach((acData, key) => {
      const [assembly, acId] = key.split('::');
      if (!acAssemblyWorkMap.has(acId)) {
        acAssemblyWorkMap.set(acId, new Set());
      }
      acAssemblyWorkMap.get(acId)!.add(assembly);
    });
    
    console.log(`[aggregateReportData] AC-Assembly work map:`);
    acAssemblyWorkMap.forEach((assemblies, acId) => {
      const acName = acInfoCache.get(acId)?.name || 'Unknown';
      console.log(`  AC ${acName} (${acId}) worked in ${assemblies.size} assemblies: ${Array.from(assemblies).join(', ')}`);
    });
    
    // Now group only verified Assembly Coordinators by assembly
    assemblyAcMap.forEach((acData, key) => {
      // Only include verified Assembly Coordinators
      if (!acRoleVerification.get(acData.acId)) {
        console.log(`[aggregateReportData] Skipping non-AC user ${acData.acId} (${acData.acName}) from assembly grouping`);
        return;
      }
      
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
      
      // Add verified AC to assembly with zero-filled metrics
      // The metrics here are already assembly-scoped from the assemblyAcMap
      assemblyData.coordinators.push({
        id: acData.acId,
        name: acData.acName,
        assembly: acData.assembly,
        metrics: acData.metrics, // These are already assembly-scoped metrics
        slps: [] // We don't fetch SLP details in this approach
      });
      
      // Aggregate assembly metrics from verified ACs only
      // Since metrics are already assembly-scoped, we add them directly
      Object.keys(acData.metrics).forEach(key => {
        const numValue = Number(acData.metrics[key as keyof CumulativeMetrics]) || 0;
        const currentValue = Number(assemblyData.metrics[key as keyof CumulativeMetrics]) || 0;
        (assemblyData.metrics as any)[key] = currentValue + numValue;
      });
    });

    console.log(`[aggregateReportData] Grouped data for ${assemblyMap.size} assemblies`);
    
    // Log assembly-AC distribution for verification
    console.log('[aggregateReportData] Assembly-AC distribution:');
    assemblyMap.forEach((assemblyData, assembly) => {
      console.log(`  ${assembly}: ${assemblyData.coordinators.length} ACs`);
      assemblyData.coordinators.forEach(ac => {
        const totalActivities = Number(ac.metrics.meetings || 0) + Number(ac.metrics.videos || 0) + Number(ac.metrics.acVideos || 0) + 
                               Number(ac.metrics.saathi || 0) + Number(ac.metrics.clubs || 0) + Number(ac.metrics.forms || 0);
        console.log(`    - ${ac.name} (${ac.id}): ${totalActivities} total activities`);
      });
    });

    // Step 5: Group assemblies by zone (zones and mapping already created in Step 1.5)
    console.log(`[aggregateReportData] Using ${verticalZones.length} zones for vertical: ${vertical}`);
    
    // Step 6: Group assemblies under their respective zones
    const zoneReportData: ZoneReportData[] = [];
    const zoneDataMap = new Map<string, ZoneReportData>();
    
    // Process each assembly and group under zones
    for (const [assemblyName, assemblyData] of assemblyMap) {
      const zoneInfo = assemblyToZoneMap.get(assemblyName);
      
      if (zoneInfo) {
        // Assembly belongs to a zone
        if (!zoneDataMap.has(zoneInfo.zoneId)) {
          // Create new zone entry
          const newZone: ZoneReportData = {
            id: zoneInfo.zoneId,
            name: zoneInfo.zoneName,
            inchargeName: zoneInfo.inchargeName,
            assemblies: [],
            metrics: {
              meetings: 0,
              volunteers: 0,
              slps: 0,
              saathi: 0,
              clubs: 0,
              videos: 0,
              acVideos: 0,
              forms: 0,
              chaupals: 0,
              assemblyWaGroups: 0,
              centralWaGroups: 0,
              shaktiLeaders: 0,
              shaktiBaithaks: 0,
              shaktiSaathi: 0,
              shaktiClubs: 0,
              shaktiForms: 0,
              shaktiVideos: 0
            }
          };
          zoneDataMap.set(zoneInfo.zoneId, newZone);
        }
        
        const zoneData = zoneDataMap.get(zoneInfo.zoneId)!;
        
        // Add assembly to zone
        zoneData.assemblies.push({
          id: assemblyData.assembly,
          name: assemblyData.assembly,
          coordinators: assemblyData.coordinators,
          metrics: assemblyData.metrics
        });
        
        // Aggregate zone-level metrics
        Object.keys(assemblyData.metrics).forEach(key => {
          const numValue = Number(assemblyData.metrics[key as keyof CumulativeMetrics]) || 0;
          const currentValue = Number(zoneData.metrics[key as keyof CumulativeMetrics]) || 0;
          (zoneData.metrics as any)[key] = currentValue + numValue;
        });
      } else {
        // Assembly doesn't belong to any zone (shouldn't happen, but handle gracefully)
        console.log(`[aggregateReportData] Warning: Assembly '${assemblyName}' not found in any zone`);
        // Create a default zone for unassigned assemblies
        if (!zoneDataMap.has('unassigned')) {
          const unassignedZone: ZoneReportData = {
            id: 'unassigned',
            name: 'Unassigned Areas',
            inchargeName: 'Unassigned',
            assemblies: [],
            metrics: {
              meetings: 0,
              volunteers: 0,
              slps: 0,
              saathi: 0,
              clubs: 0,
              videos: 0,
              acVideos: 0,
              forms: 0,
              chaupals: 0,
              assemblyWaGroups: 0,
              centralWaGroups: 0,
              shaktiLeaders: 0,
              shaktiBaithaks: 0,
              shaktiSaathi: 0,
              shaktiClubs: 0,
              shaktiForms: 0,
              shaktiVideos: 0
            }
          };
          zoneDataMap.set('unassigned', unassignedZone);
        }
        
        const unassignedZone = zoneDataMap.get('unassigned')!;
        unassignedZone.assemblies.push({
          id: assemblyData.assembly,
          name: assemblyData.assembly,
          coordinators: assemblyData.coordinators,
          metrics: assemblyData.metrics
        });
        
        // Aggregate metrics for unassigned zone
        Object.keys(assemblyData.metrics).forEach(key => {
          const numValue = Number(assemblyData.metrics[key as keyof CumulativeMetrics]) || 0;
          const currentValue = Number(unassignedZone.metrics[key as keyof CumulativeMetrics]) || 0;
          (unassignedZone.metrics as any)[key] = currentValue + numValue;
        });
      }
    }
    
    // Convert map to array and sort by zone name
    zoneReportData.push(...Array.from(zoneDataMap.values()));
    zoneReportData.sort((a, b) => {
      // Put unassigned at the end
      if (a.id === 'unassigned') return 1;
      if (b.id === 'unassigned') return -1;
      return a.name.localeCompare(b.name);
    });

    console.log(`[aggregateReportData] Grouped data for ${zoneReportData.length} zones, ${assemblyMap.size} assemblies, ${uniqueAcIds.size} unique ACs`);
    console.log('[aggregateReportData] Zone data structure:', zoneReportData.map(z => ({
      name: z.name,
      inchargeName: z.inchargeName,
      assembliesCount: z.assemblies.length,
      firstAssembly: z.assemblies[0]?.name,
      firstAssemblyACs: z.assemblies[0]?.coordinators?.length || 0,
      totalMeetings: z.metrics.meetings
    })));

    // Step 7: Calculate summary metrics
    const totalACs = uniqueAcIds.size;
    const totalSLPs = 0; // Simplified - not tracking SLPs in this approach
    
    // Build performance summary
    const performanceSummary = {
      high: 0,
      moderate: 0,
      poor: 0
    };
    
    // Build key metrics array (only show metrics > 0)
    const keyMetrics: ReportMetric[] = [];
    
    console.log('[aggregateReportData] DEBUG: Overall metrics for Executive Summary:', JSON.stringify(summaryMetrics, null, 2));
    console.log('[aggregateReportData] DEBUG: Available metrics properties:', Object.keys(summaryMetrics));
    
    // Add all metrics that have values > 0 - exactly as shown on dashboard
    const checkAndAddMetric = (value: any, name: string) => {
      const numValue = Number(value || 0);
      console.log(`  Checking ${name}:`, numValue, 'from:', value);
      if (numValue > 0) {
        keyMetrics.push({ name, value: numValue });
      }
    };
    
    // Add metrics in order they appear on dashboard
    checkAndAddMetric(summaryMetrics.meetings, 'Total Meetings');
    checkAndAddMetric(summaryMetrics.volunteers, 'Volunteers');
    checkAndAddMetric(summaryMetrics.slps, 'Samvidhan Leaders');
    
    // Show both video types separately
    checkAndAddMetric(summaryMetrics.acVideos, 'AC Videos');
    checkAndAddMetric(summaryMetrics.videos, 'SLP Videos');
    
    // Add other dashboard metrics that should appear
    checkAndAddMetric(summaryMetrics.saathi, 'Saathi Members');
    checkAndAddMetric(summaryMetrics.clubs, 'Clubs');
    checkAndAddMetric(summaryMetrics.forms, 'Mai-Bahin Forms');
    checkAndAddMetric(summaryMetrics.shaktiBaithaks, 'Shakti Baithaks');
    checkAndAddMetric(summaryMetrics.assemblyWaGroups, 'Assembly WA Groups');
    checkAndAddMetric(summaryMetrics.centralWaGroups, 'Central WA Groups');
    checkAndAddMetric(summaryMetrics.chaupals, 'Chaupals');
    checkAndAddMetric(summaryMetrics.shaktiLeaders, 'Shakti Leaders');
    
    // For debugging - force add some metrics if they exist but aren't showing
    console.log('[aggregateReportData] FORCE CHECK: If metrics exist but not showing...');
    if (summaryMetrics.saathi && Number(summaryMetrics.saathi) === 0) {
      console.log('  Saathi exists but is 0:', summaryMetrics.saathi);
    }
    if (summaryMetrics.clubs && Number(summaryMetrics.clubs) === 0) {
      console.log('  Clubs exists but is 0:', summaryMetrics.clubs);
    }
    
    // All metrics checked above
    
    console.log('[aggregateReportData] DEBUG: Final key metrics generated:', keyMetrics.length);
    keyMetrics.forEach(m => console.log(`  - ${m.name}: ${m.value}`));
    
    const executiveSummary: ExecutiveSummary = {
      totalZones: zoneReportData.filter(z => z.id !== 'unassigned').length, // Count actual zones
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
        totalRecords: assemblyAcMap.size, // Total assembly-AC combinations
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
    const [meetings, members] = await Promise.all([
      fetchDetailedMeetings(options),
      fetchDetailedMembers(options)
    ]);
    
    // Filter meetings locally instead of making redundant API calls
    const volunteers = meetings.filter(m => (m.onboardingStatus || '').toLowerCase() === 'onboarded');
    const leaders = meetings.filter(m => (m.recommendedPosition || '').toLowerCase() === 'slp');

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
        if (meetingCount >= 7) {
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
        if (meetingCount >= 7) {
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
            videos: Number(ac.metrics.acVideos) || 0,
            acVideos: Number(ac.metrics.acVideos) || 0,
            slpVideos: Number(ac.metrics.videos) || 0,
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
          videos: Number(assembly.metrics.acVideos) || 0,
          acVideos: Number(assembly.metrics.acVideos) || 0,
          slpVideos: Number(assembly.metrics.videos) || 0,
          clubs: Number(assembly.metrics.clubs) || 0,
          forms: Number(assembly.metrics.forms) || 0,
          assemblyWaGroups: Number(assembly.metrics.assemblyWaGroups) || 0,
          centralWaGroups: Number(assembly.metrics.centralWaGroups) || 0
        }
      };
    });

    // Calculate zone-level metrics by aggregating from assemblies - show ALL non-zero metrics like Executive Summary
    const zoneMetrics: ReportMetric[] = [];
    
    // Add all possible zone metrics that have values > 0
    const addZoneMetric = (value: any, name: string) => {
      const numValue = Number(value || 0);
      if (numValue > 0) {
        zoneMetrics.push({ name, value: numValue });
      }
    };
    
    addZoneMetric(zone.metrics.meetings, 'Meetings');
    addZoneMetric(zone.metrics.volunteers, 'Volunteers');
    addZoneMetric(zone.metrics.slps, 'Samvidhan Leaders');
    addZoneMetric(zone.metrics.acVideos, 'AC Videos');
    addZoneMetric(zone.metrics.videos, 'SLP Videos');
    addZoneMetric(zone.metrics.saathi, 'Saathi Members');
    addZoneMetric(zone.metrics.clubs, 'Clubs');
    addZoneMetric(zone.metrics.forms, 'Mai-Bahin Forms');
    addZoneMetric(zone.metrics.shaktiBaithaks, 'Shakti Baithaks');
    addZoneMetric(zone.metrics.assemblyWaGroups, 'Assembly WA Groups');
    addZoneMetric(zone.metrics.centralWaGroups, 'Central WA Groups');
    addZoneMetric(zone.metrics.chaupals, 'Chaupals');
    addZoneMetric(zone.metrics.shaktiLeaders, 'Shakti Leaders');

    return {
      name: zone.name,
      inchargeName: zone.inchargeName,
      assemblies,
      totalAssemblies: zone.assemblies.length,
      totalACs: zone.assemblies.reduce((sum, a) => sum + a.coordinators.length, 0),
      activeACs: zone.assemblies.reduce((sum, a) => 
        sum + a.coordinators.filter(ac => Number(ac.metrics.meetings) > 0).length, 0
      ),
      metrics: zoneMetrics
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
