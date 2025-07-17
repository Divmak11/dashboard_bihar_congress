"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import type { MeetingRow } from "../app/utils/fetchSheetData";
import LogoutButton from "./LogoutButton";
import { WtmSlpSummary } from "../models/types";

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
  onDateChange?: (start: string, end: string) => void;
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

// Helper for date filter options
const DATE_FILTERS = [
  { label: "All Time", value: "all" },
  { label: "Last Day", value: "lastDay" },
  { label: "Last Week", value: "lastWeek" },
  { label: "Last 3 Months", value: "last3Months" },
  { label: "Custom Range", value: "custom" },
];

function getDateRange(option: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(23, 59, 59, 999); // Set to end of today
  
  let start: Date | null = null;
  let end: Date | null = today;
  
  switch (option) {
    case "lastDay":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start.setHours(0, 0, 0, 0); // Start of yesterday
      break;
    case "lastWeek":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      start.setHours(0, 0, 0, 0); // Start of day 7 days ago
      break;
    case "last3Months":
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      start.setHours(0, 0, 0, 0); // Start of day 3 months ago
      break;
    default:
      start = null;
      end = null;
  }
  
  console.log(`[getDateRange] Option: ${option}, Start: ${start ? start.toISOString() : 'null'}, End: ${end ? end.toISOString() : 'null'}`);
  return [start, end];
}

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
  onDateChange,
  // New assembly-related props
  assemblies,
  selectedAssembly,
  onAssemblySelect,
  // New summary props
  overallSummary,
  isSummaryLoading,
  // New member activities props
  memberActivities,
  isMembersLoading = false
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

  // --- Global Date Filter State ---
  const [globalDateOption, setGlobalDateOption] = useState("all");
  const [globalStart, setGlobalStart] = useState<string>(startDate || "");
  const [globalEnd, setGlobalEnd] = useState<string>(endDate || "");
  
  // Update global date when external dates change
  useEffect(() => {
    if (startDate) {
      console.log(`[DashboardHome] Updating globalStart from prop: ${startDate}`);
      setGlobalStart(startDate);
    }
    if (endDate) {
      console.log(`[DashboardHome] Updating globalEnd from prop: ${endDate}`);
      setGlobalEnd(endDate);
    }
  }, [startDate, endDate]);

  // Call external onDateChange when our internal dates change, but only if they've actually changed
  useEffect(() => {
    if (onDateChange && globalStart && globalEnd) {
      // Only trigger the callback if the values are different from props (to prevent update loops)
      const hasChanged = globalStart !== startDate || globalEnd !== endDate;
      
      if (hasChanged) {
        console.log(`[DashboardHome] Calling onDateChange with: ${globalStart} to ${globalEnd}`);
        onDateChange(globalStart, globalEnd);
      } else {
        console.log(`[DashboardHome] Skipping onDateChange - dates haven't changed`);
      }
    }
  }, [globalStart, globalEnd, startDate, endDate, onDateChange]);

  // NEW: Listen for globalDateOption changes and trigger date changes for presets
  useEffect(() => {
    console.log(`[DashboardHome] Date option changed to: ${globalDateOption}`);
    
    // Skip for custom option as it's handled separately by direct date inputs
    if (globalDateOption !== 'custom') {
      const [start, end] = getDateRange(globalDateOption);
      
      if (start) {
        const startStr = start.toISOString().split('T')[0];
        console.log(`[DashboardHome] Setting globalStart from option: ${startStr}`);
        setGlobalStart(startStr);
      }
      
      if (end) {
        const endStr = end.toISOString().split('T')[0];
        console.log(`[DashboardHome] Setting globalEnd from option: ${endStr}`);
        setGlobalEnd(endStr);
      }
    }
  }, [globalDateOption]);

  // --- Global Date Filtering ---
  const globalDateRange = useMemo(() => {
    console.log(`[DashboardHome] Computing globalDateRange. Option: ${globalDateOption}, Start: ${globalStart}, End: ${globalEnd}`);
    if (globalDateOption === "custom") {
      const start = globalStart ? new Date(globalStart) : null;
      const end = globalEnd ? new Date(globalEnd) : null;
      
      // Normalize the dates to beginning/end of day
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      return [start, end];
    }
    if (globalDateOption === "all") return [null, null];
    return getDateRange(globalDateOption);
  }, [globalDateOption, globalStart, globalEnd]);

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

  // --- FC-specific Date Filter ---
  const [fcDateOption, setFcDateOption] = useState("all");
  const [fcStart, setFcStart] = useState<string>("");
  const [fcEnd, setFcEnd] = useState<string>("");
  const fcDateRange = useMemo(() => {
    if (fcDateOption === "custom") {
      const start = fcStart ? new Date(fcStart) : null;
      const end = fcEnd ? new Date(fcEnd) : null;
      
      // Normalize the dates to beginning/end of day
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      return [start, end];
    }
    if (fcDateOption === "all") return [null, null];
    return getDateRange(fcDateOption);
  }, [fcDateOption, fcStart, fcEnd]);

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
    
    const [start, end] = fcDateRange;
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
  }, [data, selectedName, fcDateRange, externalCoordinators, coordinatorDetails]);

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
    
    const [start, end] = fcDateRange;
    if (!start && !end) return coordinatorDetails.detailedMeetings;
    
    return coordinatorDetails.detailedMeetings.filter((row: MeetingRow) => {
      const d = parseDate(row["date"]);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [coordinatorDetails, fcDateRange, coordinatorData]);
  
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
  const [fcFilter, setFcFilter] = useState<null | "meetings" | "onboarded" | "slp">(null);
  const filteredCoordinatorData = useMemo(() => {
    console.log(`[DashboardHome] Filtering coordinator data by: ${fcFilter || 'none'}`);
    
    // Apply date filtering first
    const filterByFcDate = (rows: MeetingRow[]) => {
      const [start, end] = fcDateRange;
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
  }, [coordinatorData, fcFilter, coordinatorDetails, fcDateRange]);

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
      <DateFilter
        label="Filter by Date"
        dateOption={globalDateOption}
        setDateOption={setGlobalDateOption}
        start={globalStart}
        setStart={setGlobalStart}
        end={globalEnd}
        setEnd={setGlobalEnd}
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
          {/* FC Date Filter */}
          <DateFilter
            label="Filter by Date"
            dateOption={fcDateOption}
            setDateOption={setFcDateOption}
            start={fcStart}
            setStart={setFcStart}
            end={fcEnd}
            setEnd={setFcEnd}
          />
          
          {/* Loading indicator for coordinator details */}
          {loadingCoordinator && (
            <div className="flex justify-center my-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* FC Summary Cards (tappable) */}
          {!loadingCoordinator && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                  label={selectedCoordinatorObject?.role === 'Assembly Coordinator' ? "Meetings Done" : "Members Logged"}
                  value={coordinatorMeetings}
                  tappable
                  selected={fcFilter === "meetings"}
                  onClick={() => setFcFilter(fcFilter === "meetings" ? null : "meetings")}
                />
                <SummaryCard
                  label={selectedCoordinatorObject?.role === 'Assembly Coordinator' ? "SLPs Added" : "Active Members"}
                  value={coordinatorSLPs}
                  tappable
                  selected={fcFilter === "slp"}
                  onClick={() => setFcFilter(fcFilter === "slp" ? null : "slp")}
                />
                <SummaryCard
                  label={selectedCoordinatorObject?.role === 'Assembly Coordinator' ? "Onboarded" : "Total Members"}
                  value={coordinatorOnboarded}
                  tappable
                  selected={fcFilter === "onboarded"}
                  onClick={() => setFcFilter(fcFilter === "onboarded" ? null : "onboarded")}
                />
              </div>

              {/* Leader Cards List (visible when a card is selected) */}
              {fcFilter && (
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
            </>
          )}
        </div>
      )}

      {/* Display either member activities or leader data based on what was loaded */}
      {memberActivities && memberActivities.length > 0 ? (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Member Activities</h2>
          <MembersList members={memberActivities} isLoading={isMembersLoading} />
        </div>
      ) : selectedName && coordinatorDetails ? (
        // Only show this section if no fcFilter is active to avoid duplicates
        // This section only displays when no filter is applied from the summary cards
        !fcFilter && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-4">
              {selectedCoordinatorObject?.role === 'Assembly Coordinator' ? "All Meetings" : "All Member Activities"}
            </h2>
            {coordinatorDetails.detailedMeetings && coordinatorDetails.detailedMeetings.length > 0 ? (
              <LeaderCardList data={coordinatorDetails.detailedMeetings} fcFilter={null} />
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">
                  {selectedCoordinatorObject?.role === 'Assembly Coordinator' 
                    ? "No meeting data available" 
                    : "No member activities available"}
                </p>
              </div>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}

function DateFilter({ label, dateOption, setDateOption, start, setStart, end, setEnd }: {
  label: string;
  dateOption: string;
  setDateOption: (v: string) => void;
  start: string;
  setStart: (v: string) => void;
  end: string;
  setEnd: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-semibold text-gray-700 dark:text-gray-200 mr-2">{label}:</span>
      <select
        className="select select-bordered select-sm"
        value={dateOption}
        onChange={e => setDateOption(e.target.value)}
      >
        {DATE_FILTERS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {dateOption === "custom" && (
        <>
          <input
            type="date"
            className="input input-bordered input-sm"
            value={start}
            onChange={e => setStart(e.target.value)}
          />
          <input
            type="date"
            className="input input-bordered input-sm"
            value={end}
            onChange={e => setEnd(e.target.value)}
          />
        </>
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

function MemberCard({ member }: { member: any }) {
  const [expanded, setExpanded] = useState(false);
  
  // Determine if the member is active/inactive
  const isInactive = member.status === "Inactive";
  
  // Card style based on activity status
  const cardStyle = isInactive 
    ? "bg-red-50 dark:bg-red-900 rounded-xl shadow border border-red-200 dark:border-red-800 p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow"
    : "bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow";
  
  return (
    <div className={cardStyle}>
      {/* Overview Row */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-lg font-bold text-primary">
          {member.name || "Unknown Member"}
        </span>
        
        {/* Tags section */}
        <div className="flex flex-wrap gap-1">
          {member.gender && (
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200">
              {member.gender}
            </span>
          )}
          
          {member.category && (
            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold border border-yellow-200">
              {member.category}
            </span>
          )}
          
          {member.profession && (
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold border border-green-200">
              {member.profession}
            </span>
          )}
        </div>
        
        <span className="ml-auto flex items-center gap-2">
          {(member.phoneNumber || member.mobileNumber) && (
            <span className="text-sm text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {member.phoneNumber || member.mobileNumber}
            </span>
          )}
          <button
            className={`btn btn-xs btn-outline cursor-pointer transition-colors ${expanded ? "bg-blue-100 text-blue-800" : ""}`}
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </button>
        </span>
      </div>
      
      {/* Overview Details Row - Location information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-600">Location</span>
          <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
            {member.village && <span>Village: {member.village}</span>}
            {member.panchayat && <span>Panchayat: {member.panchayat}</span>}
            {member.block && <span>Block: {member.block}</span>}
            {member.assembly && <span>Assembly: {member.assembly}</span>}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-600">Contact</span>
          <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
            {member.phoneNumber && <span>Phone: {member.phoneNumber}</span>}
            {member.email && <span>Email: {member.email}</span>}
          </div>
        </div>
      </div>
      
      {/* Expandable Details */}
      {expanded && (
        <div className="mt-2 border-t pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all">
          {/* Additional details when expanded */}
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-gray-600">Demographics</span>
            <div className="grid grid-cols-1 gap-1 text-gray-800 dark:text-gray-200">
              {member.age && <span>Age: {member.age}</span>}
              {member.gender && <span>Gender: {member.gender}</span>}
              {member.category && <span>Category: {member.category}</span>}
              {member.caste && <span>Caste: {member.caste}</span>}
            </div>
          </div>
          
          {/* Notes section */}
          {(member.notes || member.remarks || member.additionalDetails) && (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-600">Notes</span>
              <div className="grid grid-cols-1 gap-1">
                {member.notes && (
                  <span className="text-gray-800 dark:text-gray-200">{member.notes}</span>
                )}
                {member.remarks && (
                  <span className="text-gray-800 dark:text-gray-200">{member.remarks}</span>
                )}
                {member.additionalDetails && (
                  <span className="text-gray-800 dark:text-gray-200">{member.additionalDetails}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MembersList({ members, isLoading }: { members: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">No member data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {members.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
} 