'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, FileSpreadsheet, Calendar, Filter, LogOut, User, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable'
import * as XLSX from 'xlsx';
import { indianDistricts, availableCommunity, AssemblySeatsDistrictWise, subCasteList } from '@/data/statesData';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const LoginForm = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access Survey Report Dashboard
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

const ReportGeneration = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedCity, setSelectedCity] = useState('delhi'); // Default to Delhi
  const [surveyData, setSurveyData] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    volunteerName: '',
    biharDistrict: '',
    delhiDistrict: '',
    jaipurDistrict: '', // Add Jaipur district filter
    availableCommunity: ''
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
  }, [isAuthenticated, filters, selectedCity]);

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

  const getApiUrl = () => {
    return selectedCity === 'jaipur' 
      ? 'https://api.shaktiabhiyan.in/api/v1/migrantSurveyJaipur/reports'
      : 'https://api.shaktiabhiyan.in/api/v1/migrantSurvey/reports';
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

        // Add filters based on selected city
        Object.keys(filters).forEach(key => {
          if (filters[key]) {
            // Skip city-specific filters for the other city
            if (selectedCity === 'jaipur' && key === 'delhiDistrict') return;
            if (selectedCity === 'delhi' && key === 'jaipurDistrict') return;
            queryParams.append(key, filters[key]);
          }
        });

        queryParams.append("page", currentPage.toString());
        queryParams.append("limit", limit.toString());

        const response = await fetch(
          `${getApiUrl()}?${queryParams.toString()}`,
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

        if (allData.length >= totalSurveys) {
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
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    // Reset city-specific filters when switching
    setFilters(prev => ({
      ...prev,
      delhiDistrict: '',
      jaipurDistrict: ''
    }));
  };

  // Generate PDF Report
  const generatePDF = () => {
    const doc = new jsPDF();
    const cityName = selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1);

    // Title
    doc.setFontSize(20);
    doc.text(`${cityName} Survey Report`, 105, 20, { align: 'center' });

    // Date range
    doc.setFontSize(12);
    doc.text(`Report Period: ${filters.dateFrom} to ${filters.dateTo}`, 20, 35);
    doc.text(`Total Surveys: ${statistics.totalSurveys || 0}`, 20, 45);

    let yPosition = 60;

    // Statistical Summary Table
    doc.setFontSize(16);
    doc.text('Statistical Summary', 20, yPosition);
    yPosition += 15;

    const getStatsKey = (key) => {
      if (selectedCity === 'jaipur') {
        return key.replace('delhi', 'jaipur');
      }
      return key;
    };

    const tableData = [
      ['Category', 'Top Values'],
      [
        'Bihar (District-Assembly)',
        Object.entries(statistics.biharDistrictAssembly || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Bihar Problems',
        Object.entries(statistics.biharProblems || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        `${cityName} Problems`,
        Object.entries(statistics[selectedCity === 'jaipur' ? 'jaipurProblems' : 'delhiProblems'] || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Religion',
        Object.entries(statistics.religion || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Caste',
        Object.entries(statistics.caste || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Political Party',
        Object.entries(statistics.politicalParty || {})
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => `${key} (${value})`)
          .join(', ') || 'No data'
      ],
      [
        'Volunteer Name (surveys counted)',
        Object.entries(statistics.volunteerStats || {})
          .sort(([, a], [, b]) => b - a)
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

    doc.save(`${selectedCity}-survey-report-${filters.dateFrom}-to-${filters.dateTo}.pdf`);
  };

  // Generate Excel Report
  const generateExcel = () => {
    const cityKey = selectedCity === 'jaipur' ? 'jaipur' : 'delhi';
    const problemsKey = selectedCity === 'jaipur' ? 'jaipurProblems' : 'delhiProblems';
    const areaKey = selectedCity === 'jaipur' ? 'jaipurArea' : 'delhiArea';
    const districtKey = selectedCity === 'jaipur' ? 'jaipurDistrict' : 'delhiDistrict';
    const assemblyKey = selectedCity === 'jaipur' ? 'jaipurAssembly' : 'delhiAssembly';

    const excelData = surveyData.map(item => ({
      volunteerName: item.volunteerName || '',
      respondentName: item.respondentName || '',
      [`${cityKey}Area`]: item[areaKey] || '',
      [`${cityKey}District`]: item[districtKey] || '',
      [`${cityKey}Assembly`]: item[assemblyKey] || '',
      biharDistrict: item.biharDistrict || '',
      biharAssembly: item.biharAssembly || '',
      phoneNumber: item.phoneNumber || '',
      religion: item.religion || '',
      caste: item.caste || '',
      subCaste: item.subCaste || '',
      age: item.age || '',
      gender: item.gender || '',
      educationLevel: item.educationLevel || '',
      livingWith: item.livingWith || '',
      currentWork: Array.isArray(item.currentWork) ? item.currentWork.join(', ') : item.currentWork || '',
      otherWork: item.otherWork || '',
      migrationPeriod: item.migrationPeriod || '',
      monthlyIncome: item.monthlyIncome || '',
      moneySentHome: item.moneySentHome || '',
      otherMoneySent: item.otherMoneySent || '',
      biharProblems: Array.isArray(item.biharProblems) ? item.biharProblems.join(', ') : item.biharProblems || '',
      otherBiharProblem: item.otherBiharProblem || '',
      [`${cityKey}Problems`]: Array.isArray(item[problemsKey]) ? item[problemsKey].join(', ') : item[problemsKey] || '',
      [`other${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}Problem`]: item[`other${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}Problem`] || '',
      politicalParty: item.politicalParty || '',
      migrationReason: item.migrationReason || '',
      returnMotivation: item.returnMotivation || '',
      othersNearby: item.othersNearby || '',
      knownPeopleCount: item.knownPeopleCount || '',
      knownPeopleDetails: item.knownPeopleDetails || '',
      createdAt: item.createdAt || ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Survey Data');

    XLSX.writeFile(workbook, `${selectedCity}-survey-data-${filters.dateFrom}-to-${filters.dateTo}.xlsx`);
  };

  // Prepare chart data from statistics
  const prepareChartData = () => {
    const biharDistrictData = Object.entries(statistics.biharDistrictAssembly || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const biharProblemsData = Object.entries(statistics.biharProblems || {})
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    const cityProblemsKey = selectedCity === 'jaipur' ? 'jaipurProblems' : 'delhiProblems';
    const cityProblemsData = Object.entries(statistics[cityProblemsKey] || {})
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    const volunteerData = Object.entries(statistics.volunteerStats || {})
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    return { biharDistrictData, biharProblemsData, cityProblemsData, volunteerData };
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const chartData = prepareChartData();
  const cityName = selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Survey Report Generation</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {user?.username}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* City Switcher */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border px-3 py-2">
            <MapPin size={16} className="text-gray-500" />
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
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
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
          <Filter size={20} />
          Filters - {cityName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volunteer Name</label>
            <input
              type="text"
              placeholder="Enter volunteer name"
              value={filters.volunteerName}
              onChange={(e) => handleFilterChange('volunteerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bihar District</label>
            <select
              value={filters.biharDistrict}
              onChange={(e) => handleFilterChange('biharDistrict', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Districts</option>
              {indianDistricts.states.find(s => s.key === 'BR')?.districts?.map(district => (
                <option key={district.key} value={district.name}>{district.name}</option>
              ))}
            </select>
          </div>
          
          {/* Conditional District Filter */}
          {selectedCity === 'delhi' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delhi District</label>
              <select
                value={filters.delhiDistrict}
                onChange={(e) => handleFilterChange('delhiDistrict', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Districts</option>
                {indianDistricts.states.find(s => s.key === 'DL')?.districts?.map(district => (
                  <option key={district.key} value={district.name}>{district.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {selectedCity === 'jaipur' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surveying District</label>
              <select
                value={filters.jaipurDistrict}
                onChange={(e) => handleFilterChange('jaipurDistrict', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Districts</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Jaipur Rural">Jaipur Rural</option>
                <option value="Udaipur">Udaipur</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Medchal-Malkajgiri">Medchal-Malkajgiri</option>
                <option value="Rangareddy">Rangareddy</option>
                <option value="Kamrup Metropolitan">Kamrup Metropolitan</option>
                <option value="Tinsukia">Tinsukia</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community (Caste)</label>
            <select
              value={filters.availableCommunity}
              onChange={(e) => handleFilterChange('availableCommunity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Communities</option>
              {availableCommunity?.map(community => (
                <option key={community.key} value={community.key}>{community.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Surveys</h3>
          <div className="text-3xl font-bold text-blue-600">{statistics.totalSurveys || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Volunteers</h3>
          <div className="text-3xl font-bold text-green-600">
            {Object.keys(statistics.volunteerStats || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Bihar Locations</h3>
          <div className="text-3xl font-bold text-purple-600">
            {Object.keys(statistics.biharDistrictAssembly || {}).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Problem Categories</h3>
          <div className="text-3xl font-bold text-orange-600">
            {Object.keys(statistics.biharProblems || {}).length + 
             Object.keys(statistics[selectedCity === 'jaipur' ? 'jaipurProblems' : 'delhiProblems'] || {}).length}
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
      </div>

      {loading && (
        <div className="flex justify-center items-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-lg text-gray-600">Loading survey data...</div>
        </div>
      )}
    </div>
  );
};

export default ReportGeneration;