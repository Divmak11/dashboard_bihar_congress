"use client";

import { useState, useEffect } from "react";
import DashboardHome from "../../components/DashboardHome";
import { getWtmSlpSummary, getWtmSlpStakeholders, getCoordinatorDetails, getCurrentAdminUser, getAssociatedSlps, getSlpMemberActivity } from "../utils/fetchFirebaseData";
import { WtmSlpSummary, User, CoordinatorDetails, AdminUser, MemberActivity } from "../../models/types";
import LogoutButton from "../../components/LogoutButton";
import { auth } from "../utils/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

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
  
  const [startDate, setStartDate] = useState<string>(
    threeMonthsAgo.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    today.toISOString().split('T')[0]
  );

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
  const [coordinatorDetails, setCoordinatorDetails] = useState<CoordinatorDetails | null>(null);
  const [loadingCoordinator, setLoadingCoordinator] = useState<boolean>(false);
  
  // State for member activities
  const [memberActivities, setMemberActivities] = useState<MemberActivity[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState<boolean>(false);

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

  // Fetch overall summary data - independent from assembly selection
  useEffect(() => {
    console.log('[WTMSLPPage] Overall summary data effect triggered');
    
    async function fetchOverallSummaryData() {
      console.log('[WTMSLPPage] Fetching overall summary data...');
      try {
        setIsSummaryLoading(true);
        
        // Fetch summary data from Firebase WITHOUT any assembly filter
        console.log(`[WTMSLPPage] Calling getWtmSlpSummary with dates: ${startDate} to ${endDate} (no assembly filter)`);
        
        // Never filter by assembly for the overall summary
        const summaryResult: WtmSlpSummary = await getWtmSlpSummary(startDate, endDate, undefined);
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
  }, [startDate, endDate]); // Only depends on date range, not assembly selection

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
              const stakeholders = await getWtmSlpStakeholders();
              console.log(`[WTMSLPPage] Admin view: Received ${stakeholders.length} stakeholders`);
              setCoordinators(stakeholders);
              
              // Now fetch all associated SLPs for admins
              console.log('[WTMSLPPage] Admin user, fetching all associated SLPs');
              const allSlps = await getAssociatedSlps();
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

  // Handle coordinator selection
  const handleCoordinatorSelect = (uid: string | null) => {
    console.log(`[WTMSLPPage] Coordinator selected: ${uid}`);
    setSelectedCoordinatorUid(uid);
  };

  // Handle date change
  const handleDateChange = (start: string, end: string) => {
    console.log(`[WTMSLPPage] Date range changed: ${start} to ${end}`);
    setStartDate(start);
    setEndDate(end);
  };

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

  // Create formatted coordinators list for dropdown
  const formattedCoordinators = [...coordinators.map(coordinator => ({
    name: coordinator.name || "Unknown",
    assembly: coordinator.assembly || "Unknown",
    uid: coordinator.uid,
    role: coordinator.role // Include the role for display in the dropdown
  })), ...associatedSlps.map(slp => ({
    name: slp.name || "Unknown",
    assembly: selectedAssembly || "Unknown",
    uid: slp.uid,
    handler_id: slp.handler_id, // Include handler_id for ASLPs
    role: "ASLP" // Mark associated SLPs with a distinct role identifier
  }))];
  
  // Prepare assemblies for dropdown
  const displayAssemblies = isAdmin && allAssemblies.length > 0 ? 
    [{ name: "All Assemblies", value: null }, ...allAssemblies.map(a => ({ name: a, value: a }))] : 
    [{ name: "All Assemblies", value: null }, ...userAssemblies.map(a => ({ name: a, value: a }))];
  
  console.log(`[WTMSLPPage] Formatted ${formattedCoordinators.length} coordinators for dropdown`);
  console.log('[WTMSLPPage] Rendering main component');

  // Fetch coordinator/member details when a coordinator is selected
  useEffect(() => {
    console.log('[WTMSLPPage] Coordinator details effect triggered');
    console.log(`[WTMSLPPage] Selected coordinator UID: ${selectedCoordinatorUid}`);
    
    // Store current list of coordinators in a ref to avoid dependency issues
    const currentCoordinators: FormattedCoordinator[] = formattedCoordinators;
    
    async function fetchCoordinatorData() {
      if (!selectedCoordinatorUid) {
        console.log('[WTMSLPPage] No coordinator selected, clearing details');
        setCoordinatorDetails(null);
        setMemberActivities([]);
        return;
      }
      
      try {
        setLoadingCoordinator(true);
        setIsMembersLoading(true);
        console.log(`[WTMSLPPage] Fetching details for coordinator ${selectedCoordinatorUid}`);
        
        // Find the selected coordinator from the saved list
        const selectedCoordinator = currentCoordinators.find(
          coord => coord.uid === selectedCoordinatorUid
        );
        
        if (!selectedCoordinator) {
          console.error(`[WTMSLPPage] Could not find selected coordinator with UID: ${selectedCoordinatorUid}`);
          setCoordinatorDetails(null);
          setMemberActivities([]);
          return;
        }
        
        console.log(`[WTMSLPPage] Selected coordinator role: ${selectedCoordinator.role}`);
        
        // Different behavior based on role
        if (selectedCoordinator.role === 'Assembly Coordinator') {
          // For Assembly Coordinators, fetch coordinator details as before
          const details = await getCoordinatorDetails(
            selectedCoordinatorUid, 
            startDate, 
            endDate,
            selectedAssembly || undefined
          );
          
          console.log('[WTMSLPPage] Coordinator details received:', details);
          setCoordinatorDetails(details);
          setMemberActivities([]); // No member activities for ACs
        } else if (selectedCoordinator.role === 'SLP' || selectedCoordinator.role === 'ASLP') {
          // For SLPs and ASLPs, fetch member activities
          console.log(`[WTMSLPPage] Fetching member activities for ${selectedCoordinator.role}`);
          
          const memberData = await getSlpMemberActivity({
            uid: selectedCoordinatorUid,
            role: selectedCoordinator.role,
            handler_id: selectedCoordinator.handler_id
          });
          
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
          
          setMemberActivities(uniqueMembers);
          setCoordinatorDetails(null); // Set coordinator details to null for SLPs
        }
      } catch (err) {
        console.error("[WTMSLPPage] Error fetching coordinator/member data:", err);
        setCoordinatorDetails(null);
        setMemberActivities([]);
      } finally {
        setLoadingCoordinator(false);
        setIsMembersLoading(false);
        console.log('[WTMSLPPage] Coordinator/member data fetch complete');
      }
    }
    
    fetchCoordinatorData();
    // Remove formattedCoordinators from the dependency array to prevent infinite loops
  }, [selectedCoordinatorUid, startDate, endDate, selectedAssembly]);

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
        coordinatorDetails={coordinatorDetails}
        loadingCoordinator={loadingCoordinator}
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        overallSummary={summary}
        isSummaryLoading={isSummaryLoading}
        memberActivities={memberActivities}
        isMembersLoading={isMembersLoading}
      />
    </div>
  );
} 