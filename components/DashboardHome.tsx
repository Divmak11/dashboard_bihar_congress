"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import type { MeetingRow } from "../app/utils/fetchSheetData";
import LogoutButton from "./LogoutButton";
import DateRangeFilter from "./DateRangeFilter";
import { 
  WtmSlpSummary, 
  SlpTrainingActivity, 
  PanchayatWaActivity, 
  MaiBahinYojnaActivity, 
  LocalIssueVideoActivity,
  MemberActivity 
} from "../models/types";
import {
  getSlpTrainingActivity,
  getSlpPanchayatWaActivity,
  getSlpMaiBahinYojnaActivity,
  getSlpLocalIssueVideoActivity,
  getSlpMemberActivity
} from "../app/utils/fetchFirebaseData";

interface DashboardHomeProps {
  data: MeetingRow[];
  coordinators?: { name: string; assembly: string; uid: string; role?: string; handler_id?: string }[];
  onCoordinatorSelect?: (uid: string | null) => void;
  selectedCoordinator?: string | null;
  selectedCoordinatorObject?: { name: string; assembly: string; uid: string; role: string; handler_id?: string } | null;
  coordinatorDetails?: any | null;
  loadingCoordinator?: boolean;
  startDate?: string;
  endDate?: string;
  globalDateOption?: string;
  onDateChange?: (start: string, end: string, option: string) => void;
  // Coordinator-specific date props
  coordinatorStartDate?: string;
  coordinatorEndDate?: string;
  coordinatorDateOption?: string;
  onCoordinatorDateChange?: (start: string, end: string, option: string) => void;
  // New assembly-related props
  assemblies?: { name: string; value: string | null }[];
  selectedAssembly?: string | null;
  onAssemblySelect?: (assembly: string | null) => void;
  // New summary props
  overallSummary?: WtmSlpSummary | null;
  isSummaryLoading?: boolean;
  // New member activities props
  memberActivities?: any[];
  isMembersLoading?: boolean;
  // SLP Activity props
  slpTrainingActivities?: SlpTrainingActivity[];
  slpPanchayatWaActivities?: PanchayatWaActivity[];
  slpMaiBahinYojnaActivities?: MaiBahinYojnaActivity[];
  slpLocalIssueVideoActivities?: LocalIssueVideoActivity[];
  isSlpActivitiesLoading?: boolean;
  // AC's Local Issue Videos
  acLocalIssueVideoActivities?: LocalIssueVideoActivity[];
  isAcVideosLoading?: boolean;
}

// Normalized keys
const KEY_COORDINATOR = "assembly field coordinator";
const KEY_ASSEMBLY = "assembly name";
const KEY_RECOMMENDED_POSITION = "recommended position";
const KEY_ONBOARDING_STATUS = "onboarding status";
const KEY_DATE = "date";

function normalize(str: string) {
  return (str || "").trim().toLowerCase();
}

function parseDate(dateStr: string) {
  // Try to parse as YYYY-MM-DD or DD/MM/YYYY
  if (!dateStr) return null;
  if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr);
  if (/\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr); // fallback
}

const getUniqueCoordinators = (data: MeetingRow[]) => {
  // Map: normalized FC name -> { name, assembly, uid, role }
  const map = new Map<string, { name: string; assembly: string; uid: string; role?: string }>();
  data.forEach((row) => {
    const raw = row[KEY_COORDINATOR] || "";
    const norm = normalize(raw);
    const assembly = row[KEY_ASSEMBLY] || "";
    if (norm && !map.has(norm)) {
      // Use normalized name as the internal UID only when necessary
      map.set(norm, { name: raw.trim(), assembly, uid: norm, role: "Unknown" });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};





export default function DashboardHome({ 
  data, 
  coordinators: externalCoordinators, 
  onCoordinatorSelect,
  selectedCoordinator: externalSelectedUid,
  selectedCoordinatorObject,
  coordinatorDetails,
  loadingCoordinator,
  startDate,
  endDate,
  globalDateOption,
  onDateChange,
  // Coordinator-specific date props
  coordinatorStartDate,
  coordinatorEndDate,
  coordinatorDateOption,
  onCoordinatorDateChange,
  // New assembly-related props
  assemblies,
  selectedAssembly,
  onAssemblySelect,
  // New summary props
  overallSummary,
  isSummaryLoading,
  // New member activities props
  memberActivities,
  isMembersLoading = false,
  // SLP Activity props
  slpTrainingActivities = [],
  slpPanchayatWaActivities = [],
  slpMaiBahinYojnaActivities = [],
  slpLocalIssueVideoActivities = [],
  isSlpActivitiesLoading = false,
  // AC's Local Issue Videos
  acLocalIssueVideoActivities = [],
  isAcVideosLoading = false
}: DashboardHomeProps) {
  console.log('[DashboardHome] Rendering with data length:', data.length);
  console.log('[DashboardHome] External props:', {
    hasCoordinators: !!externalCoordinators,
    coordinatorsCount: externalCoordinators?.length,
    selectedCoordinator: externalSelectedUid,
    hasCoordinatorDetails: !!coordinatorDetails,
    loadingCoordinator,
    startDate,
    endDate,
    hasAssemblies: !!assemblies,
    assembliesCount: assemblies?.length,
    selectedAssembly
  });

  // --- Global Date Filtering ---
  const globalDateRange = useMemo(() => {
    console.log(`[DashboardHome] Computing globalDateRange from props. Start: ${startDate}, End: ${endDate}`);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Normalize the dates to beginning/end of day
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    return [start, end];
  }, [startDate, endDate]);

  // Handle assembly selection
  const handleAssemblyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log(`[DashboardHome] Assembly dropdown changed to: ${value}`);
    
    // Convert empty string to null, otherwise use the value
    const assemblyValue = value === "" ? null : value;
    
    if (onAssemblySelect) {
      onAssemblySelect(assemblyValue);
    }
  };

  const filteredData = useMemo(() => {
    const [start, end] = globalDateRange;
    console.log(`[DashboardHome] Filtering data by date range. Start: ${start}, End: ${end}, Data length: ${data.length}`);
    if (!start && !end) return data;
    return data.filter((row) => {
      const d = parseDate(row[KEY_DATE]);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [data, globalDateRange]);

  // Print first 5 rows of the data for debugging
  useEffect(() => {
    console.log("[DashboardHome] First 5 rows of data:", data.slice(0, 5));
    const uniquePositions = Array.from(
      new Set(data.map((row) => row[KEY_RECOMMENDED_POSITION]))
    );
    console.log("[DashboardHome] Unique 'Recommended Position' values:", uniquePositions);

    // Print all unique normalized recommended position values
    const uniqueNormalizedPositions = Array.from(
      new Set(data.map((row) => normalize(row[KEY_RECOMMENDED_POSITION])))
    );
    console.log("[DashboardHome] Unique normalized 'Recommended Position' values:", uniqueNormalizedPositions);

    // Print first 20 rows being counted as SLP
    const slpRows = data.filter(
      (row) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp"
    );
    console.log("[DashboardHome] First few rows counted as SLP:", slpRows.slice(0, 5));
    console.log("[DashboardHome] Total rows counted as SLP:", slpRows.length);
  }, [data]);

  // --- Coordinator handling ---
  // Use internally generated coordinators if no external ones provided
  const internalCoordinators = useMemo(() => {
    console.log("[DashboardHome] Computing internal coordinators from data");
    return getUniqueCoordinators(data);
  }, [data]);
  
  const displayCoordinators = externalCoordinators || internalCoordinators;
  console.log("[DashboardHome] Using coordinators:", {
    source: externalCoordinators ? "external" : "internal", 
    count: displayCoordinators.length
  });
  
  // Allow selection via UID if external coordinators provided, or via name if using internal
  const [selectedName, setSelectedName] = useState<string | null>(null);
  
  // If using external coordinators and we have a selected UID, find the name
  useEffect(() => {
    if (externalCoordinators && externalSelectedUid) {
      const selectedCoord = externalCoordinators.find(c => c.uid === externalSelectedUid);
      if (selectedCoord) {
        console.log(`[DashboardHome] Found coordinator name "${selectedCoord.name}" for UID ${externalSelectedUid}`);
        setSelectedName(selectedCoord.name);
      } else {
        console.log(`[DashboardHome] No coordinator found for UID ${externalSelectedUid}`);
        setSelectedName(null);
      }
    }
  }, [externalCoordinators, externalSelectedUid]);
  
  // Handle coordinator selection - either by name (internal) or UID (external)
  const handleCoordinatorSelect = (name: string | null) => {
    console.log(`[DashboardHome] handleCoordinatorSelect called with name: ${name}`);
    setSelectedName(name);
    
    if (onCoordinatorSelect) {
      // Find the UID for this name
      const selectedCoord = name ? displayCoordinators.find(c => c.name === name) : null;
      const uid = selectedCoord?.uid || null;
      console.log(`[DashboardHome] Calling external onCoordinatorSelect with UID: ${uid}`);
      onCoordinatorSelect(uid);
    }
  };

  // --- Coordinator Date Filtering ---
  const coordinatorDateRange = useMemo(() => {
    console.log(`[DashboardHome] Computing coordinatorDateRange from props. Start: ${coordinatorStartDate}, End: ${coordinatorEndDate}`);
    const start = coordinatorStartDate ? new Date(coordinatorStartDate) : null;
    const end = coordinatorEndDate ? new Date(coordinatorEndDate) : null;
    
    // Normalize the dates to beginning/end of day
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    return [start, end];
  }, [coordinatorStartDate, coordinatorEndDate]);

  // --- Coordinator Data & Filtering ---
  const coordinatorData = useMemo(() => {
    // If we have external coordinator details, no need to filter from data
    if (externalCoordinators && coordinatorDetails) {
      console.log("[DashboardHome] Using external coordinator data");
      return []; // The data for this coordinator is passed directly via props
    }
    
    // Otherwise filter from the data
    if (!selectedName) {
      console.log("[DashboardHome] No coordinator selected, returning empty array");
      return [];
    }
    console.log(`[DashboardHome] Filtering data for coordinator: ${selectedName}`);
    let rows = data.filter((row) => normalize(row[KEY_COORDINATOR]) === normalize(selectedName));
    console.log(`[DashboardHome] Found ${rows.length} rows for this coordinator`);
    
    const [start, end] = coordinatorDateRange;
    if (start || end) {
      rows = rows.filter((row) => {
        const d = parseDate(row[KEY_DATE]);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
      console.log(`[DashboardHome] After date filtering: ${rows.length} rows`);
    }
    return rows;
  }, [data, selectedName, coordinatorDateRange, externalCoordinators, coordinatorDetails]);

  // --- FC Name & Assembly ---
  const coordinatorAssembly = useMemo(() => {
    console.log(`[DashboardHome] Computing selected assembly for: ${selectedName}`);
    
    // First, check if we have the selectedCoordinatorObject with assembly info
    if (selectedCoordinatorObject && selectedCoordinatorObject.assembly) {
      console.log("[DashboardHome] Using assembly from selectedCoordinatorObject:", selectedCoordinatorObject.assembly);
      return selectedCoordinatorObject.assembly;
    }
    
    // Then check coordinator details from Firebase
    if (coordinatorDetails && coordinatorDetails.personalInfo) {
      console.log("[DashboardHome] Using assembly from coordinator details:", coordinatorDetails.personalInfo.assembly);
      return coordinatorDetails.personalInfo.assembly || "";
    }
    
    // Finally, fall back to finding it in the coordinators list
    if (!selectedName) return "";
    const found = displayCoordinators.find((c) => normalize(c.name) === normalize(selectedName));
    console.log("[DashboardHome] Found assembly from coordinators list:", found?.assembly);
    return found?.assembly || "";
  }, [selectedName, displayCoordinators, coordinatorDetails, selectedCoordinatorObject]);

  // --- Summary Stats ---
  // Directly use the aggregated values from the overallSummary prop.
  const totalMeetings = overallSummary?.totalMeetings ?? 0;
  const totalSLPs = overallSummary?.totalSlps ?? 0;
  const totalOnboarded = overallSummary?.totalOnboarded ?? 0;

  // --- FC Summary Stats ---
  // Apply date filtering for coordinator data
  const dateFilteredCoordinatorMeetings = useMemo(() => {
    if (!coordinatorDetails?.detailedMeetings) return coordinatorData;
    
    const [start, end] = coordinatorDateRange;
    if (!start && !end) return coordinatorDetails.detailedMeetings;
    
    return coordinatorDetails.detailedMeetings.filter((row: MeetingRow) => {
      const d = parseDate(row["date"]);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [coordinatorDetails, coordinatorDateRange, coordinatorData]);
  
  // Use the date-filtered data to calculate summary stats
  const coordinatorMeetings = dateFilteredCoordinatorMeetings.length;
    
  const coordinatorSLPs = dateFilteredCoordinatorMeetings.filter(
    (row: MeetingRow) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp"
  ).length;
    
  const coordinatorOnboarded = dateFilteredCoordinatorMeetings.filter(
    (row: MeetingRow) => normalize(row[KEY_ONBOARDING_STATUS]) === "onboarded"
  ).length;
  
  console.log("[DashboardHome] Coordinator summary stats:", {
    meetings: coordinatorMeetings,
    slps: coordinatorSLPs,
    onboarded: coordinatorOnboarded
  });

  // --- FC Summary Card Filtering ---
  const [fcFilter, setFcFilter] = useState<null | "meetings" | "onboarded" | "slp" | "videos">(null);
  
  // --- SLP Activity States ---
  const [activeTab, setActiveTab] = useState<string>('members');
  const filteredCoordinatorData = useMemo(() => {
    console.log(`[DashboardHome] Filtering coordinator data by: ${fcFilter || 'none'}`);
    
    // Apply date filtering first
    const filterByFcDate = (rows: MeetingRow[]) => {
      const [start, end] = coordinatorDateRange;
      if (!start && !end) return rows;
      
      return rows.filter(row => {
        const d = parseDate(row["date"]);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    };
    
    // If we have coordinator details with detailed meetings from Firebase, use that
    if (coordinatorDetails?.detailedMeetings) {
      console.log(`[DashboardHome] Using detailed meetings from coordinatorDetails (${coordinatorDetails.detailedMeetings.length} meetings)`);
      
      // First filter by date
      let meetings = filterByFcDate(coordinatorDetails.detailedMeetings);
      console.log(`[DashboardHome] After date filtering: ${meetings.length} meetings`);
      
      // Check if this is SLP/ASLP data (which won't have recommendedPosition or onboardingStatus)
      const isSLPData = selectedCoordinatorObject?.role === 'SLP' || selectedCoordinatorObject?.role === 'ASLP';
      
      // Then apply the card filter
      if (fcFilter === "onboarded") {
        if (isSLPData) {
          // For SLP/ASLP data, we treat all entries as "active" since there's no onboarding concept
          return meetings;
        } else {
          // For AC data, filter by onboarding status
          return meetings.filter((row: MeetingRow) => normalize(row[KEY_ONBOARDING_STATUS]) === "onboarded");
        }
      }
      if (fcFilter === "slp") {
        if (isSLPData) {
          // For SLP/ASLP data, we treat all entries as "members" since there's no SLP concept
          return meetings;
        } else {
          // For AC data, filter by recommended position
          return meetings.filter((row: MeetingRow) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp");
        }
      }
      return meetings;
    }
    
    // Otherwise fall back to the local data filtering
    const dateFilteredData = filterByFcDate(coordinatorData);
    
    if (!fcFilter) return dateFilteredData;
    if (fcFilter === "meetings") return dateFilteredData;
    if (fcFilter === "onboarded") return dateFilteredData.filter((row) => normalize(row[KEY_ONBOARDING_STATUS]) === "onboarded");
    if (fcFilter === "slp") return dateFilteredData.filter((row) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp");
    return dateFilteredData;
  }, [coordinatorData, fcFilter, coordinatorDetails, coordinatorDateRange, selectedCoordinatorObject?.role]);

  // --- UI ---
  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header with Logout Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">WTM-SLP Dashboard</h1>
        <div className="flex-shrink-0">
          <LogoutButton />
        </div>
      </div>
      
      {/* Global Date Filter */}
      <DateRangeFilter
        label="Global Summary Filter"
        startDate={startDate || ''}
        endDate={endDate || ''}
        selectedOption={globalDateOption || 'all'}
        onDateChange={(start, end, option) => onDateChange?.(start, end, option)}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Meetings Done" value={totalMeetings} isLoading={isSummaryLoading} />
        <SummaryCard label="Total SLPs" value={totalSLPs} isLoading={isSummaryLoading} />
        <SummaryCard label="Total Onboarded" value={totalOnboarded} isLoading={isSummaryLoading} />
      </div>

      {/* Assembly Dropdown */}
      {assemblies && assemblies.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <div className="w-full max-w-xs">
            <label htmlFor="assembly-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Assembly
            </label>
            <select
              id="assembly-select"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedAssembly || ""}
              onChange={handleAssemblyChange}
            >
              {assemblies.map((assembly, index) => (
                <option key={index} value={assembly.value || ""}>
                  {assembly.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Coordinator Search/Select - Always enabled if coordinators are available */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {externalCoordinators && externalCoordinators.length > 0 ? (
        <CoordinatorSearchDropdown
          coordinators={displayCoordinators}
          selected={selectedName}
          setSelected={handleCoordinatorSelect}
        />
        ) : (
          <div className="w-full max-w-xs text-gray-500 italic">
            No coordinators available
          </div>
        )}
      </div>

      {/* Coordinator Summary */}
      {selectedName && (
        <div className="space-y-4">
          {/* Assembly (left) and FC Name (right) */}
          <div className="flex items-center justify-between mb-2">
            {coordinatorAssembly && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">Assembly:</span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium shadow-sm border border-blue-200">
                  {coordinatorAssembly}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-primary">Coordinator:</span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium shadow-sm border border-gray-200">
                {selectedName}
              </span>
            </div>
          </div>
          {/* Coordinator Date Filter */}
          <DateRangeFilter
            label="Coordinator Activity Filter"
            startDate={coordinatorStartDate || ''}
            endDate={coordinatorEndDate || ''}
            selectedOption={coordinatorDateOption || 'all'}
            onDateChange={(start, end, option) => onCoordinatorDateChange?.(start, end, option)}
          />
          
          {/* Loading indicator for coordinator details */}
          {loadingCoordinator && (
            <div className="flex justify-center my-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Conditional Summary Cards based on role */}
          {!loadingCoordinator && (
            <>
              {selectedCoordinatorObject?.role === 'Assembly Coordinator' ? (
                // Assembly Coordinator View (existing)
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard
                    label="Meetings Done"
                    value={coordinatorMeetings}
                    tappable
                    selected={fcFilter === "meetings"}
                    onClick={() => setFcFilter(fcFilter === "meetings" ? null : "meetings")}
                  />
                  <SummaryCard
                    label="SLPs Added"
                    value={coordinatorSLPs}
                    tappable
                    selected={fcFilter === "slp"}
                    onClick={() => setFcFilter(fcFilter === "slp" ? null : "slp")}
                  />
                  <SummaryCard
                    label="Onboarded"
                    value={coordinatorOnboarded}
                    tappable
                    selected={fcFilter === "onboarded"}
                    onClick={() => setFcFilter(fcFilter === "onboarded" ? null : "onboarded")}
                  />
                  <SummaryCard
                    label="Uploaded Issue Videos"
                    value={acLocalIssueVideoActivities?.length || 0}
                    tappable
                    selected={fcFilter === "videos"}
                    onClick={() => setFcFilter(fcFilter === "videos" ? null : "videos")}
                    isLoading={isAcVideosLoading}
                  />
                </div>
              ) : (
                // SLP/ASLP Activity Tabs View (new)
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <SummaryCard
                    label="Members Logged"
                    value={memberActivities?.length || 0}
                    tappable
                    selected={activeTab === 'members'}
                    onClick={() => setActiveTab('members')}
                    isLoading={isMembersLoading || isSlpActivitiesLoading}
                  />
                  <SummaryCard
                    label="Trainings"
                    value={slpTrainingActivities?.length || 0}
                    tappable
                    selected={activeTab === 'training'}
                    onClick={() => setActiveTab('training')}
                    isLoading={isSlpActivitiesLoading}
                  />
                  <SummaryCard
                    label="WhatsApp Groups"
                    value={slpPanchayatWaActivities?.length || 0}
                    tappable
                    selected={activeTab === 'whatsapp'}
                    onClick={() => setActiveTab('whatsapp')}
                    isLoading={isSlpActivitiesLoading}
                  />
                  <SummaryCard
                    label="Local Issue Videos"
                    value={slpLocalIssueVideoActivities?.length || 0}
                    tappable
                    selected={activeTab === 'videos'}
                    onClick={() => setActiveTab('videos')}
                    isLoading={isSlpActivitiesLoading}
                  />
                  <SummaryCard
                    label="Mai Bahin Forms"
                    value={slpMaiBahinYojnaActivities?.length || 0}
                    tappable
                    selected={activeTab === 'forms'}
                    onClick={() => setActiveTab('forms')}
                    isLoading={isSlpActivitiesLoading}
                  />
                </div>
              )}
              
              {/* Leader Cards List (visible when a card is selected) - Only for Assembly Coordinators */}
              {selectedCoordinatorObject?.role === 'Assembly Coordinator' && fcFilter && fcFilter !== 'videos' && (
                <>
                  {/* Debug info */}
                  {console.log('[DEBUG] filteredCoordinatorData:', {
                    length: filteredCoordinatorData.length,
                    firstItem: filteredCoordinatorData[0] || null,
                    hasLeaderName: filteredCoordinatorData[0]?.["leader name"] || false
                  })}
                  <LeaderCardList data={filteredCoordinatorData} fcFilter={fcFilter} />
                </>
              )}
              
              {/* AC's Uploaded Videos List */}
              {selectedCoordinatorObject?.role === 'Assembly Coordinator' && fcFilter === 'videos' && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-4">Uploaded Issue Videos</h2>
                  {isAcVideosLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : acLocalIssueVideoActivities && acLocalIssueVideoActivities.length > 0 ? (
                    <div className="space-y-4">
                      {acLocalIssueVideoActivities.map((video, index) => (
                        <div key={video.id || index} className="bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                          {/* Header Row with Date and Assembly */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-primary">
                                Issue Video #{index + 1}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200">
                                {video.assembly || 'N/A'}
                              </span>
                            </div>
                            <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                              {video.date_submitted || (video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'N/A')}
                            </span>
                          </div>
                          
                          {/* Description */}
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Description:</h3>
                            <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                              {video.description || 'No description provided'}
                            </p>
                          </div>
                          
                          {/* Video Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                            <div>
                              <span className="font-medium">Form Type:</span> {video.form_type || 'local-issue-video'}
                            </div>
                            <div>
                              <span className="font-medium">Late Entry:</span> {video.late_entry ? 'Yes' : 'No'}
                            </div>
                            {video.storage_path && (
                              <div className="md:col-span-2">
                                <span className="font-medium">Storage Path:</span> 
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded ml-2">
                                  {video.storage_path}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              {video.image_links && video.image_links.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  📷 {video.image_links.length} image(s)
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {video.video_link ? (
                                <a 
                                  href={video.video_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-primary hover:bg-blue-700 transition-colors"
                                >
                                  🎥 Watch Video
                                </a>
                              ) : (
                                <span className="btn btn-sm btn-disabled cursor-not-allowed">
                                  No Video Available
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">No issue videos found for the selected date range</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Dynamic Content Display based on role and active tab */}
      {selectedCoordinatorObject?.role === 'Assembly Coordinator' ? (
        // Assembly Coordinator View (existing logic)
        <>
          {memberActivities && memberActivities.length > 0 ? (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-4">Member Activities</h2>
              <div className="space-y-4">
                {memberActivities && memberActivities.length > 0 ? (
                  memberActivities.map((member: MemberActivity, index: number) => (
                    <div key={member.id || index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{member.name || 'Member'}</h3>
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                          {member.dateOfVisit || (member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Unknown Date')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div><span className="font-medium">Village:</span> {member.village || 'N/A'}</div>
                        <div><span className="font-medium">Assembly:</span> {member.assembly || 'N/A'}</div>
                        <div><span className="font-medium">Contact:</span> {member.phone || member.phoneNumber || member.mobileNumber || 'N/A'}</div>
                        <div><span className="font-medium">Category:</span> {member.category || member.caste || 'N/A'}</div>
                        <div><span className="font-medium">Gender:</span> {member.gender || 'N/A'}</div>
                        <div><span className="font-medium">Profession:</span> {member.profession || 'N/A'}</div>
                      </div>
                      {member.remarks && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-700">Remarks:</span>
                          <p className="text-gray-600 mt-1">{member.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <p className="text-gray-500">No member activities available</p>
                  </div>
                )}
              </div>
            </div>
          ) : selectedName && coordinatorDetails ? (
            // Only show this section if no fcFilter is active to avoid duplicates
            // This section only displays when no filter is applied from the summary cards
            !fcFilter && (
              <div className="mt-4">
                <h2 className="text-xl font-semibold mb-4">All Meetings</h2>
                {coordinatorDetails.detailedMeetings && coordinatorDetails.detailedMeetings.length > 0 ? (
                  <LeaderCardList data={coordinatorDetails.detailedMeetings} fcFilter={null} />
                ) : (
                  <div className="text-center py-16">
                    <p className="text-gray-500">No meeting data available</p>
                  </div>
                )}
              </div>
            )
          ) : null}
        </>
      ) : (
        // SLP/ASLP View (new dynamic content based on active tab)
        selectedName && (
          <div className="mt-4">
            {activeTab === 'members' && (
              <>
                <h2 className="text-xl font-semibold mb-4">Member Activities</h2>
                <div className="space-y-4">
                  {memberActivities && memberActivities.length > 0 ? (
                    memberActivities.map((member: MemberActivity, index: number) => (
                      <div key={member.id || index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{member.name || 'Member'}</h3>
                          <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            {member.dateOfVisit || (member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Unknown Date')}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div><span className="font-medium">Village:</span> {member.village || 'N/A'}</div>
                          <div><span className="font-medium">Assembly:</span> {member.assembly || 'N/A'}</div>
                          <div><span className="font-medium">Contact:</span> {member.phone || member.phoneNumber || member.mobileNumber || 'N/A'}</div>
                          <div><span className="font-medium">Category:</span> {member.category || member.caste || 'N/A'}</div>
                          <div><span className="font-medium">Gender:</span> {member.gender || 'N/A'}</div>
                          <div><span className="font-medium">Profession:</span> {member.profession || 'N/A'}</div>
                        </div>
                        {member.remarks && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700">Remarks:</span>
                            <p className="text-gray-600 mt-1">{member.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-gray-500">No member activities available</p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {activeTab === 'training' && (
              <>
                <h2 className="text-xl font-semibold mb-4">Training Activities</h2>
                {/* TODO: Replace with TrainingList component */}
                <div className="space-y-4">
                  {slpTrainingActivities && slpTrainingActivities.length > 0 ? (
                    slpTrainingActivities.map((training: SlpTrainingActivity, index: number) => (
                      <div key={training.id || index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">Training Session</h3>
                          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            {training.dateOfTraining}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div><span className="font-medium">Location:</span> {training.location}</div>
                          <div><span className="font-medium">Assembly:</span> {training.assembly}</div>
                          <div><span className="font-medium text-green-600">Expected:</span> <span className="font-bold">{training.expectedParticipants}</span></div>
                          <div><span className="font-medium text-blue-600">Actual:</span> <span className="font-bold">{training.actualParticipants}</span></div>
                        </div>
                        {training.summary && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700">Summary:</span>
                            <p className="text-gray-600 mt-1">{training.summary}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-gray-500">No training activities available</p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {activeTab === 'whatsapp' && (
              <>
                <h2 className="text-xl font-semibold mb-4">WhatsApp Group Activities</h2>
                <div className="space-y-4">
                  {slpPanchayatWaActivities && slpPanchayatWaActivities.length > 0 ? (
                    slpPanchayatWaActivities.map((wa: PanchayatWaActivity, index: number) => (
                      <div key={wa.id || index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{wa.groupName || 'Panchayat WhatsApp Group'}</h3>
                          <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            {wa.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div><span className="font-medium">Assembly:</span> {wa.assembly}</div>
                          <div><span className="font-medium">Panchayat:</span> {wa.panchayat}</div>
                          <div><span className="font-medium text-blue-600">Members:</span> <span className="font-bold">{wa.members}</span></div>
                          <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 rounded text-xs font-medium ${wa.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{wa.status}</span></div>
                        </div>
                        {wa.link && (
                          <div className="mt-3">
                            <a href={wa.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                              View Group
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-gray-500">No WhatsApp group activities available</p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {activeTab === 'videos' && (
              <>
                <h2 className="text-xl font-semibold mb-4">Local Issue Video Activities</h2>
                <div className="space-y-4">
                  {slpLocalIssueVideoActivities && slpLocalIssueVideoActivities.length > 0 ? (
                    slpLocalIssueVideoActivities.map((video: LocalIssueVideoActivity, index: number) => (
                      <div key={video.id || index} className="bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                        {/* Header Row with Date and Assembly */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary">
                              Issue Video #{index + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200">
                              {video.assembly || 'N/A'}
                            </span>
                          </div>
                          <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            {video.date_submitted || (video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'N/A')}
                          </span>
                        </div>
                        
                        {/* Description */}
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-1">Description:</h3>
                          <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                            {video.description || 'No description provided'}
                          </p>
                        </div>
                        
                        {/* Video Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Form Type:</span> {video.form_type || 'local-issue-video'}
                          </div>
                          <div>
                            <span className="font-medium">Late Entry:</span> {video.late_entry ? 'Yes' : 'No'}
                          </div>
                          {video.storage_path && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Storage Path:</span> 
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded ml-2">
                                {video.storage_path}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            {video.image_links && video.image_links.length > 0 && (
                              <span className="text-xs text-gray-500">
                                📷 {video.image_links.length} image(s)
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {video.video_link ? (
                              <a 
                                href={video.video_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-primary hover:bg-blue-700 transition-colors"
                              >
                                🎥 Watch Video
                              </a>
                            ) : (
                              <span className="btn btn-sm btn-disabled cursor-not-allowed">
                                No Video Available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">No video activities available</p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {activeTab === 'forms' && (
              <>
                <h2 className="text-xl font-semibold mb-4">Mai Bahin Yojna Form Activities</h2>
                <div className="space-y-4">
                  {slpMaiBahinYojnaActivities && slpMaiBahinYojnaActivities.length > 0 ? (
                    slpMaiBahinYojnaActivities.map((form: MaiBahinYojnaActivity, index: number) => (
                      <div key={form.id || index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">Mai Bahin Yojna Form</h3>
                          <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            {form.date}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div><span className="font-medium">Assembly:</span> {form.assembly}</div>
                          <div><span className="font-medium text-green-600">Forms Distributed:</span> <span className="font-bold">{form.formsDistributed}</span></div>
                          <div><span className="font-medium text-blue-600">Forms Collected:</span> <span className="font-bold">{form.formsCollected}</span></div>
                          <div><span className="font-medium">Late Entry:</span> <span className={`px-2 py-1 rounded text-xs font-medium ${form.late_entry ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{form.late_entry ? 'Yes' : 'No'}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-gray-500">No form activities available</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}



function CoordinatorSearchDropdown({ coordinators, selected, setSelected }: {
  coordinators: { name: string; assembly: string; uid: string; role?: string }[];
  selected: string | null;
  setSelected: (v: string | null) => void;
}) {
  // Manage search state internally instead of receiving from parent
  const [search, setSearch] = useState(selected || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update internal search when selected changes from parent
  useEffect(() => {
    if (selected !== null) {
      setSearch(selected);
      setIsFiltering(false);
    }
  }, [selected]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    } else {
      document.removeEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // When input is focused, open dropdown and show all options
  function handleFocus() {
    setDropdownOpen(true);
    setIsFiltering(false);
  }

  // When user types, enable filtering mode
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setIsFiltering(true);
    setDropdownOpen(true);
  }

  // On selection, set selected and close dropdown
  function handleSelect(name: string) {
    setSelected(name);
    setSearch(name);
    setIsFiltering(false);
    setDropdownOpen(false);
  }

  // Get the list of coordinators to display
  const displayCoordinators = useMemo(() => {
    if (!isFiltering) {
      // When not filtering, show all coordinators
      return coordinators;
    }
    // When filtering, only show coordinators that match the search
    return coordinators.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [coordinators, search, isFiltering]);

  // Helper to get role display text
  function getRoleDisplay(role: string | undefined): string {
    if (!role) return '';
    
    // Convert to standard role display text
    if (role === 'Assembly Coordinator') return 'AC';
    if (role === 'SLP') return 'SLP';
    if (role === 'ASLP') return 'ASLP';
    
    return role;
  }
  
  // Helper to get role badge color styling
  function getRoleBadgeStyle(role: string | undefined): string {
    if (!role) return 'bg-gray-100 text-gray-800';
    
    // Different colors for each role type
    if (role === 'Assembly Coordinator' || role === 'AC') 
      return 'bg-green-100 text-green-800'; // Green for AC
    
    if (role === 'SLP') 
      return 'bg-orange-100 text-orange-800'; // Orange for SLP
    
    if (role === 'ASLP') 
      return 'bg-blue-100 text-blue-800'; // Blue for ASLP
    
    // Default styling for other/unknown roles
    return 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="relative w-full max-w-xs">
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search Field Coordinator..."
          className="input input-bordered w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={search}
          onFocus={handleFocus}
          onChange={handleChange}
          autoComplete="off"
          onClick={() => {
            setDropdownOpen(true);
            setIsFiltering(false);
          }}
        />
      </div>
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto"
        >
          {displayCoordinators.length === 0 && (
            <div className="p-4 text-gray-500 text-center">No coordinators found.</div>
          )}
          {displayCoordinators.map((c) => {
            const matchIdx = isFiltering ? c.name.toLowerCase().indexOf(search.toLowerCase()) : -1;
            const roleDisplay = getRoleDisplay(c.role);
            const roleBadgeStyle = getRoleBadgeStyle(c.role);
            
            return (
              <div
                key={c.uid}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 ${selected === c.name ? "bg-blue-100 dark:bg-blue-800" : ""} border-b border-gray-100`}
                onClick={() => handleSelect(c.name)}
              >
                <span className="font-medium">
                  {matchIdx >= 0 ? (
                    <>
                      {c.name.slice(0, matchIdx)}
                      <span className="bg-yellow-200 text-yellow-900 rounded px-1">
                        {c.name.slice(matchIdx, matchIdx + search.length)}
                      </span>
                      {c.name.slice(matchIdx + search.length)}
                    </>
                  ) : (
                    c.name
                  )}
                </span>
                {roleDisplay && (
                  <span className={`px-3 py-1 rounded-full ${roleBadgeStyle} text-xs font-semibold ml-2`}>
                    {roleDisplay}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tappable, selected, onClick, isLoading }: {
  label: string;
  value: number;
  tappable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div
      className={`rounded-lg bg-background shadow p-6 flex flex-col items-center border transition cursor-pointer select-none
        ${tappable ? "hover:shadow-lg" : ""}
        ${selected ? "bg-blue-100 border-blue-400 shadow-lg" : "border-gray-200 dark:border-gray-800"}`}
      onClick={tappable ? onClick : undefined}
    >
      <div className="text-3xl font-bold mb-2">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          value
        )}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
    </div>
  );
}

function LeaderCardList({ data, fcFilter }: { data: MeetingRow[]; fcFilter?: string | null }) {
  // Check if we're displaying SLP/ASLP data
  const isSLPData = data.length > 0 && (!data[0][KEY_RECOMMENDED_POSITION] || data[0][KEY_RECOMMENDED_POSITION] === "--");
  
  if (data.length === 0) return (
    <div className="text-center text-gray-500">
      {isSLPData ? "No members found." : "No leaders found."}
    </div>
  );
  
  return (
    <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto py-2">
      {data.map((row, i) => (
        <LeaderCard key={i} row={row} fcFilter={fcFilter} />
      ))}
    </div>
  );
}

function LeaderCard({ row, fcFilter }: { row: MeetingRow; fcFilter?: string | null }) {
  // Debug information
  console.log('[LeaderCard] Rendering with row data:', row);
  
  const [expanded, setExpanded] = useState(false);
  const isSLP = normalize(row[KEY_RECOMMENDED_POSITION]) === "slp";
  const isInactive = normalize(row["activity status"]) === "inactive";
  
  // Check if this is a member activity (from SLP/ASLP) rather than a meeting (from AC)
  // Member activities won't have a recommended position
  const isMemberActivity = !row[KEY_RECOMMENDED_POSITION] && row["leader name"];
  
  // Card style based on activity status
  const cardStyle = isInactive 
    ? "bg-red-50 dark:bg-red-900 rounded-xl shadow border border-red-200 dark:border-red-800 p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow"
    : "bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow";
  
  // Activity status tag style
  const activityStatusStyle = isInactive
    ? "px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-semibold border border-red-200"
    : "px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold border border-green-200";
  
  // Position tag style based on role
  const getPositionTagStyle = (position: string) => {
    const normalizedPosition = normalize(position);
    
    if (normalizedPosition === 'assembly coordinator' || normalizedPosition === 'ac')
      return "px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold border border-green-200";
    
    if (normalizedPosition === 'slp')
      return "px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200";
    
    if (normalizedPosition === 'aslp')
      return "px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200";
    
    // Default style
    return "px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-200";
  };

  // Onboarding status tag style
  const getOnboardingStatusStyle = (status: string) => {
    const normalizedStatus = normalize(status);
    
    if (normalizedStatus === 'onboarded')
      return "px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold border border-green-200";
    
    if (normalizedStatus === 'in process' || normalizedStatus === 'in progress')
      return "px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold border border-yellow-200";
    
    // Default styling for not onboarded or other statuses
    return "px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-200";
  };
  
  return (
    <div className={cardStyle}>
      {/* Header Row with Name, Position, Status */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-lg font-bold text-primary">
          {row["leader name"]}
        </span>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Position tag */}
          {row["recommended position"] && (
            <span className={getPositionTagStyle(row["recommended position"])}>
              {row["recommended position"]}
            </span>
          )}
          
          {/* Activity status tag with conditional styling */}
          {row["activity status"] && (
            <span className={activityStatusStyle}>
              {row["activity status"]}
            </span>
          )}
          
          {/* Onboarding status tag */}
          {row["onboarding status"] && (
            <span className={getOnboardingStatusStyle(row["onboarding status"])}>
              {row["onboarding status"]}
            </span>
          )}
        </div>
        
        {/* Phone number and buttons */}
        <span className="ml-auto flex items-center gap-2">
          {row["phone number"] && (
            <a href={`tel:${row["phone number"]}`} className="text-sm text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
              {row["phone number"]}
            </a>
          )}
          <button
            className={`btn btn-xs btn-outline cursor-pointer transition-colors ${expanded ? "bg-blue-100 text-blue-800" : ""}`}
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </button>
          {isSLP && !isMemberActivity && (
            <button className="btn btn-xs btn-primary ml-2 cursor-pointer transition-colors hover:bg-blue-700 hover:text-white active:bg-blue-900 active:text-white focus:bg-blue-700 focus:text-white">
              Show Members
            </button>
          )}
        </span>
      </div>
      
      {/* Overview Details Row - Location and Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        {/* Location information */}
        <div className="flex flex-col">
          <span className="font-semibold text-gray-600">Location</span>
          <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
            {row["village"] && <span>Village: {row["village"]}</span>}
            {row["panchayat"] && <span>Panchayat: {row["panchayat"]}</span>}
            {row["block"] && <span>Block: {row["block"]}</span>}
            {row["assembly name"] && <span>Assembly: {row["assembly name"]}</span>}
            {row["district"] && !row["assembly name"] && <span>District: {row["district"]}</span>}
          </div>
        </div>
        
        {/* Date and Coordinator information */}
        <div className="flex flex-col">
          <span className="font-semibold text-gray-600">Meeting Details</span>
          <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
            {row["date"] && <span>Date: {row["date"]}</span>}
            {row["assembly field coordinator"] && (
              <span>Coordinator: {row["assembly field coordinator"]}</span>
            )}
          </div>
        </div>
        
        {/* Demographic Preview */}
        <div className="flex flex-col">
          <span className="font-semibold text-gray-600">Demographics</span>
          <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
            {row["gender"] && <span>Gender: {row["gender"]}</span>}
            {row["category"] && <span>Category: {row["category"]}</span>}
            {row["leader's current profession"] && (
              <span>Profession: {row["leader's current profession"]}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Expandable Details */}
      {expanded && (
        <div className="mt-3 border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all">
          {/* Detailed Demographics */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-gray-600">Detailed Demographics</span>
            <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
              {row["age"] && <span>Age: {row["age"]}</span>}
              {row["caste"] && <span>Caste: {row["caste"]}</span>}
              {row["level of influence"] && <span>Level of Influence: {row["level of influence"]}</span>}
              {row["party inclination"] && <span>Party Inclination: {row["party inclination"]}</span>}
            </div>
          </div>
          
          {/* Profile Details */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-gray-600">Profile</span>
            <div className="grid grid-cols-1 gap-1">
              {row["leader's detailed profile"] ? (
                <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                  {row["leader's detailed profile"]}
                </p>
              ) : (
                <span className="text-sm text-gray-500">No profile information available</span>
              )}
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-gray-600">Contact Information</span>
            <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
              {row["phone number"] && <span>Phone: {row["phone number"]}</span>}
              {row["email address"] && <span>Email: {row["email address"]}</span>}
              {row["document id"] && (
                <span className="text-xs text-gray-500">ID: {row["document id"]}</span>
              )}
            </div>
          </div>
          
          {/* Remarks */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-gray-600">Remarks</span>
            {row["remark"] ? (
              <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                {row["remark"]}
              </p>
            ) : (
              <span className="text-sm text-gray-500">No remarks provided</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}