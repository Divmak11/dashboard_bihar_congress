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
import { FileText, FileSpreadsheet, Filter, LogOut } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  indianDistricts,
  availableCommunity,
  AssemblySeatsDistrictWise,
} from "@/data/statesData";
import {
  ManifestoFilters,
  ManifestoStatistics,
  ManifestoSurveyItem,
} from "../../models/manifestoTypes";
import {
  LS_KEYS,
  loginManifestoApi,
  fetchManifestoReportsPaged,
} from "../utils/fetchManifestoData";

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

const professions = [
  "किसान",
  "डॉक्टर",
  "वकील",
  "पत्रकार",
  "आंदोलनकारी",
  "पंचायत स्तरीय नेता",
  "रिटायर्ड सरकारी कर्मचारी",
  "शिक्षक",
  "प्रोफेसर",
  "स्कूल संचालक",
  "लाइब्रेरी संचालक",
  "सामाजिक कर्मी",
  "व्यापार",
];

const respondentGroups = [
  "संभावित उमीदवार",
  "जिला कांग्रेस कमिटी सदस्य",
  "प्रतिष्ठित व्यक्ति",
];

function formatDateLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ManifestoPage() {
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

  // External API auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiUser, setApiUser] = useState<any>(null);
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    // Ensure token; attempt auto-login using provided credentials
    async function ensureToken() {
      try {
        const existing = localStorage.getItem(LS_KEYS.TOKEN);
        if (existing) {
          setIsAuthenticated(true);
          const userStored = localStorage.getItem(LS_KEYS.USER);
          if (userStored) setApiUser(JSON.parse(userStored));
        } else {
          const login = await loginManifestoApi();
          setIsAuthenticated(true);
          setApiUser(login.user);
        }
      } catch (e) {
        console.error("[Manifesto] Login failed", e);
        setIsAuthenticated(false);
      } finally {
        setTokenChecked(true);
      }
    }
    ensureToken();
  }, []);

  // Filters
  const [filters, setFilters] = useState<ManifestoFilters>(() => ({
    dateFrom: formatDateLocalYYYYMMDD(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ),
    dateTo: formatDateLocalYYYYMMDD(new Date()),
    name: "",
    ageMin: "",
    ageMax: "",
    respondentGroup: "",
    profession: "",
    religion: "",
    casteCategory: "",
    subCaste: "",
    district: "",
    assembly: "",
    hasProtests: "",
  }));

  const handleFilterChange = useCallback(
    (key: keyof ManifestoFilters, value: any) => {
      setFilters((prev) => {
        if (key === "district") {
          return {
            ...prev,
            district: value,
            assembly: value === "" ? "" : prev.assembly,
          };
        }
        return { ...prev, [key]: value } as ManifestoFilters;
      });
    },
    []
  );

  // Data
  const [surveyData, setSurveyData] = useState<ManifestoSurveyItem[]>([]);
  const [statistics, setStatistics] = useState<ManifestoStatistics | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchManifestoReportsPaged(filters);
      setSurveyData(res.data);
      setStatistics(res.statistics);
    } catch (e: any) {
      console.error("[Manifesto] fetch error", e);
      if (e?.message === "unauthorized") {
        setIsAuthenticated(false);
      }
      setError(e?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [filters, isAuthenticated]);

  useEffect(() => {
    if (roleChecked && tokenChecked && isAuthenticated) {
      fetchData();
    }
  }, [roleChecked, tokenChecked, isAuthenticated, fetchData]);

  // Chart data preparation
  const chartData = useMemo(() => {
    const s = statistics || ({} as ManifestoStatistics);
    const professionData = Object.entries(s.professionStats || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, value]) => ({ name, value }));

    const respondentGroupData = Object.entries(s.respondentGroupStats || {}).map(
      ([name, value]) => ({ name, value })
    );

    const ageGroupData = Object.entries(s.ageGroupStats || {}).map(
      ([name, data]: any) => ({
        name,
        value: typeof data === "object" ? data.count : data,
        avgAge: typeof data === "object" ? data.avgAge || 0 : 0,
      })
    );

    const religionData = Object.entries(s.religionStats || {}).map(
      ([name, value]) => ({ name, value })
    );

    const casteCategoryData = Object.entries(s.casteCategoryStats || {}).map(
      ([name, value]) => ({ name, value })
    );

    const assemblyData = Object.entries(s.districtAssembly || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    return {
      professionData,
      respondentGroupData,
      ageGroupData,
      religionData,
      casteCategoryData,
      assemblyData,
    };
  }, [statistics]);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem(LS_KEYS.TOKEN);
      localStorage.removeItem(LS_KEYS.USER);
    } catch {}
    setIsAuthenticated(false);
    setApiUser(null);
    setSurveyData([]);
    setStatistics(undefined);
  }, []);

  // Export: PDF
  const generatePDF = useCallback(() => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("Manifesto Survey Report", 105, 20, { align: "center" });

    // Info
    doc.setFontSize(12);
    doc.text(
      `Report Period: ${filters.dateFrom || "-"} to ${filters.dateTo || "-"}`,
      20,
      35
    );
    doc.text(`Total Surveys: ${statistics?.totalSurveys || 0}`, 20, 45);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 55);

    let y = 70;
    doc.setFontSize(16);
    doc.text("Statistical Summary", 20, y);
    y += 15;

    const tableData: any[] = [
      ["Category", "Top Values"],
      [
        "Respondent Groups",
        Object.entries(statistics?.respondentGroupStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "District-Assembly",
        Object.entries(statistics?.districtAssembly || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Professions",
        Object.entries(statistics?.professionStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Religion",
        Object.entries(statistics?.religionStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Caste Category",
        Object.entries(statistics?.casteCategoryStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Sub Caste",
        Object.entries(statistics?.subCasteStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Age Groups",
        Object.entries(statistics?.ageGroupStats || {})
          .map(([k, d]: any) => {
            const count = typeof d === "object" ? d.count : d;
            const avgAge = typeof d === "object" && d.avgAge ? ` (avg: ${d.avgAge.toFixed(1)})` : "";
            return `${k} (${count})${avgAge}`;
          })
          .join(", ") || "No data",
      ],
      [
        "Protest Participation",
        Object.entries(statistics?.protestStats || {})
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Top Specific Problems",
        Object.entries(statistics?.specificProblemsStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([k, v]) => `${k} (${v})`)
          .join(", ") || "No data",
      ],
      [
        "Top Caste Issues",
        Object.entries(statistics?.casteIssuesStats || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
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

    // New page for survey rows
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.text("Complete Survey Data", 20, y);
    y += 15;

    const surveyTableData = surveyData.map((item) => [
      item.name || "N/A",
      item.age || "N/A",
      item.respondentGroup || "N/A",
      item.phoneNumber || "N/A",
      Array.isArray(item.profession)
        ? item.profession.join(", ")
        : item.profession || "N/A",
      item.religion || "N/A",
      item.casteCategory || "N/A",
      item.subCaste || "N/A",
      item.district || "N/A",
      item.assembly || "N/A",
      item.hasProtests || "N/A",
      item.specificProblemsCount || "N/A",
      Array.isArray(item.specificProblems)
        ? item.specificProblems.filter((p) => p && p.trim() !== "").join("; ")
        : item.specificProblems || "N/A",
      item.casteIssuesCount || "N/A",
      Array.isArray(item.casteIssues)
        ? (item.casteIssues as any[])
            .map((issue: any) => `${issue.community || ""}-${issue.problem || ""}`)
            .join("; ")
        : "N/A",
      item.protestCount || "N/A",
      Array.isArray(item.protestDetails)
        ? item.protestDetails.filter((p) => p && p.trim() !== "").join("; ")
        : (item.protestDetails as any) || "N/A",
      item.religionPercentages
        ? Object.entries(item.religionPercentages)
            .map(([k, v]) => `${k}:${v}`)
            .join("; ")
        : "N/A",
      item.communityPercentages
        ? Object.entries(item.communityPercentages)
            .map(([k, v]) => `${k}:${v}`)
            .join("; ")
        : "N/A",
      item.problemAspects
        ? Object.entries(item.problemAspects)
            .map(([k, v]) => `${k}:${v}`)
            .join("; ")
        : "N/A",
      item.createdAt ? new Date(item.createdAt as any).toLocaleDateString() : "N/A",
    ]);

    const surveyHeaders = [
      "Name",
      "Age",
      "Group",
      "Phone",
      "Profession",
      "Religion",
      "Caste Category",
      "Sub Caste",
      "District",
      "Assembly",
      "Protests",
      "Problems Count",
      "Specific Problems",
      "Caste Issues Count",
      "Caste Issues",
      "Protest Count",
      "Protest Details",
      "Religion %",
      "Community %",
      "Problem Aspects",
      "Created Date",
    ];

    autoTable(doc, {
      head: [surveyHeaders],
      body: surveyTableData as any,
      startY: y,
      styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak", cellWidth: "wrap" },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 10 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 20 },
        5: { cellWidth: 12 },
        6: { cellWidth: 15 },
        7: { cellWidth: 15 },
        8: { cellWidth: 15 },
        9: { cellWidth: 15 },
        10: { cellWidth: 8 },
        11: { cellWidth: 8 },
        12: { cellWidth: 30 },
        13: { cellWidth: 8 },
        14: { cellWidth: 25 },
        15: { cellWidth: 8 },
        16: { cellWidth: 25 },
        17: { cellWidth: 20 },
        18: { cellWidth: 20 },
        19: { cellWidth: 20 },
        20: { cellWidth: 12 },
      },
      margin: { left: 10, right: 10 },
      tableWidth: "auto",
    });

    // Footer summary
    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
    let nextY = finalY > 250 ? 20 : finalY + 20;
    if (finalY > 250) doc.addPage();

    doc.setFontSize(12);
    doc.text("Report Summary:", 20, nextY);
    nextY += 10;
    doc.setFontSize(10);
    doc.text(`• Total Surveys Processed: ${surveyData.length}`, 25, nextY);
    nextY += 8;
    doc.text(
      `• Date Range: ${filters.dateFrom || "-"} to ${filters.dateTo || "-"}`,
      25,
      nextY
    );
    nextY += 8;
    const mostCommonGroup = Object.entries(
      statistics?.respondentGroupStats || {}
    )
      .sort(([, a], [, b]) => (b as number) - (a as number))?.[0]?.[0];
    doc.text(
      `• Most Common Respondent Group: ${mostCommonGroup || "N/A"}`,
      25,
      nextY
    );
    nextY += 8;
    const mostCommonProfession = Object.entries(
      statistics?.professionStats || {}
    )
      .sort(([, a], [, b]) => (b as number) - (a as number))?.[0]?.[0];
    doc.text(
      `• Most Common Profession: ${mostCommonProfession || "N/A"}`,
      25,
      nextY
    );
    nextY += 8;
    const yesCount = statistics?.protestStats?.["हाँ"] || 0;
    const pct = statistics?.totalSurveys
      ? ((yesCount / statistics.totalSurveys) * 100).toFixed(1) + "%"
      : "N/A";
    doc.text(`• Protest Participation Rate: ${pct}`, 25, nextY);

    doc.save(
      `manifesto-survey-report-${filters.dateFrom || ""}-to-${filters.dateTo || ""}.pdf`
    );
  }, [statistics, surveyData, filters]);

  // Export: Excel
  const generateExcel = useCallback(() => {
    const excelData = surveyData.map((item) => ({
      name: item.name || "",
      age: item.age || "",
      respondentGroup: item.respondentGroup || "",
      phoneNumber: item.phoneNumber || "",
      profession: Array.isArray(item.profession)
        ? item.profession.join(", ")
        : (item.profession as any) || "",
      religion: item.religion || "",
      casteCategory: item.casteCategory || "",
      subCaste: item.subCaste || "",
      district: item.district || "",
      assembly: item.assembly || "",
      religionPercentages: item.religionPercentages
        ? Object.entries(item.religionPercentages)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "",
      communityPercentages: item.communityPercentages
        ? Object.entries(item.communityPercentages)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "",
      problemAspects: item.problemAspects
        ? Object.entries(item.problemAspects)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "",
      specificProblemsCount: item.specificProblemsCount || "",
      specificProblems: Array.isArray(item.specificProblems)
        ? item.specificProblems.filter((p) => p && p.trim() !== "").join(", ")
        : (item.specificProblems as any) || "",
      casteIssuesCount: item.casteIssuesCount || "",
      casteIssues: Array.isArray(item.casteIssues)
        ? (item.casteIssues as any[])
            .map(
              (issue: any) =>
                `Community: ${issue.community || "N/A"}, SubCaste: ${
                  issue.subCaste || "N/A"
                }, Problem: ${issue.problem || "N/A"}`
            )
            .join(" | ")
        : "",
      hasProtests: (item.hasProtests as any) || "",
      protestCount: item.protestCount || "",
      protestDetails: Array.isArray(item.protestDetails)
        ? item.protestDetails.filter((p) => p && p.trim() !== "").join(", ")
        : (item.protestDetails as any) || "",
      createdAt: (item.createdAt as any) || "",
      updatedAt: (item.updatedAt as any) || "",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Manifesto Survey Data");
    XLSX.writeFile(
      workbook,
      `manifesto-survey-data-${filters.dateFrom || ""}-to-${filters.dateTo || ""}.xlsx`
    );
  }, [surveyData, filters]);

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
          <div className="mb-2 text-gray-700 font-semibold">Connecting to Manifesto API...</div>
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
          <div className="text-red-600 font-semibold mb-2">Failed to authenticate with Manifesto API</div>
          <button
            onClick={async () => {
              try {
                const login = await loginManifestoApi();
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

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manifesto Survey Reports</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {apiUser?.username || "User"}</p>
        </div>
        <div className="flex items-center gap-2">
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
          Filters
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              placeholder="Search by name"
              value={filters.name || ""}
              onChange={(e) => handleFilterChange("name", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Age</label>
            <input
              type="number"
              placeholder="Min age"
              value={filters.ageMin as any}
              onChange={(e) => handleFilterChange("ageMin", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
            <input
              type="number"
              placeholder="Max age"
              value={filters.ageMax as any}
              onChange={(e) => handleFilterChange("ageMax", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Respondent Group</label>
            <select
              value={filters.respondentGroup || ""}
              onChange={(e) => handleFilterChange("respondentGroup", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Groups</option>
              {respondentGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
            <select
              value={filters.profession || ""}
              onChange={(e) => handleFilterChange("profession", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Professions</option>
              {professions.map((profession) => (
                <option key={profession} value={profession}>
                  {profession}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
            <select
              value={filters.religion || ""}
              onChange={(e) => handleFilterChange("religion", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Religions</option>
              <option value="हिन्दू">हिन्दू</option>
              <option value="मुस्लिम">मुस्लिम</option>
              <option value="सिख">सिख</option>
              <option value="ईसाई">ईसाई</option>
              <option value="जैन">जैन</option>
              <option value="बौद्ध">बौद्ध</option>
              <option value="अन्य">अन्य</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select
              value={filters.district || ""}
              onChange={(e) => handleFilterChange("district", e.target.value)}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly</label>
            <select
              value={filters.assembly || ""}
              onChange={(e) => handleFilterChange("assembly", e.target.value)}
              disabled={!filters.district}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Assemblies</option>
              {AssemblySeatsDistrictWise.state
                .find((s) => s.stateKey === "BR")
                ?.districts?.find((d) => d.districtName === filters.district)
                ?.constituencies?.map((assembly) => (
                  <option key={assembly.id} value={assembly.name}>
                    {assembly.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
            <select
              value={filters.casteCategory || ""}
              onChange={(e) => handleFilterChange("casteCategory", e.target.value)}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Has Protests</label>
            <select
              value={filters.hasProtests || ""}
              onChange={(e) => handleFilterChange("hasProtests", e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="हाँ">हाँ</option>
              <option value="नहीं">नहीं</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Surveys</h3>
          <div className="text-3xl font-bold text-blue-600">{statistics?.totalSurveys || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Respondent Groups</h3>
          <div className="text-3xl font-bold text-green-600">
            {Object.keys(statistics?.respondentGroupStats || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Locations</h3>
          <div className="text-3xl font-bold text-purple-600">
            {Object.keys(statistics?.districtAssembly || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">With Protests</h3>
          <div className="text-3xl font-bold text-orange-600">
            {statistics?.protestStats?.["हाँ"] || 0}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profession Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Profession Distribution</h3>
          {chartData.professionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.professionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Respondent Group Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Respondent Group Distribution</h3>
          {chartData.respondentGroupData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.respondentGroupData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.respondentGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Age Groups */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Age Groups</h3>
          {chartData.ageGroupData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.ageGroupData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Religion Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Religion Distribution</h3>
          {chartData.religionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.religionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Caste Category Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Community (Caste Category)</h3>
          {chartData.casteCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.casteCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Top Assemblies */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Top 10 District-Assemblies</h3>
          {chartData.assemblyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.assemblyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-4 text-center text-sm text-gray-600">
          Loading data...
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
