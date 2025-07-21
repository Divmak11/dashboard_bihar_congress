"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardHome from "../../components/DashboardHome";
import { getWtmSlpSummary, getWtmSlpStakeholders, getCoordinatorDetails, getCurrentAdminUser, getAssociatedSlps, getSlpMemberActivity, getSlpTrainingActivity, getSlpPanchayatWaActivity, getSlpLocalIssueVideoActivity, getSlpMaiBahinYojnaActivity, getAcLocalIssueVideoActivities } from "../utils/fetchFirebaseData";
import { WtmSlpSummary, User, CoordinatorDetails, AdminUser, MemberActivity, SlpTrainingActivity, PanchayatWaActivity, LocalIssueVideoActivity, MaiBahinYojnaActivity } from "../../models/types";
import LogoutButton from "../../components/LogoutButton";
import { auth } from "../utils/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { formatMeetingForDisplay, convertToMeetingRow, formatMemberActivityForDisplay } from "../utils/meetingHelpers";

// Create a type that matches the expected MeetingRow structure used by DashboardHome
type MeetingRow = {
  [key: string]: string;
};

// Create a type for Associated SLPs that includes handler_id
type AssociatedSlp = {
  name: string;
  uid: string;
  handler_id?: string;
};

// Type for formatted coordinators (used in dropdown)
type FormattedCoordinator = {
  name: string;
  assembly: string;
  uid: string;
  role: string;
  handler_id?: string;
};

export default function WTMSLPPage() {
  console.log('[WTMSLPPage] Component rendering');
  
  // Firebase auth state
  const [user, authLoading, authError] = useAuthState(auth);
  
  const [data, setData] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Default date range - last 3 months
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  
  // Global summary date filter state (independent)
  const [startDate, setStartDate] = useState<string>(
    threeMonthsAgo.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    today.toISOString().split('T')[0]
  );

  // Coordinator-specific date filter state (independent)
  const [coordinatorStartDate, setCoordinatorStartDate] = useState<string>(
    threeMonthsAgo.toISOString().split('T')[0]
  );
  const [coordinatorEndDate, setCoordinatorEndDate] = useState<string>(
    today.toISOString().split('T')[0]
  );

  // Date option state for both filters
  const [globalDateOption, setGlobalDateOption] = useState<string>('last3Months');
  const [coordinatorDateOption, setCoordinatorDateOption] = useState<string>('last3Months');

  // State for user role and assemblies
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userAssemblies, setUserAssemblies] = useState<string[]>([]);
  const [allAssemblies, setAllAssemblies] = useState<string[]>([]);
  
  // State for summary loading and data
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<WtmSlpSummary | null>(null);
  
  // State for selected assembly
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null);

  // State for coordinators and selected coordinator
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [associatedSlps, setAssociatedSlps] = useState<AssociatedSlp[]>([]);
  const [selectedCoordinatorUid, setSelectedCoordinatorUid] = useState<string | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState<FormattedCoordinator | null>(null);
  const [coordinatorDetails, setCoordinatorDetails] = useState<CoordinatorDetails | null>(null);
  const [loadingCoordinator, setLoadingCoordinator] = useState<boolean>(false);
  
  // State for member activities
  const [memberActivities, setMemberActivities] = useState<MemberActivity[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState<boolean>(false);

  // State for SLP activities
  const [slpTrainingActivities, setSlpTrainingActivities] = useState<SlpTrainingActivity[]>([]);
  const [slpPanchayatWaActivities, setSlpPanchayatWaActivities] = useState<PanchayatWaActivity[]>([]);
  const [slpLocalIssueVideoActivities, setSlpLocalIssueVideoActivities] = useState<LocalIssueVideoActivity[]>([]);
  const [slpMaiBahinYojnaActivities, setSlpMaiBahinYojnaActivities] = useState<MaiBahinYojnaActivity[]>([]);
  const [isSlpActivitiesLoading, setIsSlpActivitiesLoading] = useState<boolean>(false);
  
  // State for AC's local issue videos
  const [acLocalIssueVideoActivities, setAcLocalIssueVideoActivities] = useState<LocalIssueVideoActivity[]>([]);
  const [isAcVideosLoading, setIsAcVideosLoading] = useState<boolean>(false);

  // Create formatted coordinators list for dropdown - using useMemo to ensure consistent hook ordering
  const formattedCoordinators = useMemo(() => {
    // First create separate arrays for each role
    const assemblyCoordinators = coordinators
      .filter(coordinator => coordinator.role === 'Assembly Coordinator')
      .map(coordinator => ({
        name: coordinator.name || "Unknown",
        assembly: coordinator.assembly || "Unknown",
        uid: coordinator.uid,
        role: coordinator.role // Include the role for display in the dropdown
      }));
    
    const individualSLPs = coordinators
      .filter(coordinator => coordinator.role === 'SLP')
      .map(coordinator => ({
        name: coordinator.name || "Unknown",
        assembly: coordinator.assembly || "Unknown",
        uid: coordinator.uid,
        role: coordinator.role
      }));
    
    const associatedSLPs = associatedSlps.map(slp => ({
      name: slp.name || "Unknown",
      assembly: selectedAssembly || "Unknown",
      uid: slp.uid,
      handler_id: slp.handler_id, // Include handler_id for ASLPs
      role: "ASLP" // Mark associated SLPs with a distinct role identifier
    }));
    
    // Concatenate in desired order: ACs first, then SLPs, then ASLPs
    return [...assemblyCoordinators, ...individualSLPs, ...associatedSLPs];
  }, [coordinators, associatedSlps, selectedAssembly]);
  
  // Prepare assemblies for dropdown - using useMemo for consistent hook ordering
  const displayAssemblies = useMemo(() => {
    return isAdmin && allAssemblies.length > 0 ? 
      [{ name: "All Assemblies", value: null }, ...allAssemblies.map(a => ({ name: a, value: a }))] : 
      [{ name: "All Assemblies", value: null }, ...userAssemblies.map(a => ({ name: a, value: a }))];
  }, [isAdmin, allAssemblies, userAssemblies]);

  // Fetch user role and assemblies
  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;
      
      try {
        const adminUserData = await getCurrentAdminUser(user.uid);
        setAdminUser(adminUserData);
        
        if (adminUserData) {
          // Check if user is an admin
          const userIsAdmin = adminUserData.role === 'admin';
          setIsAdmin(userIsAdmin);
          
          // Set user assemblies
          setUserAssemblies(adminUserData.assemblies || []);
          
          // Fetch all assemblies for admins
          if (userIsAdmin) {
            try {
              const response = await fetch('/data/bihar_assemblies.json');
              if (response.ok) {
                const assembliesData = await response.json();
                setAllAssemblies(assembliesData);
              }
            } catch (err) {
              console.error('[WTMSLPPage] Error fetching all assemblies:', err);
            }
          }
        }
      } catch (err) {
        console.error('[WTMSLPPage] Error fetching admin user data:', err);
      }
    }
    
    fetchUserData();
  }, [user]);

  // Fetch overall summary data based on date range but independent of assembly selection
  useEffect(() => {
    console.log('[WTMSLPPage] Overall summary data effect triggered');
    
    async function fetchOverallSummaryData() {
      console.log('[WTMSLPPage] Fetching overall summary data...');
      try {
        setIsSummaryLoading(true);
        
        // Determine which assemblies to use for filtering based ONLY on user role
        let assembliesFilter: string[] | undefined = undefined;
        
        // Never filter by selectedAssembly for overall summary cards
        // Only filter by zonal-incharge assigned assemblies if applicable
        if (adminUser && adminUser.role === 'zonal-incharge' && adminUser.assemblies?.length > 0) {
          // For zonal incharges, always use their assigned assemblies regardless of selection
          assembliesFilter = adminUser.assemblies;
          console.log(`[WTMSLPPage] Filtering overall summary by zonal incharge assemblies: ${adminUser.assemblies.join(', ')}`);
        } else if (adminUser && adminUser.role === 'admin') {
          // For admins, never apply assembly filter - show all data
          assembliesFilter = undefined;
          console.log('[WTMSLPPage] Admin user - showing all assemblies data in overall summary');
        }
        
        console.log(`[WTMSLPPage] Calling getWtmSlpSummary with dates: ${startDate} to ${endDate}`);
        console.log(`[WTMSLPPage] Assembly filter for overall summary: ${assembliesFilter ? (assembliesFilter.length > 0 ? assembliesFilter.join(', ') : 'empty array') : 'undefined'}`);
        
        const summaryResult: WtmSlpSummary = await getWtmSlpSummary(startDate, endDate, assembliesFilter);
        console.log('[WTMSLPPage] Overall summary data received:', summaryResult);
        
        // Store the summary
        setSummary(summaryResult);
      } catch (err) {
        console.error("[WTMSLPPage] Error fetching overall summary data:", err);
      } finally {
        setIsSummaryLoading(false);
        console.log('[WTMSLPPage] Overall summary data fetch complete');
      }
    }
    
    fetchOverallSummaryData();
  }, [startDate, endDate, adminUser]); // Remove selectedAssembly dependency

  // Fetch assembly-dependent data when assembly selection changes
  useEffect(() => {
    console.log('[WTMSLPPage] Assembly-dependent data effect triggered');
    
    async function fetchAssemblyDependentData() {
      console.log('[WTMSLPPage] Fetching assembly-dependent data...');
      try {
        setLoading(true);
        
        // Just initialize data as empty array
        setData([]);
      } catch (err) {
        console.error("[WTMSLPPage] Error fetching assembly-dependent data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
        console.log('[WTMSLPPage] Assembly-dependent data fetch complete');
      }
    }
    
    fetchAssemblyDependentData();
  }, [selectedAssembly]);

  // Fetch coordinators list when assembly selection changes or when admin user data is loaded
  useEffect(() => {
    console.log('[WTMSLPPage] Coordinators effect triggered');
    
    async function fetchCoordinators() {
      console.log('[WTMSLPPage] Fetching coordinators...');
      try {
        // Clear previous selection
        setSelectedCoordinatorUid(null);
        
        // Different behavior based on whether a specific assembly is selected
        if (selectedAssembly) {
          // If a specific assembly is selected, fetch only for that assembly
          console.log(`[WTMSLPPage] Fetching coordinators for specific assembly: ${selectedAssembly}`);
          
          // Fetch stakeholders (ACs and individual SLPs) for the selected assembly
          const stakeholders = await getWtmSlpStakeholders(selectedAssembly);
          console.log(`[WTMSLPPage] Received ${stakeholders.length} stakeholders for specific assembly`);
          setCoordinators(stakeholders);
          
          // Fetch associated SLPs for the selected assembly
          const slps = await getAssociatedSlps(selectedAssembly);
          console.log(`[WTMSLPPage] Received ${slps.length} associated SLPs for specific assembly`);
          setAssociatedSlps(slps);
        } else {
          // If "All Assemblies" is selected, behavior depends on user role
          if (adminUser) {
            if (adminUser.role === 'admin') {
              // Admin users: fetch all stakeholders across all assemblies
              console.log('[WTMSLPPage] Admin user, fetching all coordinators');
              const stakeholders = await getWtmSlpStakeholders(); // No assembly filter
              console.log(`[WTMSLPPage] Admin view: Received ${stakeholders.length} stakeholders`);
              setCoordinators(stakeholders);
              
              // Now fetch all associated SLPs for admins
              console.log('[WTMSLPPage] Admin user, fetching all associated SLPs');
              const allSlps = await getAssociatedSlps(); // No assembly filter
              console.log(`[WTMSLPPage] Admin view: Received ${allSlps.length} associated SLPs`);
              setAssociatedSlps(allSlps);
              
            } else if (adminUser.role === 'zonal-incharge' && adminUser.assemblies?.length > 0) {
              // Zonal Incharge: fetch stakeholders for their assigned assemblies
              console.log(`[WTMSLPPage] Zonal Incharge, fetching coordinators for assigned assemblies: ${adminUser.assemblies.join(', ')}`);
              const stakeholders = await getWtmSlpStakeholders(adminUser.assemblies);
              console.log(`[WTMSLPPage] Zonal Incharge view: Received ${stakeholders.length} stakeholders`);
              setCoordinators(stakeholders);
              
              // Fetch associated SLPs across all assigned assemblies
              const slps = await getAssociatedSlps(adminUser.assemblies);
              console.log(`[WTMSLPPage] Received ${slps.length} associated SLPs across assigned assemblies`);
              setAssociatedSlps(slps);
            } else {
              // Other roles or no assemblies assigned
              console.log('[WTMSLPPage] User has no assigned assemblies or unsupported role');
              setCoordinators([]);
              setAssociatedSlps([]);
            }
          } else {
            // No admin user data available yet
            console.log('[WTMSLPPage] Admin user data not loaded yet');
            setCoordinators([]);
            setAssociatedSlps([]);
          }
        }
      } catch (err) {
        console.error("[WTMSLPPage] Error fetching coordinators:", err);
        setCoordinators([]);
        setAssociatedSlps([]);
      }
    }
    
    fetchCoordinators();
  }, [selectedAssembly, adminUser]);

  // Handle assembly selection
  const handleAssemblySelect = (assembly: string | null) => {
    console.log(`[WTMSLPPage] Assembly selected: ${assembly}`);
    setSelectedAssembly(assembly);
  };

  // Handle coordinator selection - fix selection issue
  const handleCoordinatorSelect = (uid: string | null) => {
    console.log(`[WTMSLPPage] Coordinator selected: ${uid}`);
    
    // Clear previous data immediately to indicate change
    setCoordinatorDetails(null);
    setMemberActivities([]);
    
    // Update selected UID
    setSelectedCoordinatorUid(uid);
    
    // Find and store the complete coordinator object
    if (uid) {
      const coordinator = formattedCoordinators.find(c => c.uid === uid);
      if (coordinator) {
        console.log(`[WTMSLPPage] Found coordinator: ${coordinator.name}, Assembly: ${coordinator.assembly}, Role: ${coordinator.role}`);
        setSelectedCoordinator(coordinator);
      } else {
        console.log(`[WTMSLPPage] Could not find coordinator with UID: ${uid}`);
        setSelectedCoordinator(null);
      }
    } else {
      setSelectedCoordinator(null);
    }
  };

  // Handle global summary date change (independent)
  const handleDateChange = (start: string, end: string, option: string) => {
    console.log(`[WTMSLPPage] Global date range changed: ${start} to ${end}, option: ${option}`);
    setStartDate(start);
    setEndDate(end);
    setGlobalDateOption(option);
  };

  // Handle coordinator-specific date change (independent)
  const handleCoordinatorDateChange = (start: string, end: string, option: string) => {
    console.log(`[WTMSLPPage] Coordinator date range changed: ${start} to ${end}, option: ${option}`);
    setCoordinatorStartDate(start);
    setCoordinatorEndDate(end);
    setCoordinatorDateOption(option);
  };

  // Fetch coordinator/member details when a coordinator is selected
  useEffect(() => {
    console.log('[WTMSLPPage] Coordinator details effect triggered');
    console.log(`[WTMSLPPage] Selected coordinator UID: ${selectedCoordinatorUid}`);
    
    async function fetchCoordinatorData() {
      if (!selectedCoordinatorUid || !selectedCoordinator) {
        console.log('[WTMSLPPage] No coordinator selected, clearing details');
        setCoordinatorDetails(null);
        setMemberActivities([]);
        return;
      }
      
      try {
        setLoadingCoordinator(true);
        setIsMembersLoading(true);
        console.log(`[WTMSLPPage] Fetching details for coordinator ${selectedCoordinatorUid}`);
        
        console.log(`[WTMSLPPage] Selected coordinator role: ${selectedCoordinator.role}`);
        
        // Different behavior based on role
        if (selectedCoordinator.role === 'Assembly Coordinator') {
          // For Assembly Coordinators, fetch coordinator details
          // Always use the coordinator's assembly from their details, NOT the selectedAssembly
          // This ensures we get all their data even if "All Assemblies" is selected
          const coordinatorAssembly = selectedCoordinator.assembly;
          
          // For "All Time" selection, provide a very wide date range as fallback
          const acStartDate = coordinatorStartDate || '2000-01-01';
          const acEndDate = coordinatorEndDate || new Date().toISOString().split('T')[0];
          
          console.log(`[WTMSLPPage] Fetching coordinator details with their assembly: ${coordinatorAssembly}`);
          console.log(`[WTMSLPPage] Using date range: ${acStartDate} to ${acEndDate}`);
          
          const details = await getCoordinatorDetails(
            selectedCoordinatorUid, 
            acStartDate, 
            acEndDate,
            coordinatorAssembly // Always pass the coordinator's specific assembly
          );
          
          console.log('[WTMSLPPage] Coordinator details received:', details);
          
          // Make sure meetings data exists for rendering in component
          if (details) {
            // Format each meeting for display using the helper functions
            const formattedMeetings = details.meetings.map(meeting => {
              // Log the raw meeting data
              console.log('[WTMSLPPage] Raw meeting data:', meeting);
              
              // Format the meeting data
              const displayData = formatMeetingForDisplay(meeting, selectedCoordinator.name, coordinatorAssembly);
              
              // Convert to the row format expected by DashboardHome
              const meetingRow = convertToMeetingRow(displayData);
              
              // Ensure all critical fields are present
              if (!meetingRow["leader name"]) {
                meetingRow["leader name"] = meeting.name || "Unknown Leader";
              }
              if (!meetingRow["phone number"]) {
                meetingRow["phone number"] = meeting.mobileNumber || "";
              }
              if (!meetingRow["assembly name"]) {
                meetingRow["assembly name"] = coordinatorAssembly || meeting.assembly || "";
              }
              if (!meetingRow["assembly field coordinator"]) {
                meetingRow["assembly field coordinator"] = selectedCoordinator.name || "";
              }
              if (!meetingRow["recommended position"]) {
                meetingRow["recommended position"] = meeting.recommendedPosition || "";
              }
              if (!meetingRow["onboarding status"]) {
                meetingRow["onboarding status"] = meeting.onboardingStatus || "";
              }
              
              return meetingRow;
            });

            // Log a sample formatted meeting to see what fields are available
            if (formattedMeetings.length > 0) {
              console.log('[WTMSLPPage] Sample formatted meeting:', formattedMeetings[0]);
            }

            console.log(`[WTMSLPPage] Formatted ${formattedMeetings.length} meetings for display`);
            
            // Ensure the coordinator's meetings are accessible in DashboardHome as detailedMeetings
            details.detailedMeetings = formattedMeetings;
            setCoordinatorDetails(details);
          } else {
            setCoordinatorDetails(null);
          }
          
          setMemberActivities([]); // No member activities for ACs
          
          // Clear SLP activities for Assembly Coordinators
          setSlpTrainingActivities([]);
          setSlpPanchayatWaActivities([]);
          setSlpLocalIssueVideoActivities([]);
          setSlpMaiBahinYojnaActivities([]);
          setIsSlpActivitiesLoading(false);
          // Note: AC video fetching is handled separately below
        } else if (selectedCoordinator.role === 'SLP' || selectedCoordinator.role === 'ASLP') {
          // For SLPs and ASLPs, fetch member activities
          console.log(`[WTMSLPPage] Fetching member activities for ${selectedCoordinator.role}`);
          
          const memberData = await getSlpMemberActivity({
            uid: selectedCoordinatorUid,
            role: selectedCoordinator.role,
            handler_id: selectedCoordinator.handler_id
          });
          
          // --- Add debug logging for SLP/ASLP member data ---
          console.log(`[DEBUG] Raw SLP/ASLP Activity Data for ${selectedCoordinator.name}:`, JSON.stringify(memberData.slice(0, 2), null, 2));
          if (memberData.length > 0) {
            console.log(`[DEBUG] Sample member activity fields:`, Object.keys(memberData[0]));
            console.log(`[DEBUG] Sample member activity data:`, memberData[0]);
          }
          // --- End of debug logging ---
          
          console.log(`[WTMSLPPage] Received ${memberData.length} member activities`);
          
          // De-duplicate member activities by name
          const uniqueMembersMap = new Map();
          memberData.forEach(member => {
            if (member.name) {
              uniqueMembersMap.set(member.name, member);
            }
          });
          
          const uniqueMembers = Array.from(uniqueMembersMap.values());
          console.log(`[WTMSLPPage] After de-duplication: ${uniqueMembers.length} unique members`);
          
          // Format member activities into the same format as meetings
          const formattedMemberActivities = uniqueMembers.map(member => {
            const displayData = formatMemberActivityForDisplay(member, selectedCoordinator.name, selectedCoordinator.assembly);
            return convertToMeetingRow(displayData);
          });

          console.log(`[WTMSLPPage] Formatted ${formattedMemberActivities.length} member activities for display`);

          // Calculate summary stats for member activities
          const totalMembers = formattedMemberActivities.length;
          
          // For SLPs, we don't have a direct equivalent to "SLPs added" or "onboarded"
          // Instead, we'll count active members (not marked as inactive)
          const activeMembers = uniqueMembers.filter(
            member => !member.status || member.status.toLowerCase() !== 'inactive'
          ).length;
          
          console.log(`[WTMSLPPage] Member activity summary: totalMembers=${totalMembers}, activeMembers=${activeMembers}`);

          // Create a CoordinatorDetails object for member activities
          const memberDetails: CoordinatorDetails = {
            personalInfo: {
              uid: selectedCoordinatorUid,
              name: selectedCoordinator.name,
              assembly: selectedCoordinator.assembly,
              role: selectedCoordinator.role,
              departmentHead: "Mr. Ravi Pandit - WTM-SLP"
            },
            meetingsSummary: {
              meetings: totalMembers,
              slpsAdded: activeMembers, // Use active members as the equivalent of "SLPs added"
              onboarded: activeMembers  // Use active members as the equivalent of "onboarded"
            },
            meetings: [], // Empty array as these aren't actual meetings
            activities: [], // Empty array as these aren't activities
            whatsappGroups: [], // Empty array as these aren't WhatsApp groups
            members: uniqueMembers, // Store the original member data
            detailedMeetings: formattedMemberActivities // Store the formatted member activities
          };

          // Set both coordinatorDetails for the summary cards and formatted list view
          // and memberActivities for the original member data display
          setCoordinatorDetails(memberDetails);
          // Set memberActivities for SLP activity tabs display
          setMemberActivities(uniqueMembers);
          
          // Fetch all SLP activities in parallel
          console.log(`[WTMSLPPage] Fetching all SLP activities for ${selectedCoordinator.role}`);
          setIsSlpActivitiesLoading(true);
          
          try {
            const slpObj = {
              uid: selectedCoordinatorUid,
              role: selectedCoordinator.role,
              handler_id: selectedCoordinator.handler_id
            };
            
            // For "All Time" selection, pass undefined to fetch all data
            const coordinatorDateRange = (coordinatorStartDate && coordinatorEndDate) 
              ? { startDate: coordinatorStartDate, endDate: coordinatorEndDate }
              : undefined;
            
            console.log(`[WTMSLPPage] SLP date filtering debug:`, {
              coordinatorStartDate,
              coordinatorEndDate,
              coordinatorDateRange,
              isAllTime: !coordinatorStartDate || !coordinatorEndDate
            });
            
            const [trainingData, panchayatWaData, localIssueVideoData, maiBahinYojnaData] = await Promise.all([
              getSlpTrainingActivity(slpObj, coordinatorDateRange),
              getSlpPanchayatWaActivity(slpObj, coordinatorDateRange),
              getSlpLocalIssueVideoActivity(slpObj, coordinatorDateRange),
              getSlpMaiBahinYojnaActivity(slpObj, coordinatorDateRange)
            ]);
            
            console.log(`[WTMSLPPage] SLP activities fetched:`, {
              training: trainingData.length,
              panchayatWa: panchayatWaData.length,
              localIssueVideo: localIssueVideoData.length,
              maiBahinYojna: maiBahinYojnaData.length
            });
            
            // Update state with fetched activities
            setSlpTrainingActivities(trainingData);
            setSlpPanchayatWaActivities(panchayatWaData);
            setSlpLocalIssueVideoActivities(localIssueVideoData);
            setSlpMaiBahinYojnaActivities(maiBahinYojnaData);
          } catch (error) {
            console.error('[WTMSLPPage] Error fetching SLP activities:', error);
            // Clear activities on error
            setSlpTrainingActivities([]);
            setSlpPanchayatWaActivities([]);
            setSlpLocalIssueVideoActivities([]);
            setSlpMaiBahinYojnaActivities([]);
          } finally {
            setIsSlpActivitiesLoading(false);
          }
        }
        
        // Fetch AC's local issue videos (for Assembly Coordinators only)
        // This runs independently of role-specific logic to handle date changes
        if (selectedCoordinator.role === 'Assembly Coordinator') {
          // For "All Time" selection, provide a very wide date range as fallback
          const acVideoStartDate = coordinatorStartDate || '2000-01-01';
          const acVideoEndDate = coordinatorEndDate || new Date().toISOString().split('T')[0];
          
          console.log(`[WTMSLPPage] Fetching AC's local issue videos with coordinator date range:`, {
            coordinatorStartDate,
            coordinatorEndDate,
            dateRangeObject: { startDate: acVideoStartDate, endDate: acVideoEndDate }
          });
          setIsAcVideosLoading(true);
          try {
            const videos = await getAcLocalIssueVideoActivities(
              selectedCoordinatorUid,
              { startDate: acVideoStartDate, endDate: acVideoEndDate }
            );
            console.log(`[WTMSLPPage] Fetched ${videos.length} local issue videos for AC`);
            setAcLocalIssueVideoActivities(videos);
          } catch (error) {
            console.error('[WTMSLPPage] Error fetching AC local issue videos:', error);
            setAcLocalIssueVideoActivities([]);
          } finally {
            setIsAcVideosLoading(false);
          }
        }
      } catch (err) {
        console.error("[WTMSLPPage] Error fetching coordinator/member data:", err);
        setCoordinatorDetails(null);
        setMemberActivities([]);
        
        // Clear SLP activities on error
        setSlpTrainingActivities([]);
        setSlpPanchayatWaActivities([]);
        setSlpLocalIssueVideoActivities([]);
        setSlpMaiBahinYojnaActivities([]);
        setIsSlpActivitiesLoading(false);
      } finally {
        setLoadingCoordinator(false);
        setIsMembersLoading(false);
        console.log('[WTMSLPPage] Coordinator/member data fetch complete');
      }
    }
    
    fetchCoordinatorData();
  }, [selectedCoordinatorUid, selectedCoordinator, coordinatorStartDate, coordinatorEndDate, selectedAssembly]);

  console.log(`[WTMSLPPage] Formatted ${formattedCoordinators.length} coordinators for dropdown`);
  console.log('[WTMSLPPage] Rendering main component');

  // Loading state
  if (authLoading) {
    console.log('[WTMSLPPage] Rendering auth loading state');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (authError || error) {
    console.log(`[WTMSLPPage] Rendering error state: ${authError || error}`);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {authError?.message || error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHome
        data={data}
        assemblies={displayAssemblies}
        selectedAssembly={selectedAssembly}
        onAssemblySelect={handleAssemblySelect}
        coordinators={formattedCoordinators}
        onCoordinatorSelect={handleCoordinatorSelect}
        selectedCoordinator={selectedCoordinatorUid}
        selectedCoordinatorObject={selectedCoordinator}
        coordinatorDetails={coordinatorDetails}
        loadingCoordinator={loadingCoordinator}
        startDate={startDate}
        endDate={endDate}
        globalDateOption={globalDateOption}
        onDateChange={handleDateChange}
        coordinatorStartDate={coordinatorStartDate}
        coordinatorEndDate={coordinatorEndDate}
        coordinatorDateOption={coordinatorDateOption}
        onCoordinatorDateChange={handleCoordinatorDateChange}
        overallSummary={summary}
        isSummaryLoading={isSummaryLoading}
        memberActivities={memberActivities}
        isMembersLoading={isMembersLoading}
        slpTrainingActivities={slpTrainingActivities}
        slpPanchayatWaActivities={slpPanchayatWaActivities}
        slpLocalIssueVideoActivities={slpLocalIssueVideoActivities}
        slpMaiBahinYojnaActivities={slpMaiBahinYojnaActivities}
        isSlpActivitiesLoading={isSlpActivitiesLoading}
        acLocalIssueVideoActivities={acLocalIssueVideoActivities}
        isAcVideosLoading={isAcVideosLoading}
      />
    </div>
  );
} 