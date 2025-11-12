'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, FileSpreadsheet, Filter, LogOut } from 'lucide-react';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable'
import * as XLSX from 'xlsx';
import { indianDistricts, availableCommunity, AssemblySeatsDistrictWise } from '@/data/statesData';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const professions = [
  'किसान', 'डॉक्टर', 'वकील', 'पत्रकार', 'आंदोलनकारी', 'पंचायत स्तरीय नेता',
  'रिटायर्ड सरकारी कर्मचारी', 'शिक्षक', 'प्रोफेसर', 'स्कूल संचालक',
  'लाइब्रेरी संचालक', 'सामाजिक कर्मी', 'व्यापार'
];

const respondentGroups = [
  'संभावित उमीदवार',
  'जिला कांग्रेस कमिटी सदस्य',
  'प्रतिष्ठित व्यक्ति'
];

const LoginForm = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Replace with your actual API endpoint
      const response = await fetch('https://api.shaktiabhiyan.in/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        onLogin(data.token, data.data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Manifesto Survey Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access reports
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ManifestoReportDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [surveyData, setSurveyData] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    name: '',
    ageMin: '',
    ageMax: '',
    respondentGroup: '',
    profession: '',
    religion: '',
    casteCategory: '',
    subCaste: '',
    district: '',
    assembly: '',
    hasProtests: ''
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSurveyData();
    }
  }, [isAuthenticated, filters]);

  const handleLogin = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Fetch data from API with filters
  const fetchSurveyData = async () => {
    setLoading(true);
    try {
      let allData = [];
      let currentPage = 1;
      const limit = 500;
      let totalSurveys = 0;

      while (true) {
        const queryParams = new URLSearchParams();

        // Add filters
        Object.keys(filters).forEach(key => {
          if (filters[key]) {
            queryParams.append(key, filters[key]);
          }
        });

        queryParams.append("page", currentPage.toString());
        queryParams.append("limit", limit.toString());

        // Replace with your actual API endpoint
        const response = await fetch(
          `https://api.shaktiabhiyan.in/api/v1/manifestoSurvey/reports?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            handleLogout();
          } else {
            console.error("API Error:", response.status);
          }
          break;
        }

        const data = await response.json();

        if (currentPage === 1) {
          totalSurveys = data.statistics?.totalSurveys || 0;
          setStatistics(data.statistics || {});
        }

        allData = [...allData, ...(data.data || [])];

        console.log(
          `Fetched page ${currentPage}, total so far: ${allData.length}/${totalSurveys}`
        );

        if (allData.length >= totalSurveys || data.data.length === 0) {
          break;
        }

        currentPage++;
      }

      setSurveyData(allData);
      console.log(`✅ Done! Total fetched: ${allData.length}`);

    } catch (error) {
      console.error("Error fetching survey data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      if (key === "district") {
        return {
          ...prev,
          district: value,
          assembly: value === "" ? "" : prev.assembly,
        };
      }
      return { ...prev, [key]: value };
    });
  };


  // Generate PDF Report
  const generatePDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('Manifesto Survey Report', 105, 20, { align: 'center' });

    // Date range and basic info
    doc.setFontSize(12);
    doc.text(`Report Period: ${filters.dateFrom} to ${filters.dateTo}`, 20, 35);
    doc.text(`Total Surveys: ${statistics.totalSurveys || 0}`, 20, 45);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 55);

    let yPosition = 70;

    // Statistical Summary Table
    doc.setFontSize(16);
    doc.text('Statistical Summary', 20, yPosition);
    yPosition += 15;

    const tableData = [
      ['Category', 'Top Values'],
      [
        'Respondent Groups',
        Object.entries(statistics.respondentGroupStats || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'District-Assembly',
        Object.entries(statistics.districtAssembly || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Professions',
        Object.entries(statistics.professionStats || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Religion',
        Object.entries(statistics.religionStats || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Caste Category',
        Object.entries(statistics.casteCategoryStats || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Sub Caste',
        Object.entries(statistics.subCasteStats || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Age Groups',
        Object.entries(statistics.ageGroupStats || {})
          .map(([key, data]) => {
            const count = typeof data === 'object' ? data.count : data;
            const avgAge = typeof data === 'object' && data.avgAge ? ` (avg: ${data.avgAge.toFixed(1)})` : '';
            return `${key} (${count})${avgAge}`;
          })
          .join(', ') || 'No data'
      ],
      [
        'Protest Participation',
        Object.entries(statistics.protestStats || {})
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Top Specific Problems',
        Object.entries(statistics.specificProblemsStats || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Top Caste Issues',
        Object.entries(statistics.casteIssuesStats || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ]
    ];

    autoTable(doc, {
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: yPosition,
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 140 } },
      margin: { left: 20, right: 20 }
    });

    // Add new page for detailed survey data
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.text('Complete Survey Data', 20, yPosition);
    yPosition += 15;

    // Prepare survey data for table
    const surveyTableData = surveyData.map(item => [
      item.name || 'N/A',
      item.age || 'N/A',
      item.respondentGroup || 'N/A',
      item.phoneNumber || 'N/A',
      Array.isArray(item.profession) ? item.profession.join(', ') : item.profession || 'N/A',
      item.religion || 'N/A',
      item.casteCategory || 'N/A',
      item.subCaste || 'N/A',
      item.district || 'N/A',
      item.assembly || 'N/A',
      item.hasProtests || 'N/A',
      item.specificProblemsCount || 'N/A',
      Array.isArray(item.specificProblems) ?
        item.specificProblems.filter(p => p && p.trim() !== '').join('; ') : item.specificProblems || 'N/A',
      item.casteIssuesCount || 'N/A',
      Array.isArray(item.casteIssues) ?
        item.casteIssues.map(issue => `${issue.community || ''}-${issue.problem || ''}`).join('; ') : 'N/A',
      item.protestCount || 'N/A',
      Array.isArray(item.protestDetails) ?
        item.protestDetails.filter(p => p && p.trim() !== '').join('; ') : item.protestDetails || 'N/A',
      item.religionPercentages ?
        Object.entries(item.religionPercentages).map(([k, v]) => `${k}:${v}`).join('; ') : 'N/A',
      item.communityPercentages ?
        Object.entries(item.communityPercentages).map(([k, v]) => `${k}:${v}`).join('; ') : 'N/A',
      item.problemAspects ?
        Object.entries(item.problemAspects).map(([k, v]) => `${k}:${v}`).join('; ') : 'N/A',
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'
    ]);

    const surveyHeaders = [
      'Name', 'Age', 'Group', 'Phone', 'Profession', 'Religion', 'Caste Category',
      'Sub Caste', 'District', 'Assembly', 'Protests', 'Problems Count',
      'Specific Problems', 'Caste Issues Count', 'Caste Issues', 'Protest Count',
      'Protest Details', 'Religion %', 'Community %', 'Problem Aspects', 'Created Date'
    ];

    autoTable(doc, {
      head: [surveyHeaders],
      body: surveyTableData,
      startY: yPosition,
      styles: {
        fontSize: 6,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      columnStyles: {
        0: { cellWidth: 15 }, // Name
        1: { cellWidth: 10 }, // Age
        2: { cellWidth: 20 }, // Group
        3: { cellWidth: 15 }, // Phone
        4: { cellWidth: 20 }, // Profession
        5: { cellWidth: 12 }, // Religion
        6: { cellWidth: 15 }, // Caste Category
        7: { cellWidth: 15 }, // Sub Caste
        8: { cellWidth: 15 }, // District
        9: { cellWidth: 15 }, // Assembly
        10: { cellWidth: 8 }, // Protests
        11: { cellWidth: 8 }, // Problems Count
        12: { cellWidth: 30 }, // Specific Problems
        13: { cellWidth: 8 }, // Caste Issues Count
        14: { cellWidth: 25 }, // Caste Issues
        15: { cellWidth: 8 }, // Protest Count
        16: { cellWidth: 25 }, // Protest Details
        17: { cellWidth: 20 }, // religions %
        18: { cellWidth: 20 }, // Community %
        19: { cellWidth: 20 }, // Problem Aspects
        20: { cellWidth: 12 }  // Created Date
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'auto'
    });

    // Add footer with summary
    const finalY = doc.lastAutoTable.finalY || yPosition + 50;
    if (finalY > 250) {
      doc.addPage();
      yPosition = 20;
    } else {
      yPosition = finalY + 20;
    }

    doc.setFontSize(12);
    doc.text('Report Summary:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`• Total Surveys Processed: ${surveyData.length}`, 25, yPosition);
    yPosition += 8;
    doc.text(`• Date Range: ${filters.dateFrom} to ${filters.dateTo}`, 25, yPosition);
    yPosition += 8;
    doc.text(`• Most Common Respondent Group: ${Object.entries(statistics.respondentGroupStats || {})
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}`, 25, yPosition);
    yPosition += 8;
    doc.text(`• Most Common Profession: ${Object.entries(statistics.professionStats || {})
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}`, 25, yPosition);
    yPosition += 8;
    doc.text(`• Protest Participation Rate: ${statistics.protestStats?.['हाँ'] ?
      ((statistics.protestStats['हाँ'] / statistics.totalSurveys) * 100).toFixed(1) + '%' : 'N/A'}`, 25, yPosition);

    doc.save(`manifesto-survey-report-${filters.dateFrom}-to-${filters.dateTo}.pdf`);
  };

  // Generate Excel Report
  const generateExcel = () => {
    const excelData = surveyData.map(item => ({
      // Basic Information
      name: item.name || '',
      age: item.age || '',
      respondentGroup: item.respondentGroup || '',
      phoneNumber: item.phoneNumber || '',
      profession: Array.isArray(item.profession) ? item.profession.join(', ') : item.profession || '',
      religion: item.religion || '',
      casteCategory: item.casteCategory || '',
      subCaste: item.subCaste || '',
      district: item.district || '',
      assembly: item.assembly || '',

      // Religion Percentages (Map converted to string)
      religionPercentages: item.religionPercentages ?
        Object.entries(item.religionPercentages).map(([key, value]) => `${key}: ${value}`).join(', ') : '',

      // Community Percentages (Map converted to string)
      communityPercentages: item.communityPercentages ?
        Object.entries(item.communityPercentages).map(([key, value]) => `${key}: ${value}`).join(', ') : '',

      // Problem Aspects (Map converted to string)
      problemAspects: item.problemAspects ?
        Object.entries(item.problemAspects).map(([key, value]) => `${key}: ${value}`).join(', ') : '',

      // Specific Problems
      specificProblemsCount: item.specificProblemsCount || '',
      specificProblems: Array.isArray(item.specificProblems) ?
        item.specificProblems.filter(p => p && p.trim() !== '').join(', ') : item.specificProblems || '',

      // Caste-specific Issues
      casteIssuesCount: item.casteIssuesCount || '',
      casteIssues: Array.isArray(item.casteIssues) ?
        item.casteIssues.map(issue =>
          `Community: ${issue.community || 'N/A'}, SubCaste: ${issue.subCaste || 'N/A'}, Problem: ${issue.problem || 'N/A'}`
        ).join(' | ') : '',

      // Protests
      hasProtests: item.hasProtests || '',
      protestCount: item.protestCount || '',
      protestDetails: Array.isArray(item.protestDetails) ?
        item.protestDetails.filter(p => p && p.trim() !== '').join(', ') : item.protestDetails || '',

      // Timestamps
      createdAt: item.createdAt || '',
      updatedAt: item.updatedAt || ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Manifesto Survey Data');
    XLSX.writeFile(workbook, `manifesto-survey-data-${filters.dateFrom}-to-${filters.dateTo}.xlsx`);
  };

  // Prepare chart data from statistics
  const prepareChartData = () => {
    const professionData = Object.entries(statistics.professionStats || {})
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    const respondentGroupData = Object.entries(statistics.respondentGroupStats || {})
      .map(([name, value]) => ({ name, value }));

    const ageGroupData = Object.entries(statistics.ageGroupStats || {})
      .map(([name, data]) => ({
        name,
        value: data.count || data,
        avgAge: data.avgAge || 0
      }));

    const religionData = Object.entries(statistics.religionStats || {})
      .map(([name, value]) => ({ name, value }));

    const casteCategoryData = Object.entries(statistics.casteCategoryStats || {})
      .map(([name, value]) => ({ name, value }));

    const assemblyData = Object.entries(statistics.districtAssembly || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    return {
      professionData,
      respondentGroupData,
      ageGroupData,
      religionData,
      casteCategoryData,
      assemblyData
    };
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const chartData = prepareChartData();

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manifesto Survey Reports</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {user?.username || 'User'}</p>
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
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              placeholder="Search by name"
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Age</label>
            <input
              type="number"
              placeholder="Min age"
              value={filters.ageMin}
              onChange={(e) => handleFilterChange('ageMin', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
            <input
              type="number"
              placeholder="Max age"
              value={filters.ageMax}
              onChange={(e) => handleFilterChange('ageMax', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Respondent Group</label>
            <select
              value={filters.respondentGroup}
              onChange={(e) => handleFilterChange('respondentGroup', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Groups</option>
              {respondentGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
            <select
              value={filters.profession}
              onChange={(e) => handleFilterChange('profession', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Professions</option>
              {professions.map(profession => (
                <option key={profession} value={profession}>{profession}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
            <select
              value={filters.religion}
              onChange={(e) => handleFilterChange('religion', e.target.value)}
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
              value={filters.district}
              onChange={(e) => handleFilterChange('district', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Districts</option>
              {indianDistricts.states.find(s => s.key === 'BR')?.districts?.map(district => (
                <option key={district.key} value={district.name}>{district.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly</label>
            <select
              value={filters.assembly}
              onChange={(e) => handleFilterChange('assembly', e.target.value)}
              disabled={!filters.district}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Assemblies</option>
              {AssemblySeatsDistrictWise.state.find(s => s.stateKey === 'BR')?.districts?.find(d => d.districtName === filters.district)?.constituencies?.map(assembly => (
                <option key={assembly.id} value={assembly.name}>{assembly.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
            <select
              value={filters.casteCategory}
              onChange={(e) => handleFilterChange('casteCategory', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Communities</option>
              {availableCommunity.map(community => (
                <option key={community.key} value={community.key}>
                  {community.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Has Protests</label>
            <select
              value={filters.hasProtests}
              onChange={(e) => handleFilterChange('hasProtests', e.target.value)}
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
          <div className="text-3xl font-bold text-blue-600">{statistics.totalSurveys || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Respondent Groups</h3>
          <div className="text-3xl font-bold text-green-600">
            {Object.keys(statistics.respondentGroupStats || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Locations</h3>
          <div className="text-3xl font-bold text-purple-600">
            {Object.keys(statistics.districtAssembly || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">With Protests</h3>
          <div className="text-3xl font-bold text-orange-600">
            {statistics.protestStats?.['हाँ'] || 0}
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Age Group Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Age Group Distribution</h3>
          {chartData.ageGroupData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.ageGroupData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name === 'value' ? 'Count' : name]} />
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
              <PieChart>
                <Pie
                  data={chartData.religionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.religionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

        {/* Caste Category Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Caste Category Distribution</h3>
          {chartData.casteCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.casteCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
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

        {/* Top 10 Assembly Response */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Top 10 Assembly Constituencies</h3>
          {chartData.assemblyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.assemblyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
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
      </div>

      {/* Detailed Statistics Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profession Stats */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Profession Breakdown</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(statistics.professionStats || {})
                .sort(([, a], [, b]) => b - a)
                .map(([profession, count]) => (
                  <div key={profession} className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{profession}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* District-Assembly Stats */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">District-Assembly Breakdown</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(statistics.districtAssembly || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([location, count]) => (
                  <div key={location} className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{location}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Other Stats */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Other Statistics</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Protests Participation:</span>
                <div className="ml-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Yes (हाँ)</span>
                    <span className="font-medium text-green-600">{statistics.protestStats?.['हाँ'] || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">No (नहीं)</span>
                    <span className="font-medium text-red-600">{statistics.protestStats?.['नहीं'] || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-600">Age Distribution:</span>
                <div className="ml-2 space-y-1">
                  {Object.entries(statistics.ageGroupStats || {})
                    .map(([ageGroup, data]) => (
                      <div key={ageGroup} className="flex justify-between">
                        <span className="text-xs text-gray-500">{ageGroup}</span>
                        <span className="font-medium text-blue-600">
                          {typeof data === 'object' ? data.count : data}
                          {typeof data === 'object' && data.avgAge ? ` (avg: ${data.avgAge.toFixed(1)})` : ''}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-600">Religion Distribution:</span>
                <div className="ml-2 space-y-1">
                  {Object.entries(statistics.religionStats || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([religion, count]) => (
                      <div key={religion} className="flex justify-between">
                        <span className="text-xs text-gray-500">{religion}</span>
                        <span className="font-medium text-purple-600">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Survey Data Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Survey Responses</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profession</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assembly</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protests</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {surveyData.map((survey, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {survey.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.age || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.respondentGroup || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Array.isArray(survey.profession) ? survey.profession.join(', ') : survey.profession || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.district || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {survey.assembly || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${survey.hasProtests === 'हाँ'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {survey.hasProtests || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {surveyData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No survey data available
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center p-8 bg-white rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div className="text-lg text-gray-600">Loading survey data...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManifestoReportDashboard;