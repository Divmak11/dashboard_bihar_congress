import { collection, query, where, getDocs, doc, getDoc, Timestamp, limit, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { 
  User, 
  WtmSlpEntry, 
  WtmSlpSummary, 
  CoordinatorDetails, 
  AdminUser,
  SlpTrainingActivity,
  PanchayatWaActivity,
  MaiBahinYojnaActivity,
  LocalIssueVideoActivity
} from '../../models/types';

/**
 * Debug function to fetch raw documents from a collection
 * @param collectionName - The name of the collection
 * @param limitCount - Maximum number of documents to fetch
 * @returns Promise resolving to array of raw document data
 */
export async function debugFetchCollection(collectionName: string, limitCount: number = 10) {
  console.log(`[debugFetchCollection] Fetching from "${collectionName}", limit: ${limitCount}`);
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, limit(limitCount));
    const snapshot = await getDocs(q);
    
    console.log(`[debugFetchCollection] Got ${snapshot.size} documents`);
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Log document structure
    if (documents.length > 0) {
      const sampleDoc = documents[0];
      console.log('[debugFetchCollection] Sample document fields:', Object.keys(sampleDoc));
      console.log('[debugFetchCollection] Sample document:', sampleDoc);
    }
    
    return documents;
  } catch (error) {
    console.error('[debugFetchCollection] Error:', error);
    throw error;
  }
}

/**
 * Fetches the current user's profile from the admin-users collection
 * @param uid - The user's Firebase Auth UID
 * @returns Promise resolving to the AdminUser object or null if not found
 */
export async function getCurrentAdminUser(uid: string): Promise<AdminUser | null> {
  console.log(`[getCurrentAdminUser] Fetching admin user with UID: ${uid}`);
  try {
    const userDocRef = doc(db, 'admin-users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log(`[getCurrentAdminUser] No admin user found with UID: ${uid}`);
      return null;
    }
    
    const userData = userDoc.data() as AdminUser;
    console.log(`[getCurrentAdminUser] Found admin user with role: ${userData.role}, assemblies: ${userData.assemblies?.length || 0}`);
    
    return {
      ...userData,
      id: userDoc.id
    };
  } catch (error) {
    console.error('[getCurrentAdminUser] Error fetching admin user:', error);
    return null;
  }
}

/**
 * Fetches summary data for the WTM-SLP dashboard based on date range and assemblies
 * @param startDate - Optional start date in YYYY-MM-DD format (if omitted, retrieves all-time data)
 * @param endDate - Optional end date in YYYY-MM-DD format (if omitted, retrieves all-time data)
 * @param assemblies - Optional array of assembly names to filter by
 * @returns Promise resolving to summary data object
 */
export async function getWtmSlpSummary(
  startDate?: string,
  endDate?: string,
  assemblies?: string[],
  handler_id?: string,
  slp?: { uid: string; handler_id?: string; isShaktiSLP?: boolean; shaktiId?: string }
): Promise<WtmSlpSummary> {
  console.log(`[getWtmSlpSummary] Fetching data${startDate && endDate ? ` between ${startDate} and ${endDate}` : ' for all time'}`);
  if (assemblies && assemblies.length > 0) {
    console.log(`[getWtmSlpSummary] Filtering by assemblies: ${assemblies.join(', ')}`);
  }
  if (handler_id) {
    console.log(`[getWtmSlpSummary] Filtering by handler_id: ${handler_id}`);
  }
  if (slp) {
    console.log(`[getWtmSlpSummary] SLP details:`, { uid: slp.uid, handler_id: slp.handler_id, isShaktiSLP: slp.isShaktiSLP, shaktiId: slp.shaktiId });
  }
  
  try {
    const wtmSlpCollection = collection(db, 'wtm-slp');
    console.log('[getWtmSlpSummary] Collection reference created');
    
    // Arrays to store queries
    const queries = [];
    
    // Build base queries with form_type and type filters
    let baseQuery1 = query(wtmSlpCollection, where('form_type', '==', 'meeting'));
    let baseQuery2 = query(wtmSlpCollection, where('type', '==', 'meeting'));

    if (assemblies && assemblies.length > 0) {
      const uniqueAssemblies = [...new Set(assemblies)];
      console.log(`[getWtmSlpSummary] Added assembly filter for ${uniqueAssemblies.length} assemblies:`, uniqueAssemblies);
      
      if (uniqueAssemblies.length <= 10) {
        const query1WithAssemblies = query(baseQuery1, where('assembly', 'in', uniqueAssemblies));
        const query2WithAssemblies = query(baseQuery2, where('assembly', 'in', uniqueAssemblies));
        queries.push(query1WithAssemblies, query2WithAssemblies);
      } else {
        // Chunk into groups of 10 and add all chunk queries
        const chunks = [];
        for (let i = 0; i < uniqueAssemblies.length; i += 10) {
          chunks.push(uniqueAssemblies.slice(i, i + 10));
        }
        
        console.log(`[getWtmSlpSummary] Chunking ${uniqueAssemblies.length} assemblies into ${chunks.length} queries`);
        
        chunks.forEach(chunk => {
          queries.push(query(baseQuery1, where('assembly', 'in', chunk)));
          queries.push(query(baseQuery2, where('assembly', 'in', chunk)));
        });
      }
    } else {
      // No assembly filter
      queries.push(baseQuery1, baseQuery2);
    }

    // When SLP level is selected, return zero values for AC-level metrics
    // Meetings, Volunteers, and Samvidhan Leaders are AC-level activities, not SLP-specific
    if (handler_id && slp) {
      console.log(`[getWtmSlpSummary] SLP level selected - returning zero values for AC-level metrics`);
      console.log(`[getWtmSlpSummary] SLP: ${slp.uid}, isShaktiSLP: ${slp.isShaktiSLP}`);
      
      // Return early with zero values for AC-level metrics
      return {
        totalMeetings: 0,
        totalSlps: 0,
        totalOnboarded: 0
      };
    }


    console.log(`[getWtmSlpSummary] Executing ${queries.length} queries...`);
    
    // Execute all queries in parallel
    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    console.log(`[getWtmSlpSummary] Queries executed. Total documents across all queries: ${
      snapshots.reduce((total, snapshot) => total + snapshot.size, 0)
    }`);

    // Combine results, ensuring no duplicates
    const documentMap = new Map<string, WtmSlpEntry>();
    
    // Process all snapshots
    snapshots.forEach((snapshot) => {
      snapshot.forEach((doc) => {
        if (!documentMap.has(doc.id)) {
          const data = doc.data() as WtmSlpEntry;
          documentMap.set(doc.id, { ...data, id: doc.id });
        }
      });
    });
    
    console.log(`[getWtmSlpSummary] Total unique documents: ${documentMap.size}`);
    
    // Log a sample of the data
    if (documentMap.size > 0) {
      const sampleDoc = Array.from(documentMap.values())[0];
      console.log('[getWtmSlpSummary] Sample document:', JSON.stringify(sampleDoc, null, 2));
    }

    // Apply date filtering using created_at field (epoch ms) if dates are provided
    let filteredDocuments = Array.from(documentMap.values());
    
    if (startDate && endDate) {
      // Use UTC boundaries to ensure full 24-hour coverage regardless of timezone
      const startDateObj = new Date(`${startDate}T00:00:00.000Z`);
      const endDateObj = new Date(`${endDate}T23:59:59.999Z`);
      const startEpochMs = startDateObj.getTime();
      const endEpochMs = endDateObj.getTime();
      
      console.log(`[getWtmSlpSummary] Date filter range: ${startEpochMs} to ${endEpochMs}`);
  
      filteredDocuments = filteredDocuments.filter((doc) => {
        if (!doc.created_at) {
          console.log(`[getWtmSlpSummary] Document ${doc.id} has no created_at field, excluding`);
          return false;
        }
        
        const isInRange = doc.created_at >= startEpochMs && doc.created_at <= endEpochMs;
        if (!isInRange) {
          console.log(`[getWtmSlpSummary] Document ${doc.id} created_at ${doc.created_at} is outside range, excluding`);
        }
        return isInRange;
      });
      console.log(`[getWtmSlpSummary] Documents after date filter: ${filteredDocuments.length}`);
    } else {
      console.log(`[getWtmSlpSummary] No date filtering applied, using all ${filteredDocuments.length} documents`);
    }

    // Calculate summary values
    const totalMeetings = filteredDocuments.length;
    
    const totalSlps = filteredDocuments.filter(
      (doc) => doc.recommendedPosition === 'SLP'
    ).length;
    
    const totalOnboarded = filteredDocuments.filter(
      (doc) => doc.onboardingStatus === 'Onboarded'
    ).length;
    
    console.log(`[getWtmSlpSummary] Summary: totalMeetings=${totalMeetings}, totalSlps=${totalSlps}, totalOnboarded=${totalOnboarded}`);

    return {
      totalMeetings,
      totalSlps,
      totalOnboarded
    };
  } catch (error) {
    console.error('[getWtmSlpSummary] Error fetching WTM-SLP summary:', error);
    return {
      totalMeetings: 0,
      totalSlps: 0,
      totalOnboarded: 0
    };
  }
}

/**
 * Fetches the list of stakeholders (Assembly Coordinators and individual SLPs)
 * @param assemblies - Optional assembly name(s) to filter by - can be a single assembly string or an array of assemblies
 * @returns Promise resolving to array of User objects
 */
export async function getWtmSlpStakeholders(assemblies?: string | string[]): Promise<User[]> {
  console.log('[getWtmSlpStakeholders] Fetching stakeholders');
  if (assemblies) {
    if (Array.isArray(assemblies)) {
      console.log(`[getWtmSlpStakeholders] Filtering by assemblies array: ${assemblies.join(', ')}`);
    } else {
      console.log(`[getWtmSlpStakeholders] Filtering by single assembly: ${assemblies}`);
    }
  }
  
  try {
    const usersCollection = collection(db, 'users');
    console.log('[getWtmSlpStakeholders] Collection reference created');
    
    // Base query
    let departmentQuery;
    
    // Choose the query based on whether assemblies is provided and its type
    if (assemblies) {
      if (Array.isArray(assemblies) && assemblies.length > 0) {
        // Filter by multiple assemblies
        departmentQuery = query(
          usersCollection,
          where('departmentHead', '==', 'Mr. Ravi Pandit - WTM-SLP'),
          where('assembly', 'in', assemblies)
        );
        console.log(`[getWtmSlpStakeholders] Added assembly array filter with ${assemblies.length} assemblies`);
      } else if (typeof assemblies === 'string') {
        // Filter by single assembly
        departmentQuery = query(
          usersCollection,
          where('departmentHead', '==', 'Mr. Ravi Pandit - WTM-SLP'),
          where('assembly', '==', assemblies)
        );
        console.log(`[getWtmSlpStakeholders] Added single assembly filter: ${assemblies}`);
      } else {
        // Default to no assembly filter if assemblies is an empty array
        departmentQuery = query(
          usersCollection,
          where('departmentHead', '==', 'Mr. Ravi Pandit - WTM-SLP')
        );
        console.log('[getWtmSlpStakeholders] No assembly filter applied (empty array)');
      }
    } else {
      // No assembly filter (undefined/null)
      departmentQuery = query(
        usersCollection,
        where('departmentHead', '==', 'Mr. Ravi Pandit - WTM-SLP')
      );
      console.log('[getWtmSlpStakeholders] No assembly filter applied');
    }
    
    console.log('[getWtmSlpStakeholders] Executing query...');
    const snapshot = await getDocs(departmentQuery);
    console.log(`[getWtmSlpStakeholders] Query executed. Found ${snapshot.size} users`);
    
    // Filter for Assembly Coordinators and SLPs
    const stakeholders: User[] = [];
    
    snapshot.forEach((doc) => {
      const userData = doc.data() as User;
      console.log(`[getWtmSlpStakeholders] Processing user ${doc.id}, role: ${userData.role}`);
      
      if (userData.role === 'Assembly Coordinator' || userData.role === 'SLP') {
        stakeholders.push({
          ...userData,
          uid: doc.id
        });
      }
    });
    
    console.log(`[getWtmSlpStakeholders] Filtered stakeholders: ${stakeholders.length}`);
    if (stakeholders.length > 0) {
      console.log('[getWtmSlpStakeholders] First stakeholder:', JSON.stringify(stakeholders[0], null, 2));
    }
    
    return stakeholders;
  } catch (error) {
    console.error('[getWtmSlpStakeholders] Error fetching WTM-SLP stakeholders:', error);
    return [];
  }
}

/**
 * Fetches SLPs who were created by ACs during meetings (associated SLPs)
 * @param assemblies - Optional assembly name(s) to filter by - can be a single assembly string or an array of assemblies
 * @returns Promise resolving to array of objects with name, uid, and handler_id
 */
export async function getAssociatedSlps(assemblies?: string | string[]): Promise<{ name: string; uid: string; handler_id?: string }[]> {
  console.log(`[getAssociatedSlps] Fetching associated SLPs`);
  if (assemblies) {
    if (Array.isArray(assemblies)) {
      console.log(`[getAssociatedSlps] Filtering by assemblies array: ${assemblies.join(', ')}`);
    } else {
      console.log(`[getAssociatedSlps] Filtering by single assembly: ${assemblies}`);
    }
  } else {
    console.log(`[getAssociatedSlps] No assembly filter applied - fetching all SLPs`);
  }
  
  try {
    const wtmSlpCollection = collection(db, 'wtm-slp');
    
    // Arrays to store queries
    const queries = [];
    
    if (assemblies) {
      if (Array.isArray(assemblies) && assemblies.length > 0) {
        // Multiple assemblies - only use singular form
        queries.push(
          query(
            wtmSlpCollection,
            where('assembly', 'in', assemblies),
            where('recommendedPosition', '==', 'SLP'),
            where('form_type', '==', 'meeting')
          ),
          query(
            wtmSlpCollection,
            where('assembly', 'in', assemblies),
            where('recommendedPosition', '==', 'SLP'),
            where('type', '==', 'meeting')
          )
        );
      } else if (typeof assemblies === 'string') {
        // Single assembly string - only use singular form
        queries.push(
          query(
            wtmSlpCollection,
            where('assembly', '==', assemblies),
            where('recommendedPosition', '==', 'SLP'),
            where('form_type', '==', 'meeting')
          ),
          query(
            wtmSlpCollection,
            where('assembly', '==', assemblies),
            where('recommendedPosition', '==', 'SLP'),
            where('type', '==', 'meeting')
          )
        );
      } else {
        // Empty array - fall back to no assembly filter
        queries.push(
          query(
            wtmSlpCollection,
            where('recommendedPosition', '==', 'SLP'),
            where('form_type', '==', 'meeting')
          ),
          query(
            wtmSlpCollection,
            where('recommendedPosition', '==', 'SLP'),
            where('type', '==', 'meeting')
          )
        );
      }
    } else {
      // No assembly filter - fetch all SLPs
      queries.push(
        query(
          wtmSlpCollection,
          where('recommendedPosition', '==', 'SLP'),
          where('form_type', '==', 'meeting')
        ),
        query(
          wtmSlpCollection,
          where('recommendedPosition', '==', 'SLP'),
          where('type', '==', 'meeting')
        )
      );
    }
    
    // Execute all queries in parallel
    console.log(`[getAssociatedSlps] Executing ${queries.length} queries...`);
    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    console.log(`[getAssociatedSlps] Queries executed. Total documents across all queries: ${
      snapshots.reduce((total, snapshot) => total + snapshot.size, 0)
    }`);
    
    // Process results, ensuring no duplicates by name
    const slpsMap = new Map<string, { name: string; uid: string; handler_id?: string }>();
    
    // Process each snapshot
    snapshots.forEach((snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          // Use name as key to avoid duplicates
          slpsMap.set(data.name, {
            name: data.name,
            uid: doc.id, // Use document ID as UID
            handler_id: data.handler_id // Include handler_id if it exists in the document
          });
        }
      });
    });
    
    const associatedSlps = Array.from(slpsMap.values());
    console.log(`[getAssociatedSlps] Found ${associatedSlps.length} unique associated SLPs`);
    
    return associatedSlps;
  } catch (error) {
    console.error('[getAssociatedSlps] Error fetching associated SLPs:', error);
    return [];
  }
}

/**
 * Fetches detailed information about a specific coordinator
 * @param uid - The user ID of the coordinator
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param assembly - Optional assembly name to filter by
 * @returns Promise resolving to coordinator details object
 */
export async function getCoordinatorDetails(
  uid: string,
  startDate: string,
  endDate: string,
  assembly?: string
): Promise<CoordinatorDetails | null> {
  console.log(`[getCoordinatorDetails] Fetching details for coordinator ${uid} between ${startDate} and ${endDate}`);
  if (assembly) {
    console.log(`[getCoordinatorDetails] Filtering by assembly: ${assembly}`);
  }
  
  try {
    // Get personal info from users collection - using document ID directly
    const usersCollection = collection(db, 'users');
    console.log('[getCoordinatorDetails] Users collection reference created');
    
    // Get document directly by ID instead of querying
    const userDocRef = doc(usersCollection, uid);
    
    console.log('[getCoordinatorDetails] Getting user document directly...');
    const userDoc = await getDoc(userDocRef);
    console.log(`[getCoordinatorDetails] User document fetch complete: ${userDoc.exists() ? 'found' : 'not found'}`);
    
    if (!userDoc.exists()) {
      console.error(`[getCoordinatorDetails] User with UID ${uid} not found`);
      throw new Error(`User with UID ${uid} not found`);
    }
    
    const personalInfo = { ...userDoc.data() as User, uid };
    console.log('[getCoordinatorDetails] Personal info:', JSON.stringify(personalInfo, null, 2));
    
    // Get entries from wtm-slp collection
    const wtmSlpCollection = collection(db, 'wtm-slp');
    console.log('[getCoordinatorDetails] WTM-SLP collection reference created');
    
    // Arrays to store queries
    const meetingsQueries = [];
    const activitiesQueries = [];
    const whatsappQueries = [];
    
    // If assembly is provided, add the assembly filter
    if (assembly) {
      // Meetings
      meetingsQueries.push(
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('form_type', '==', 'meeting'),
          where('assembly', '==', assembly)
        ),
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('type', '==', 'meeting'),
          where('assembly', '==', assembly)
        )
      );
      
      // Activities
      activitiesQueries.push(
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('form_type', '==', 'activity'),
          where('assembly', '==', assembly)
        ),
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('type', '==', 'activity'),
          where('assembly', '==', assembly)
        )
      );
      
      // WhatsApp groups
      whatsappQueries.push(
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('form_type', '==', 'assembly-wa'),
          where('assembly', '==', assembly)
        ),
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('type', '==', 'assembly-wa'),
          where('assembly', '==', assembly)
        )
      );
      
      console.log(`[getCoordinatorDetails] Added assembly filter: ${assembly}`);
    } else {
      // No assembly filter - Query only by handler_id
      
      // Meetings
      meetingsQueries.push(
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('form_type', '==', 'meeting')
        ),
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('type', '==', 'meeting')
        )
      );
      
      // Activities
      activitiesQueries.push(
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('form_type', '==', 'activity')
        ),
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('type', '==', 'activity')
        )
      );
      
      // WhatsApp groups
      whatsappQueries.push(
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('form_type', '==', 'assembly-wa')
        ),
        query(
          wtmSlpCollection,
          where('handler_id', '==', uid),
          where('type', '==', 'assembly-wa')
        )
      );
      
      console.log('[getCoordinatorDetails] No assembly filter applied');
    }
    
    // Execute all queries in parallel
    console.log('[getCoordinatorDetails] Executing all queries in parallel...');
    
    // Execute meetings queries
    const meetingsSnapshots = await Promise.all(meetingsQueries.map(q => getDocs(q)));
    
    // Execute activities queries
    const activitiesSnapshots = await Promise.all(activitiesQueries.map(q => getDocs(q)));
    
    // Execute WhatsApp group queries
    const whatsappSnapshots = await Promise.all(whatsappQueries.map(q => getDocs(q)));
    
    console.log('[getCoordinatorDetails] All queries executed');
    console.log(`[getCoordinatorDetails] Documents retrieved from queries:
      - Meetings: ${meetingsSnapshots.reduce((total, snapshot) => total + snapshot.size, 0)}
      - Activities: ${activitiesSnapshots.reduce((total, snapshot) => total + snapshot.size, 0)}
      - WhatsApp: ${whatsappSnapshots.reduce((total, snapshot) => total + snapshot.size, 0)}`);
    
    // Process meetings data
    const meetingsMap = new Map<string, WtmSlpEntry>();
    
    meetingsSnapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data() as WtmSlpEntry;
        meetingsMap.set(doc.id, { ...data, id: doc.id });
      });
    });
    
    // Process activities data
    const activitiesMap = new Map<string, WtmSlpEntry>();
    
    activitiesSnapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data() as WtmSlpEntry;
        activitiesMap.set(doc.id, { ...data, id: doc.id });
      });
    });
    
    // Process WhatsApp groups data
    const whatsappMap = new Map<string, WtmSlpEntry>();
    
    whatsappSnapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data() as WtmSlpEntry;
        whatsappMap.set(doc.id, { ...data, id: doc.id });
      });
    });
    
    console.log(`[getCoordinatorDetails] Total unique documents:
      - Meetings: ${meetingsMap.size}
      - Activities: ${activitiesMap.size}
      - WhatsApp groups: ${whatsappMap.size}`);
    
    // Filter by date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999); // Include the entire end day
    
    const filterByDateRange = (entries: WtmSlpEntry[]): WtmSlpEntry[] => {
      return entries.filter((entry) => {
        if (!entry.dateOfVisit) {
          console.log(`[getCoordinatorDetails] Document ${entry.id} has no dateOfVisit field, excluding`);
          return false;
        }
        
        const entryDate = new Date(entry.dateOfVisit);
        const isInRange = entryDate >= startDateObj && entryDate <= endDateObj;
        if (!isInRange) {
          console.log(`[getCoordinatorDetails] Document ${entry.id} date ${entry.dateOfVisit} is outside range, excluding`);
        }
        return isInRange;
      });
    };
    
    const filteredMeetings = filterByDateRange(Array.from(meetingsMap.values()));
    const filteredActivities = filterByDateRange(Array.from(activitiesMap.values()));
    const filteredWhatsappGroups = filterByDateRange(Array.from(whatsappMap.values()));
    
    console.log(`[getCoordinatorDetails] Documents after date filter:
      - Meetings: ${filteredMeetings.length}
      - Activities: ${filteredActivities.length}
      - WhatsApp groups: ${filteredWhatsappGroups.length}`);
    
    // Calculate meeting summary
    const slpsAdded = filteredMeetings.filter(
      (meeting) => meeting.recommendedPosition === 'SLP'
    ).length;
    
    const onboarded = filteredMeetings.filter(
      (meeting) => meeting.onboardingStatus === 'Onboarded'
    ).length;
    
    console.log(`[getCoordinatorDetails] Summary stats:
      - Total meetings: ${filteredMeetings.length}
      - SLPs added: ${slpsAdded}
      - Onboarded: ${onboarded}`);
    
    return {
      personalInfo,
      meetingsSummary: {
        meetings: filteredMeetings.length,
        slpsAdded,
        onboarded
      },
      // Include the actual meeting data
      meetings: filteredMeetings,
      activities: filteredActivities,
      whatsappGroups: filteredWhatsappGroups
    };
  } catch (error) {
    console.error('[getCoordinatorDetails] Error fetching coordinator details:', error);
    return null;
  }
} 

/**
 * Fetches member activities for a selected SLP or Associated SLP
 * @param slp - Object containing slp.uid and optionally slp.handler_id, and slp.role
 * @param dateRange - Optional date range filter
 * @returns Promise resolving to array of member activity objects
 */
export async function getSlpMemberActivity(
  slp: { 
    uid: string; 
    role: string; 
    handler_id?: string;
  },
  dateRange?: { startDate: string; endDate: string }
): Promise<any[]> {
  console.log(`[getSlpMemberActivity] Fetching member activities for ${slp.role} with uid: ${slp.uid}`);
  
  // Log date range if provided
  if (dateRange) {
    console.log(`[getSlpMemberActivity] Date range filter: ${dateRange.startDate} to ${dateRange.endDate}`);
  } else {
    console.log('[getSlpMemberActivity] No date range filter applied');
  }
  
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    console.log('[getSlpMemberActivity] Collection reference created');
    
    let memberQuery;
    
    if (slp.role === 'ASLP') {
      // For Associated SLPs, we need to check both the document ID and handler_id
      // Using the "in" operator to match against multiple potential IDs
      const possibleIds = [slp.uid];
      
      // Add handler_id to possible IDs if available
      if (slp.handler_id) {
        possibleIds.push(slp.handler_id);
        console.log(`[getSlpMemberActivity] Using multiple IDs for ASLP: ${possibleIds.join(', ')}`);
      } else {
        console.log(`[getSlpMemberActivity] No handler_id available for ASLP, using only doc ID`);
      }
      
      let baseFormTypeQuery = query(
        slpActivityCollection,
        where('form_type', '==', 'members'),
        where('handler_id', 'in', possibleIds)
      );
      
      let baseTypeQuery = query(
        slpActivityCollection,
        where('type', '==', 'members'),
        where('handler_id', 'in', possibleIds)
      );
      
      // Apply date filtering if provided
      if (dateRange) {
        // Use string comparison since dateOfVisit is stored as string (e.g., "2025-07-14")
        const startDateStr = dateRange.startDate;
        const endDateStr = dateRange.endDate;
        
        console.log(`[getSlpMemberActivity] Applying date filter: ${startDateStr} to ${endDateStr}`);
        
        baseFormTypeQuery = query(
          baseFormTypeQuery,
          where('dateOfVisit', '>=', startDateStr),
          where('dateOfVisit', '<=', endDateStr)
        );
        
        baseTypeQuery = query(
          baseTypeQuery,
          where('dateOfVisit', '>=', startDateStr),
          where('dateOfVisit', '<=', endDateStr)
        );
      }
      
      memberQuery = baseFormTypeQuery;
      const typeQuery = baseTypeQuery;
      
      // Execute both queries in parallel
      console.log('[getSlpMemberActivity] Executing both form_type and type queries for ASLP');
      const [formTypeSnapshot, typeSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(typeQuery)
      ]);
      
      console.log(`[getSlpMemberActivity] Queries executed. Form type docs: ${formTypeSnapshot.size}, Type docs: ${typeSnapshot.size}`);
      
      // Process results, ensuring no duplicates
      const memberActivitiesMap = new Map();
      
      formTypeSnapshot.forEach((doc) => {
        memberActivitiesMap.set(doc.id, {
          id: doc.id,
          ...doc.data()
        });
      });
      
      typeSnapshot.forEach((doc) => {
        if (!memberActivitiesMap.has(doc.id)) {
          memberActivitiesMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        }
      });
      
      const memberActivities = Array.from(memberActivitiesMap.values());
      console.log(`[getSlpMemberActivity] Found ${memberActivities.length} member activities for ASLP`);
      
      return memberActivities;
    } else {
      // For Individual SLPs, use the uid directly
      let baseFormTypeQuery = query(
        slpActivityCollection,
        where('form_type', '==', 'members'),
        where('handler_id', '==', slp.uid)
      );
      
      let baseTypeQuery = query(
        slpActivityCollection,
        where('type', '==', 'members'),
        where('handler_id', '==', slp.uid)
      );
      
      // Apply date filtering if provided
      if (dateRange) {
        // Use string comparison since dateOfVisit is stored as string (e.g., "2025-07-14")
        const startDateStr = dateRange.startDate;
        const endDateStr = dateRange.endDate;
        
        console.log(`[getSlpMemberActivity] Applying date filter: ${startDateStr} to ${endDateStr}`);
        
        baseFormTypeQuery = query(
          baseFormTypeQuery,
          where('dateOfVisit', '>=', startDateStr),
          where('dateOfVisit', '<=', endDateStr)
        );
        
        baseTypeQuery = query(
          baseTypeQuery,
          where('dateOfVisit', '>=', startDateStr),
          where('dateOfVisit', '<=', endDateStr)
        );
      }
      
      const formTypeQuery = baseFormTypeQuery;
      const typeQuery = baseTypeQuery;
      
      // Execute both queries in parallel
      console.log('[getSlpMemberActivity] Executing both form_type and type queries for SLP');
      const [formTypeSnapshot, typeSnapshot] = await Promise.all([
        getDocs(formTypeQuery),
        getDocs(typeQuery)
      ]);
      
      console.log(`[getSlpMemberActivity] Queries executed. Form type docs: ${formTypeSnapshot.size}, Type docs: ${typeSnapshot.size}`);
      
      // Process results, ensuring no duplicates
      const memberActivitiesMap = new Map();
      
      formTypeSnapshot.forEach((doc) => {
        memberActivitiesMap.set(doc.id, {
          id: doc.id,
          ...doc.data()
        });
      });
      
      typeSnapshot.forEach((doc) => {
        if (!memberActivitiesMap.has(doc.id)) {
          memberActivitiesMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        }
      });
      
      const memberActivities = Array.from(memberActivitiesMap.values());
      console.log(`[getSlpMemberActivity] Found ${memberActivities.length} member activities for SLP`);
      
      return memberActivities;
    }
  } catch (error) {
    console.error('[getSlpMemberActivity] Error fetching member activities:', error);
    return [];
  }
}

/**
 * Fetches panchayat WhatsApp group activities for a selected SLP or Associated SLP
 * @param slp - Object containing slp.uid and optionally slp.handler_id, and slp.role
 * @param dateRange - Optional date range filter
 * @returns Promise resolving to array of panchayat WhatsApp group activity objects
 */
export async function getSlpPanchayatWaActivity(
  slp: {
    uid: string;
    role: string;
    handler_id?: string;
  },
  dateRange?: { startDate: string; endDate: string }
): Promise<PanchayatWaActivity[]> {
  console.log(`[getSlpPanchayatWaActivity] Fetching panchayat WhatsApp activities for ${slp.role}: ${slp.uid}`);
  if (dateRange) {
    console.log(`[getSlpPanchayatWaActivity] Filtering by date range: ${dateRange.startDate} to ${dateRange.endDate}`);
  }
  
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    
    // Arrays to store queries
    const queries = [];
    
    if (slp.role === 'SLP') {
      // Individual SLP - search by uid
      let baseQuery1 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('form_type', '==', 'panchayat-wa')
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('type', '==', 'panchayat-wa')
      );
      
      // Add date filtering if provided
      if (dateRange) {
        // Convert date strings to ISO format for createdAt comparison
        const startDateISO = new Date(dateRange.startDate + 'T00:00:00.000Z').toISOString();
        const endDateISO = new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString();
        
        console.log(`[getSlpPanchayatWaActivity] Applying date filter:`, dateRange);
        console.log(`[getSlpPanchayatWaActivity] Query conditions: createdAt >= '${startDateISO}' AND createdAt <= '${endDateISO}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
        baseQuery2 = query(
          baseQuery2,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    } else {
      // Associated SLP - search by both document ID and handler_id
      const possibleIds = [slp.uid];
      
      // Add handler_id to possible IDs if available
      if (slp.handler_id) {
        possibleIds.push(slp.handler_id);
        console.log(`[getSlpPanchayatWaActivity] Using multiple IDs for ASLP: ${possibleIds.join(', ')}`);
      } else {
        console.log(`[getSlpPanchayatWaActivity] No handler_id available for ASLP, using only doc ID`);
      }
      
      let baseQuery1 = query(
        slpActivityCollection,
        where('form_type', '==', 'panchayat-wa'),
        where('handler_id', 'in', possibleIds)
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('type', '==', 'panchayat-wa'),
        where('handler_id', 'in', possibleIds)
      );
      
      // Add date filtering if provided
      if (dateRange) {
        // Convert date strings to ISO format for createdAt comparison
        const startDateISO = new Date(dateRange.startDate + 'T00:00:00.000Z').toISOString();
        const endDateISO = new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString();
        
        console.log(`[getSlpPanchayatWaActivity] Applying date filter (Associated SLP):`, dateRange);
        console.log(`[getSlpPanchayatWaActivity] Associated SLP Query conditions: createdAt >= '${startDateISO}' AND createdAt <= '${endDateISO}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
        baseQuery2 = query(
          baseQuery2,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    }
    
    console.log(`[getSlpPanchayatWaActivity] Executing ${queries.length} queries...`);
    
    // Execute all queries in parallel
    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    console.log(`[getSlpPanchayatWaActivity] Queries executed. Total documents across all queries: ${
      snapshots.reduce((total, snapshot) => total + snapshot.size, 0)
    }`);
    
    // Process results, ensuring no duplicates
    const activitiesMap = new Map<string, PanchayatWaActivity>();
    
    snapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        activitiesMap.set(doc.id, {
          id: doc.id,
          ...doc.data()
        } as PanchayatWaActivity);
      });
    });
    
    const activities = Array.from(activitiesMap.values());
    console.log(`[getSlpPanchayatWaActivity] Found ${activities.length} panchayat WhatsApp activities`);
    console.log('[getSlpPanchayatWaActivity] Documents:', JSON.stringify(activities, null, 2));
    
    return activities;
  } catch (error) {
    console.error('[getSlpPanchayatWaActivity] Error fetching panchayat WhatsApp activities:', error);
    return [];
  }
}

/**
 * Fetches local issue video activities for a selected SLP or Associated SLP
 * @param slp - Object containing slp.uid and optionally slp.handler_id, and slp.role
 * @param dateRange - Optional date range filter
 * @returns Promise resolving to array of local issue video activity objects
 */
export async function getSlpLocalIssueVideoActivity(
  slp: {
    uid: string;
    role: string;
    handler_id?: string;
  },
  dateRange?: { startDate: string; endDate: string }
): Promise<LocalIssueVideoActivity[]> {
  console.log(`[getSlpLocalIssueVideoActivity] Fetching local issue video activities for ${slp.role}: ${slp.uid}`);
  if (dateRange) {
    console.log(`[getSlpLocalIssueVideoActivity] Filtering by date range: ${dateRange.startDate} to ${dateRange.endDate}`);
  }
  
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    
    // Arrays to store queries
    const queries = [];
    
    if (slp.role === 'SLP') {
      // Individual SLP - search by uid
      let baseQuery1 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('form_type', '==', 'local-issue-video')
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('type', '==', 'local-issue-video')
      );
      
      // Add date filtering if provided
      if (dateRange) {
        console.log(`[getSlpLocalIssueVideoActivity] Applying date filter:`, dateRange);
        console.log(`[getSlpLocalIssueVideoActivity] Query conditions: date_submitted >= '${dateRange.startDate}' AND date_submitted <= '${dateRange.endDate}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('date_submitted', '>=', dateRange.startDate),
          where('date_submitted', '<=', dateRange.endDate)
        );
        baseQuery2 = query(
          baseQuery2,
          where('date_submitted', '>=', dateRange.startDate),
          where('date_submitted', '<=', dateRange.endDate)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    } else {
      // Associated SLP - search by both document ID and handler_id
      const possibleIds = [slp.uid];
      
      // Add handler_id to possible IDs if available
      if (slp.handler_id) {
        possibleIds.push(slp.handler_id);
        console.log(`[getSlpLocalIssueVideoActivity] Using multiple IDs for ASLP: ${possibleIds.join(', ')}`);
      } else {
        console.log(`[getSlpLocalIssueVideoActivity] No handler_id available for ASLP, using only doc ID`);
      }
      
      let baseQuery1 = query(
        slpActivityCollection,
        where('form_type', '==', 'local-issue-video'),
        where('handler_id', 'in', possibleIds)
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('type', '==', 'local-issue-video'),
        where('handler_id', 'in', possibleIds)
      );
      
      // Add date filtering if provided
      if (dateRange) {
        console.log(`[getSlpLocalIssueVideoActivity] Applying date filter (Associated SLP):`, dateRange);
        console.log(`[getSlpLocalIssueVideoActivity] Associated SLP Query conditions: date_submitted >= '${dateRange.startDate}' AND date_submitted <= '${dateRange.endDate}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('date_submitted', '>=', dateRange.startDate),
          where('date_submitted', '<=', dateRange.endDate)
        );
        baseQuery2 = query(
          baseQuery2,
          where('date_submitted', '>=', dateRange.startDate),
          where('date_submitted', '<=', dateRange.endDate)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    }
    
    console.log(`[getSlpLocalIssueVideoActivity] Executing ${queries.length} queries...`);
    
    // Execute all queries in parallel
    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    console.log(`[getSlpLocalIssueVideoActivity] Queries executed. Total documents across all queries: ${
      snapshots.reduce((total, snapshot) => total + snapshot.size, 0)
    }`);
    
    // Process results, ensuring no duplicates
    const activitiesMap = new Map<string, LocalIssueVideoActivity>();
    
    snapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        activitiesMap.set(doc.id, {
          id: doc.id,
          ...doc.data()
        } as LocalIssueVideoActivity);
      });
    });
    
    const activities = Array.from(activitiesMap.values());
    console.log(`[getSlpLocalIssueVideoActivity] Found ${activities.length} local issue video activities`);
    console.log('[getSlpLocalIssueVideoActivity] Documents:', JSON.stringify(activities, null, 2));
    
    return activities;
  } catch (error) {
    console.error('[getSlpLocalIssueVideoActivity] Error fetching local issue video activities:', error);
    return [];
  }
}

/**
 * Fetches Mai Bahin Yojna form activities for a selected SLP or Associated SLP
 * @param slp - Object containing slp.uid and optionally slp.handler_id, and slp.role
 * @param dateRange - Optional date range filter
 * @returns Promise resolving to array of Mai Bahin Yojna form activity objects
 */
export async function getSlpMaiBahinYojnaActivity(
  slp: {
    uid: string;
    role: string;
    handler_id?: string;
  },
  dateRange?: { startDate: string; endDate: string }
): Promise<MaiBahinYojnaActivity[]> {
  console.log(`[getSlpMaiBahinYojnaActivity] Fetching Mai Bahin Yojna activities for ${slp.role}: ${slp.uid}`);
  if (dateRange) {
    console.log(`[getSlpMaiBahinYojnaActivity] Filtering by date range: ${dateRange.startDate} to ${dateRange.endDate}`);
  }
  
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    
    // Arrays to store queries
    const queries = [];
    
    if (slp.role === 'SLP') {
      // Individual SLP - search by uid
      let baseQuery1 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('form_type', '==', 'mai-bahin-yojna')
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('type', '==', 'mai-bahin-yojna')
      );
      
      // Add date filtering if provided
      if (dateRange) {
        console.log(`[getSlpMaiBahinYojnaActivity] Applying date filter:`, dateRange);
        console.log(`[getSlpMaiBahinYojnaActivity] Query conditions: date >= '${dateRange.startDate}' AND date <= '${dateRange.endDate}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('date', '>=', dateRange.startDate),
          where('date', '<=', dateRange.endDate)
        );
        baseQuery2 = query(
          baseQuery2,
          where('date', '>=', dateRange.startDate),
          where('date', '<=', dateRange.endDate)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    } else {
      // Associated SLP - search by both document ID and handler_id
      const possibleIds = [slp.uid];
      
      // Add handler_id to possible IDs if available
      if (slp.handler_id) {
        possibleIds.push(slp.handler_id);
        console.log(`[getSlpMaiBahinYojnaActivity] Using multiple IDs for ASLP: ${possibleIds.join(', ')}`);
      } else {
        console.log(`[getSlpMaiBahinYojnaActivity] No handler_id available for ASLP, using only doc ID`);
      }
      
      let baseQuery1 = query(
        slpActivityCollection,
        where('form_type', '==', 'mai-bahin-yojna'),
        where('handler_id', 'in', possibleIds)
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('type', '==', 'mai-bahin-yojna'),
        where('handler_id', 'in', possibleIds)
      );
      
      // Add date filtering if provided
      if (dateRange) {
        console.log(`[getSlpMaiBahinYojnaActivity] Applying date filter (Associated SLP):`, dateRange);
        console.log(`[getSlpMaiBahinYojnaActivity] Associated SLP Query conditions: date >= '${dateRange.startDate}' AND date <= '${dateRange.endDate}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('date', '>=', dateRange.startDate),
          where('date', '<=', dateRange.endDate)
        );
        baseQuery2 = query(
          baseQuery2,
          where('date', '>=', dateRange.startDate),
          where('date', '<=', dateRange.endDate)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    }
    
    console.log(`[getSlpMaiBahinYojnaActivity] Executing ${queries.length} queries...`);
    
    // Execute all queries in parallel
    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    console.log(`[getSlpMaiBahinYojnaActivity] Queries executed. Total documents across all queries: ${
      snapshots.reduce((total, snapshot) => total + snapshot.size, 0)
    }`);
    
    // Process results, ensuring no duplicates
    const activitiesMap = new Map<string, MaiBahinYojnaActivity>();
    
    snapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        activitiesMap.set(doc.id, {
          id: doc.id,
          ...doc.data()
        } as MaiBahinYojnaActivity);
      });
    });
    
    const activities = Array.from(activitiesMap.values());
    console.log(`[getSlpMaiBahinYojnaActivity] Found ${activities.length} Mai Bahin Yojna activities`);
    console.log('[getSlpMaiBahinYojnaActivity] Documents:', JSON.stringify(activities, null, 2));
    
    return activities;
  } catch (error) {
    console.error('[getSlpMaiBahinYojnaActivity] Error fetching Mai Bahin Yojna activities:', error);
    return [];
  }
}

/**
 * Fetches training activities for a selected SLP or Associated SLP
 * @param slp - Object containing slp.uid and optionally slp.handler_id, and slp.role
 * @returns Promise resolving to array of training activity objects
 */
/**
 * Fetches local issue video activities for a specific Assembly Coordinator
 * @param userId - The UID of the Assembly Coordinator
 * @param dateRange - Optional date range filter
 * @returns Promise resolving to array of local issue video activity objects
 */
export async function getAcLocalIssueVideoActivities(
  userId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<LocalIssueVideoActivity[]> {
  try {
    const activitiesRef = collection(db, 'wtm-slp');
    console.log(`[getAcLocalIssueVideoActivities] Fetching local issue video activities for AC: ${userId}`);
    let q = query(
      activitiesRef,
      where('form_type', '==', 'local-issue-video'),
      where('handler_id', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (dateRange) {
      console.log(`[getAcLocalIssueVideoActivities] Filtering by date_submitted range:`, { 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate
      });
      q = query(
        q,
        where('date_submitted', '>=', dateRange.startDate),
        where('date_submitted', '<=', dateRange.endDate)
      );
    }

    const snapshot = await getDocs(q);
    console.log(`[getAcLocalIssueVideoActivities] Found ${snapshot.size} local issue video activities`);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert createdAt from milliseconds to ISO string
      const createdAt = data.createdAt 
        ? new Date(data.createdAt).toISOString() 
        : new Date().toISOString();
      
      return {
        id: doc.id,
        form_type: 'local-issue-video',
        date_submitted: data.date_submitted || new Date(createdAt).toISOString().split('T')[0],
        assembly: data.assembly || '',
        description: data.description || '',
        video_link: data.video_link || '',
        storage_path: data.storage_path || '',
        handler_id: data.handler_id || '',
        late_entry: data.late_entry || false,
        image_links: data.image_links || [],
        createdAt: createdAt
      } as LocalIssueVideoActivity;
    });
  } catch (error) {
    console.error('Error fetching AC local issue video activities:', error);
    throw error;
  }
}

export async function getSlpTrainingActivity(
  slp: {
    uid: string;
    role: string;
    handler_id?: string;
  },
  dateRange?: { startDate: string; endDate: string }
): Promise<SlpTrainingActivity[]> {
  console.log(`[getSlpTrainingActivity] Fetching training activities for ${slp.role}: ${slp.uid}`);
  if (dateRange) {
    console.log(`[getSlpTrainingActivity] Filtering by date range: ${dateRange.startDate} to ${dateRange.endDate}`);
  }
  
  try {
    const slpActivityCollection = collection(db, 'slp-activity');
    
    // Arrays to store queries
    const queries = [];
    
    if (slp.role === 'SLP') {
      // Individual SLP - search by uid
      console.log(`[getSlpTrainingActivity] Individual SLP - Searching for handler_id: '${slp.uid}'`);
      let baseQuery1 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('form_type', '==', 'slp-training')
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('handler_id', '==', slp.uid),
        where('type', '==', 'slp-training')
      );
      
      // Add date filtering if provided
      if (dateRange) {
        // Convert date strings to ISO format for createdAt comparison
        const startDateISO = new Date(dateRange.startDate + 'T00:00:00.000Z').toISOString();
        const endDateISO = new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString();
        
        console.log(`[getSlpTrainingActivity] Individual SLP - Filtering by date range: ${dateRange.startDate} to ${dateRange.endDate}`);
        console.log(`[getSlpTrainingActivity] Individual SLP - Query conditions: createdAt >= '${startDateISO}' AND createdAt <= '${endDateISO}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
        baseQuery2 = query(
          baseQuery2,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    } else {
      // Associated SLP - search by both document ID and handler_id
      const possibleIds = [slp.uid];
      
      // Add handler_id to possible IDs if available
      if (slp.handler_id) {
        possibleIds.push(slp.handler_id);
        console.log(`[getSlpTrainingActivity] Using multiple IDs for ASLP: ${possibleIds.join(', ')}`);
      } else {
        console.log(`[getSlpTrainingActivity] No handler_id available for ASLP, using only doc ID`);
      }
      
      let baseQuery1 = query(
        slpActivityCollection,
        where('form_type', '==', 'slp-training'),
        where('handler_id', 'in', possibleIds)
      );
      let baseQuery2 = query(
        slpActivityCollection,
        where('type', '==', 'slp-training'),
        where('handler_id', 'in', possibleIds)
      );
      
      // Add date filtering if provided
      if (dateRange) {
        // Convert date strings to ISO format for createdAt comparison
        const startDateISO = new Date(dateRange.startDate + 'T00:00:00.000Z').toISOString();
        const endDateISO = new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString();
        
        console.log(`[getSlpTrainingActivity] Associated SLP - Filtering by date range: ${dateRange.startDate} to ${dateRange.endDate}`);
        console.log(`[getSlpTrainingActivity] Associated SLP - Query conditions: createdAt >= '${startDateISO}' AND createdAt <= '${endDateISO}'`);
        
        baseQuery1 = query(
          baseQuery1,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
        baseQuery2 = query(
          baseQuery2,
          where('createdAt', '>=', startDateISO),
          where('createdAt', '<=', endDateISO)
        );
      }
      
      queries.push(baseQuery1, baseQuery2);
    }
    
    console.log(`[getSlpTrainingActivity] Executing ${queries.length} queries...`);
    
    // Execute all queries in parallel
    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    
    console.log(`[getSlpTrainingActivity] Queries executed. Total documents across all queries: ${
      snapshots.reduce((total, snapshot) => total + snapshot.size, 0)
    }`);
    
    // Process results, ensuring no duplicates
    const activitiesMap = new Map<string, SlpTrainingActivity>();
    
    snapshots.forEach((snapshot, index) => {
      console.log(`[getSlpTrainingActivity] Query ${index + 1} returned ${snapshot.size} documents`);
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[getSlpTrainingActivity] Document ${doc.id}: date_submitted = '${data.date_submitted}'`);
        activitiesMap.set(doc.id, {
          id: doc.id,
          ...data
        } as SlpTrainingActivity);
      });
    });
    
    const activities = Array.from(activitiesMap.values());
    console.log(`[getSlpTrainingActivity] Found ${activities.length} training activities`);
    console.log('[getSlpTrainingActivity] Documents:', JSON.stringify(activities, null, 2));
    
    return activities;
  } catch (error) {
    console.error('[getSlpTrainingActivity] Error fetching training activities:', error);
    return [];
  }
} 