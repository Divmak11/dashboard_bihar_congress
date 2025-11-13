"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebase";
import { getCurrentAdminUser } from "../utils/fetchFirebaseData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FileText, FileSpreadsheet, Filter, LogOut, MapPin } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { availableCommunity, indianDistricts } from "@/data/statesData";
import { delhiDistricts, migrantJaipurSurveyDistricts } from "@/data/migrantGeo";
import {
  City,
  MigrantFilters,
  MigrantStatistics,
  MigrantSurveyItem,
} from "../../models/migrantTypes";
import {
  LS_KEYS_MIGRANT,
  loginMigrantApi,
  fetchMigrantReportsPaged,
} from "../utils/fetchMigrantData";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
];

function formatDateLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MigrantPage() {
  // Firebase admin-only guard
  const [fbUser] = useAuthState(auth);
  const router = useRouter();
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    async function guard() {
      if (!fbUser?.uid) return;
      const adminUser = await getCurrentAdminUser(fbUser.uid);
      if (adminUser?.role !== "admin") {
        router.replace("/wtm-slp-new");
        return;
      }
      setRoleChecked(true);
    }
    guard();
  }, [fbUser?.uid, router]);

  // External API auth state (auto-login)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiUser, setApiUser] = useState<any>(null);
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    async function ensureToken() {
      try {
        const existing = localStorage.getItem(LS_KEYS_MIGRANT.TOKEN);
        if (existing) {
          setIsAuthenticated(true);
          const userStored = localStorage.getItem(LS_KEYS_MIGRANT.USER);
          if (userStored) setApiUser(JSON.parse(userStored));
        } else {
          const login = await loginMigrantApi();
          setIsAuthenticated(true);
          setApiUser(login.user);
        }
      } catch (e) {
        console.error("[Migrant] Login failed", e);
        setIsAuthenticated(false);
      } finally {
        setTokenChecked(true);
      }
    }
    ensureToken();
  }, []);

  // City & Filters
  const [selectedCity, setSelectedCity] = useState<City>("delhi");
  const [filters, setFilters] = useState<MigrantFilters>(() => ({
    dateFrom: formatDateLocalYYYYMMDD(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    dateTo: formatDateLocalYYYYMMDD(new Date()),
    volunteerName: "",
    biharDistrict: "",
    delhiDistrict: "",
    jaipurDistrict: "",
    availableCommunity: "",
  }));

  const handleFilterChange = useCallback((key: keyof MigrantFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCityChange = useCallback((city: City) => {
    setSelectedCity(city);
    setFilters((prev) => ({
      ...prev,
      delhiDistrict: city === "delhi" ? prev.delhiDistrict : "",
      jaipurDistrict: city === "jaipur" ? prev.jaipurDistrict : "",
    }));
  }, []);

  // Data state
  const [surveyData, setSurveyData] = useState<MigrantSurveyItem[]>([]);
  const [statistics, setStatistics] = useState<MigrantStatistics | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMigrantReportsPaged(selectedCity, filters);
      setSurveyData(res.data);
      setStatistics(res.statistics);
    } catch (e: any) {
      console.error("[Migrant] fetch error", e);
      if (e?.message === "unauthorized") {
        setIsAuthenticated(false);
      }
      setError(e?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedCity, filters, isAuthenticated]);

  useEffect(() => {
    if (roleChecked && tokenChecked && isAuthenticated) {
      fetchData();
    }
  }, [roleChecked, tokenChecked, isAuthenticated, fetchData]);

  // Charts
  const chartData = useMemo(() => {
    const s = statistics || ({} as MigrantStatistics);
    const biharDistrictData = Object.entries(s.biharDistrictAssembly || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
    const cityProblemsKey = selectedCity === "jaipur" ? "jaipurProblems" : "delhiProblems";
    const cityProblemsData = Object.entries((s as any)[cityProblemsKey] || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, value]) => ({ name, value }));
    const biharProblemsData = Object.entries(s.biharProblems || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, value]) => ({ name, value }));
    const volunteerData = Object.entries(s.volunteerStats || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, value]) => ({ name, value }));

    return { biharDistrictData, cityProblemsData, biharProblemsData, volunteerData };
  }, [statistics, selectedCity]);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem(LS_KEYS_MIGRANT.TOKEN);
      localStorage.removeItem(LS_KEYS_MIGRANT.USER);
    } catch {}
    setIsAuthenticated(false);
    setApiUser(null);
    setSurveyData([]);
    setStatistics(undefined);
  }, []);

  // Export: PDF
  const generatePDF = useCallback(() => {
    const doc = new jsPDF();
    const cityName = selectedCity === "jaipur" ? "Other Districts" : "Delhi";

    // Title
    doc.setFontSize(20);
    doc.text(`${cityName} Migrant Survey Report`, 105, 20, { align: "center" });

    // Info
    doc.setFontSize(12);
    doc.text(`Report Period: ${filters.dateFrom || "-"} to ${filters.dateTo || "-"}`, 20, 35);
    doc.text(`Total Surveys: ${statistics?.totalSurveys || 0}`, 20, 45);

    let y = 60;
    doc.setFontSize(16);
    doc.text("Statistical Summary", 20, y);
    y += 15;

    const problemsKey = selectedCity === "jaipur" ? "jaipurProblems" : "delhiProblems";
    const tableData: any[] = [
      ["Category", "Top Values"],
      [
        "Bihar (District-Assembly)",
        Object.entries(statistics?.biharDistrictAssembly || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        `Bihar Problems`,
        Object.entries(statistics?.biharProblems || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        `${cityName} Problems`,
        Object.entries((statistics as any)?.[problemsKey] || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Religion",
        Object.entries(statistics?.religion || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Caste",
        Object.entries(statistics?.caste || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Political Party",
        Object.entries(statistics?.politicalParty || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Volunteer Name (surveys counted)",
        Object.entries(statistics?.volunteerStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
    ];

    autoTable(doc, {
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: y,
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 140 } },
      margin: { left: 20, right: 20 },
    });

    doc.save(`migrant-${selectedCity}-report-${filters.dateFrom || ""}-to-${filters.dateTo || ""}.pdf`);
  }, [statistics, filters, selectedCity]);

  // Export: Excel
  const generateExcel = useCallback(() => {
    const cityKey = selectedCity === "jaipur" ? "jaipur" : "delhi";
    const problemsKey = selectedCity === "jaipur" ? "jaipurProblems" : "delhiProblems";
    const areaKey = selectedCity === "jaipur" ? "jaipurArea" : "delhiArea";
    const districtKey = selectedCity === "jaipur" ? "jaipurDistrict" : "delhiDistrict";
    const assemblyKey = selectedCity === "jaipur" ? "jaipurAssembly" : "delhiAssembly";

    const excelData = surveyData.map((item) => ({
      volunteerName: item.volunteerName || "",
      respondentName: item.respondentName || "",
      [`${cityKey}Area`]: (item as any)[areaKey] || "",
      [`${cityKey}District`]: (item as any)[districtKey] || "",
      [`${cityKey}Assembly`]: (item as any)[assemblyKey] || "",
      biharDistrict: item.biharDistrict || "",
      biharAssembly: item.biharAssembly || "",
      phoneNumber: item.phoneNumber || "",
      religion: item.religion || "",
      caste: item.caste || "",
      subCaste: item.subCaste || "",
      age: (item as any).age || "",
      gender: (item as any).gender || "",
      educationLevel: (item as any).educationLevel || "",
      livingWith: (item as any).livingWith || "",
      currentWork: Array.isArray(item.currentWork)
        ? item.currentWork.join(", ")
        : (item.currentWork as any) || "",
      otherWork: item.otherWork || "",
      migrationPeriod: item.migrationPeriod || "",
      monthlyIncome: item.monthlyIncome || "",
      moneySentHome: item.moneySentHome || "",
      otherMoneySent: item.otherMoneySent || "",
      biharProblems: Array.isArray(item.biharProblems)
        ? (item.biharProblems as any[]).join(", ")
        : (item.biharProblems as any) || "",
      otherBiharProblem: item.otherBiharProblem || "",
      [`${cityKey}Problems`]: Array.isArray((item as any)[problemsKey])
        ? ((item as any)[problemsKey] as any[]).join(", ")
        : (item as any)[problemsKey] || "",
      [`other${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}Problem`]: (item as any)[
        `other${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}Problem`
      ] || "",
      politicalParty: item.politicalParty || "",
      migrationReason: item.migrationReason || "",
      returnMotivation: item.returnMotivation || "",
      othersNearby: item.othersNearby || "",
      knownPeopleCount: item.knownPeopleCount || "",
      knownPeopleDetails: item.knownPeopleDetails || "",
      createdAt: (item.createdAt as any) || "",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Survey Data");
    XLSX.writeFile(
      workbook,
      `migrant-${selectedCity}-data-${filters.dateFrom || ""}-to-${filters.dateTo || ""}.xlsx`
    );
  }, [surveyData, filters, selectedCity]);

  if (!fbUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  if (!roleChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!tokenChecked) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="mb-2 text-gray-700 font-semibold">Connecting to Migrant API...</div>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-600 font-semibold mb-2">Failed to authenticate with Migrant API</div>
          <button
            onClick={async () => {
              try {
                const login = await loginMigrantApi();
                setIsAuthenticated(true);
                setApiUser(login.user);
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
          >
            Retry Login
          </button>
        </div>
      </div>
    );
  }

  const cityName = selectedCity === "jaipur" ? "Other Districts" : "Delhi";

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Migrant Survey Reports</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {apiUser?.username || "User"}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* City Switcher */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border px-3 py-2">
            <MapPin size={16} className="text-gray-500" />
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value as City)}
              className="border-none outline-none bg-transparent text-gray-700 font-medium"
            >
              <option value="delhi">Delhi</option>
              <option value="jaipur">Other Districts</option>
            </select>
          </div>

          <button
            onClick={generatePDF}
            disabled={loading || surveyData.length === 0}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FileText size={16} />
            Download PDF
          </button>
          <button
            onClick={generateExcel}
            disabled={loading || surveyData.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FileSpreadsheet size={16} />
            Download Excel
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter size={20} />
          Filters - {cityName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volunteer Name</label>
            <input
              type="text"
              placeholder="Enter volunteer name"
              value={filters.volunteerName || ""}
              onChange={(e) => handleFilterChange("volunteerName", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bihar District</label>
            <select
              value={filters.biharDistrict || ""}
              onChange={(e) => handleFilterChange("biharDistrict", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Districts</option>
              {indianDistricts.states
                .find((s) => s.key === "BR")
                ?.districts?.map((district) => (
                  <option key={district.key} value={district.name}>
                    {district.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Conditional City Districts */}
          {selectedCity === "delhi" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delhi District</label>
              <select
                value={filters.delhiDistrict || ""}
                onChange={(e) => handleFilterChange("delhiDistrict", e.target.value)}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Districts</option>
                {delhiDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCity === "jaipur" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surveying District</label>
              <select
                value={filters.jaipurDistrict || ""}
                onChange={(e) => handleFilterChange("jaipurDistrict", e.target.value)}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Districts</option>
                {migrantJaipurSurveyDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
            <select
              value={filters.availableCommunity || ""}
              onChange={(e) => handleFilterChange("availableCommunity", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Communities</option>
              {availableCommunity.map((community) => (
                <option key={community.key} value={community.key}>
                  {community.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Surveys</h3>
          <div className="text-3xl font-bold text-blue-600">{statistics?.totalSurveys || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Volunteers</h3>
          <div className="text-3xl font-bold text-green-600">
            {Object.keys(statistics?.volunteerStats || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Bihar Locations</h3>
          <div className="text-3xl font-bold text-purple-600">
            {Object.keys(statistics?.biharDistrictAssembly || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Problem Categories</h3>
          <div className="text-3xl font-bold text-orange-600">
            {Object.keys(statistics?.biharProblems || {}).length +
              Object.keys(
                selectedCity === "jaipur"
                  ? (statistics?.jaipurProblems || {})
                  : (statistics?.delhiProblems || {})
              ).length}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bihar District-Assembly Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4">Top Bihar District-Assembly</h3>
          {chartData.biharDistrictData.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData.biharDistrictData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={160} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[360px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Volunteer Performance Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4">Volunteer Performance</h3>
          {chartData.volunteerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData.volunteerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-59} textAnchor="end" height={130} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[360px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Bihar Problems Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4">Bihar Problems Distribution</h3>
          {chartData.biharProblemsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.biharProblemsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.biharProblemsData.map((entry, index) => (
                    <Cell key={`cell-bihar-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* City Problems Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4">{cityName} Problems Distribution</h3>
          {chartData.cityProblemsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.cityProblemsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.cityProblemsData.map((entry, index) => (
                    <Cell key={`cell-city-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-lg text-gray-600">Loading survey data...</div>
        </div>
      )}
    </div>
  );
}
