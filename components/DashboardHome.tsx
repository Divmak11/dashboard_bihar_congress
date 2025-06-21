"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import type { MeetingRow } from "../app/utils/fetchSheetData";

interface DashboardHomeProps {
  data: MeetingRow[];
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
  // Map: normalized FC name -> { name, assembly }
  const map = new Map<string, { name: string; assembly: string }>();
  data.forEach((row) => {
    const raw = row[KEY_COORDINATOR] || "";
    const norm = normalize(raw);
    const assembly = row[KEY_ASSEMBLY] || "";
    if (norm && !map.has(norm)) map.set(norm, { name: raw.trim(), assembly });
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
  switch (option) {
    case "lastDay":
      return [new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), now];
    case "lastWeek":
      return [new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7), now];
    case "last3Months":
      return [new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()), now];
    default:
      return [null, null];
  }
}

export default function DashboardHome({ data }: DashboardHomeProps) {
  // --- Global Date Filter State ---
  const [globalDateOption, setGlobalDateOption] = useState("all");
  const [globalStart, setGlobalStart] = useState<string>("");
  const [globalEnd, setGlobalEnd] = useState<string>("");

  // --- Global Date Filtering ---
  const globalDateRange = useMemo(() => {
    if (globalDateOption === "custom") {
      return [globalStart ? new Date(globalStart) : null, globalEnd ? new Date(globalEnd) : null];
    }
    if (globalDateOption === "all") return [null, null];
    return getDateRange(globalDateOption);
  }, [globalDateOption, globalStart, globalEnd]);

  const filteredData = useMemo(() => {
    const [start, end] = globalDateRange;
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
    console.log("First 5 rows of data:", data.slice(0, 5));
    const uniquePositions = Array.from(
      new Set(data.map((row) => row[KEY_RECOMMENDED_POSITION]))
    );
    console.log("Unique 'Recommended Position' values:", uniquePositions);

    // Print all unique normalized recommended position values
    const uniqueNormalizedPositions = Array.from(
      new Set(data.map((row) => normalize(row[KEY_RECOMMENDED_POSITION])))
    );
    console.log("Unique normalized 'Recommended Position' values:", uniqueNormalizedPositions);

    // Print first 20 rows being counted as SLP
    const slpRows = data.filter(
      (row) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp"
    );
    console.log("First 20 rows counted as SLP:", slpRows.slice(0, 20));
    console.log("Total rows counted as SLP:", slpRows.length);
  }, [data]);

  // --- FC Search/Dropdown ---
  const coordinators = useMemo(() => getUniqueCoordinators(data), [data]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const filteredCoordinators = useMemo(() => {
    if (!search) return coordinators;
    return coordinators.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [coordinators, search]);

  // --- FC-specific Date Filter ---
  const [fcDateOption, setFcDateOption] = useState("all");
  const [fcStart, setFcStart] = useState<string>("");
  const [fcEnd, setFcEnd] = useState<string>("");
  const fcDateRange = useMemo(() => {
    if (fcDateOption === "custom") {
      return [fcStart ? new Date(fcStart) : null, fcEnd ? new Date(fcEnd) : null];
    }
    if (fcDateOption === "all") return [null, null];
    return getDateRange(fcDateOption);
  }, [fcDateOption, fcStart, fcEnd]);

  // --- Coordinator Data & Filtering ---
  const coordinatorData = useMemo(() => {
    if (!selected) return [];
    let rows = data.filter((row) => normalize(row[KEY_COORDINATOR]) === normalize(selected));
    const [start, end] = fcDateRange;
    if (start || end) {
      rows = rows.filter((row) => {
        const d = parseDate(row[KEY_DATE]);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }
    return rows;
  }, [data, selected, fcDateRange]);

  // --- FC Name & Assembly ---
  const selectedAssembly = useMemo(() => {
    if (!selected) return "";
    const found = coordinators.find((c) => normalize(c.name) === normalize(selected));
    return found?.assembly || "";
  }, [selected, coordinators]);

  // --- Summary Stats ---
  const totalMeetings = filteredData.length;
  const totalSLPs = useMemo(() => filteredData.filter((row) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp").length, [filteredData]);
  const totalOnboarded = useMemo(() => filteredData.filter((row) => normalize(row[KEY_ONBOARDING_STATUS]) === "onboarded").length, [filteredData]);

  // --- FC Summary Stats ---
  const coordinatorMeetings = coordinatorData.length;
  const coordinatorOnboarded = coordinatorData.filter((row) => normalize(row[KEY_ONBOARDING_STATUS]) === "onboarded").length;
  const coordinatorSLPs = coordinatorData.filter((row) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp").length;

  // --- FC Summary Card Filtering ---
  const [fcFilter, setFcFilter] = useState<null | "meetings" | "onboarded" | "slp">(null);
  const filteredCoordinatorData = useMemo(() => {
    if (!fcFilter) return coordinatorData;
    if (fcFilter === "meetings") return coordinatorData;
    if (fcFilter === "onboarded") return coordinatorData.filter((row) => normalize(row[KEY_ONBOARDING_STATUS]) === "onboarded");
    if (fcFilter === "slp") return coordinatorData.filter((row) => normalize(row[KEY_RECOMMENDED_POSITION]) === "slp");
    return coordinatorData;
  }, [coordinatorData, fcFilter]);

  // --- UI ---
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
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
        <SummaryCard label="Total Meetings Done" value={totalMeetings} />
        <SummaryCard label="Total SLPs" value={totalSLPs} />
        <SummaryCard label="Total Onboarded" value={totalOnboarded} />
      </div>

      {/* Coordinator Search/Select */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <CoordinatorSearchDropdown
          coordinators={filteredCoordinators}
          search={search}
          setSearch={setSearch}
          selected={selected}
          setSelected={setSelected}
        />
      </div>

      {/* Coordinator Summary */}
      {selected && (
        <div className="space-y-4">
          {/* Assembly (left) and FC Name (right) */}
          <div className="flex items-center justify-between mb-2">
            {selectedAssembly && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">Assembly:</span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium shadow-sm border border-blue-200">
                  {selectedAssembly}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-primary">Coordinator:</span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium shadow-sm border border-gray-200">
                {selected}
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
          {/* FC Summary Cards (tappable) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Meetings Done"
              value={coordinatorMeetings}
              tappable
              selected={fcFilter === "meetings"}
              onClick={() => setFcFilter(fcFilter === "meetings" ? null : "meetings")}
            />
            <SummaryCard
              label="Leaders Onboarded"
              value={coordinatorOnboarded}
              tappable
              selected={fcFilter === "onboarded"}
              onClick={() => setFcFilter(fcFilter === "onboarded" ? null : "onboarded")}
            />
            <SummaryCard
              label="SLPs Made"
              value={coordinatorSLPs}
              tappable
              selected={fcFilter === "slp"}
              onClick={() => setFcFilter(fcFilter === "slp" ? null : "slp")}
            />
          </div>
          <LeaderCardList data={filteredCoordinatorData} fcFilter={fcFilter} />
        </div>
      )}
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

function CoordinatorSearchDropdown({ coordinators, search, setSearch, selected, setSelected }: {
  coordinators: { name: string; assembly: string }[];
  search: string;
  setSearch: (v: string) => void;
  selected: string | null;
  setSelected: (v: string | null) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // When selected changes, update input and close dropdown
  useEffect(() => {
    if (selected !== null) {
      setSearch(selected);
      setDropdownOpen(false);
    }
  }, [selected, setSearch]);

  // When input is focused, open dropdown
  function handleFocus() {
    setDropdownOpen(true);
    setSearch("");
  }

  // When user types, open dropdown
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setDropdownOpen(true);
  }

  // On selection, set selected and close dropdown
  function handleSelect(name: string) {
    setSelected(name + ""); // force new string instance
    setSearch(name);
    setDropdownOpen(false);
  }

  return (
    <div className="relative w-full max-w-xs">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search Field Coordinator..."
        className="input input-bordered w-full pr-10"
        value={selected && !dropdownOpen ? selected : search}
        onFocus={handleFocus}
        onChange={handleChange}
        autoComplete="off"
        onBlur={() => setTimeout(() => setDropdownOpen(false), 100)}
      />
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded shadow mt-1 max-h-60 overflow-y-auto"
        >
          {coordinators.length === 0 && (
            <div className="p-2 text-gray-500">No coordinators found.</div>
          )}
          {coordinators.map((c) => {
            const matchIdx = c.name.toLowerCase().indexOf(search.toLowerCase());
            return (
              <div
                key={c.name}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900 ${selected === c.name ? "bg-blue-100 dark:bg-blue-800" : ""}`}
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
                {c.assembly && (
                  <span className="ml-auto px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200">
                    {c.assembly}
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

function SummaryCard({ label, value, tappable, selected, onClick }: {
  label: string;
  value: number;
  tappable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-lg bg-background shadow p-6 flex flex-col items-center border transition cursor-pointer select-none
        ${tappable ? "hover:shadow-lg" : ""}
        ${selected ? "bg-blue-100 border-blue-400 shadow-lg" : "border-gray-200 dark:border-gray-800"}`}
      onClick={tappable ? onClick : undefined}
    >
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
    </div>
  );
}

function LeaderCardList({ data, fcFilter }: { data: MeetingRow[]; fcFilter?: string | null }) {
  if (data.length === 0) return <div className="text-center text-gray-500">No leaders found.</div>;
  return (
    <div className="grid gap-4 max-h-[600px] overflow-y-auto py-2">
      {data.map((row, i) => (
        <LeaderCard key={i} row={row} fcFilter={fcFilter} />
      ))}
    </div>
  );
}

function LeaderCard({ row, fcFilter }: { row: MeetingRow; fcFilter?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isSLP = normalize(row[KEY_RECOMMENDED_POSITION]) === "slp";
  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow"
    >
      {/* Overview Row */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-lg font-bold text-primary">
          {row["leader name"]}
        </span>
        {row["caste"] && (
          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold border border-yellow-200">
            {row["caste"]}
          </span>
        )}
        {row["level of influence"] && (
          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200">
            {row["level of influence"]}
          </span>
        )}
        {row["activity status"] && (
          <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold border border-green-200">
            {row["activity status"]}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {row["phone number"] && (
            <span className="text-sm text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {row["phone number"]}
            </span>
          )}
          <button
            className={`btn btn-xs btn-outline cursor-pointer transition-colors ${expanded ? "bg-blue-100 text-blue-800" : ""}`}
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </button>
          {isSLP && (
            <button className="btn btn-xs btn-primary ml-2 cursor-pointer transition-colors hover:bg-blue-700 hover:text-white active:bg-blue-900 active:text-white focus:bg-blue-700 focus:text-white">
              Show Members
            </button>
          )}
        </span>
      </div>
      {/* Overview Details Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex flex-col">
          <span className="font-semibold text-gray-600">Location</span>
          <span className="text-gray-800 dark:text-gray-200">
            {row["village"] || "-"}, {row["panchayat"] || "-"}, {row["block"] || "-"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-600">Date</span>
          <span className="text-gray-800 dark:text-gray-200">{row["date"] || "-"}</span>
        </div>
      </div>
      {/* Expandable Details */}
      {expanded && (
        <div className="mt-2 border-t pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-gray-600">Demographics</span>
            <span className="text-gray-800 dark:text-gray-200">
              Gender: {row["gender"] || "-"}, Age: {row["age"] || "-"}, Category: {row["category"] || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-gray-600">Profile</span>
            <span className="text-gray-800 dark:text-gray-200">
              Profession: {row["leader's current profession"] || "-"}
            </span>
            <span className="text-xs text-gray-500">
              {row["leader's detailed profile"] || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-gray-600">Remark</span>
            <span className="text-gray-800 dark:text-gray-200">{row["remark"] || "-"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-gray-600">Email</span>
            <span className="text-gray-800 dark:text-gray-200">{row["email address"] || "-"}</span>
          </div>
        </div>
      )}
    </div>
  );
} 