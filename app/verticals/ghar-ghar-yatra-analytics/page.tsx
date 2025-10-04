'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../utils/firebase';
import { getCurrentAdminUser } from '../../utils/fetchFirebaseData';
import DateRangeFilter from '../../../components/DateRangeFilter';
import MetricsCards from '../../../components/ghar-ghar-yatra/MetricsCards';
import AnalyticsCharts from '../../../components/ghar-ghar-yatra/AnalyticsCharts';
import IndividualSLPView from '../../../components/ghar-ghar-yatra/IndividualSLPView';
import { 
  fetchOverviewSourceData,
  generateAggregatedMetricsFromSource,
  generateChartDataFromSource
} from '../../utils/fetchGharGharYatraData';
import { generateGharGharYatraPDF } from '../../utils/generateGharGharYatraPDF';
import { OverviewData, DateRange } from '../../../models/gharGharYatraTypes';

export default function GharGharYatraAnalyticsPage() {
  const [user, authLoading, authError] = useAuthState(auth);
  const router = useRouter();
  const [role, setRole] = useState<string>('');

  // State management
  const [selectedTab, setSelectedTab] = useState<'overview' | 'individual-slp'>('overview');
  const [dateOption, setDateOption] = useState<string>('lastWeek');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<boolean>(false);
  
  // Initialize startDate and endDate with lastWeek default
  const getInitialDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    start.setDate(start.getDate() - 7); // 7 days ago
    const end = new Date(today);
    end.setDate(end.getDate() - 1); // Yesterday (excludes today)
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return { start: formatDate(start), end: formatDate(end) };
  };
  
  const initialDates = getInitialDateRange();
  const [startDate, setStartDate] = useState<string>(initialDates.start);
  const [endDate, setEndDate] = useState<string>(initialDates.end);
  
  const [overviewData, setOverviewData] = useState<OverviewData>({
    metrics: {
      totalPunches: 0,
      totalUniquePunches: 0,
      totalDoubleEntries: 0,
      totalTripleEntries: 0,
      highPerformersCount: 0,
      lowPerformersCount: 0,
      avgPunchesPerSlpPerDay: 0,
      totalMatched: 0,
      totalUnidentifiable: 0,
      totalIncorrect: 0,
      totalNoMatch: 0,
      matchRatePercentage: 0,
      totalDatesWithData: 0,
      totalUniqueSLPs: 0,
      avgSLPsPerDay: 0
    },
    charts: {
      dailyTrend: [],
      topSLPs: [],
      dataQuality: [],
      callingPatterns: []
    },
    loading: false,
    error: null
  });

  // Auth check - only admin users can access
  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && user) {
        const adminUser = await getCurrentAdminUser(user.uid);
        if (adminUser && adminUser.role === 'admin') {
          setRole('admin');
        } else {
          console.log('[GharGharYatraAnalytics] Unauthorized access - redirecting to home');
          router.push('/home');
        }
      } else if (!authLoading && !user) {
        router.push('/auth');
      }
    };
    checkAuth();
  }, [user, authLoading, router]);

  const fetchOverviewData = useCallback(async () => {
    console.log('[GharGharYatraAnalytics] Fetching overview data');
    setOverviewData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get date range - moved inside to avoid circular dependency
      const getDateRange = (): { startDate: string; endDate: string } => {
        if (customDateRange) {
          return customDateRange;
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let start: Date;
        let end: Date;

        switch (dateOption) {
          case 'all':
            // All time: from 5 years ago to today (INCLUDES TODAY)
            start = new Date(today);
            start.setFullYear(start.getFullYear() - 5);
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setHours(23, 59, 59, 999);
            break;
          case 'lastDay':
            // Yesterday only (EXCLUDES TODAY)
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
          case 'lastWeek':
            // Last 7 days ending yesterday (EXCLUDES TODAY)
            start = new Date(today);
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
          case 'last3Months':
            // Last 3 months including today (INCLUDES TODAY)
            start = new Date(today);
            start.setMonth(start.getMonth() - 3);
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setHours(23, 59, 59, 999);
            break;
          case 'lastYear':
            // Last year including today (INCLUDES TODAY)
            start = new Date(today);
            start.setFullYear(start.getFullYear() - 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setHours(23, 59, 59, 999);
            break;
          default:
            // Default to last week excluding today
            start = new Date(today);
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            end = new Date(today);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
        }

        const formatDate = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        return {
          startDate: formatDate(start),
          endDate: formatDate(end)
        };
      };
      
      const { startDate, endDate } = getDateRange();
      
      if (!startDate || !endDate) {
        throw new Error('Invalid date range');
      }

      // Single-source fetch then compute metrics and charts without extra reads
      console.time('[Overview] Source fetch');
      const source = await fetchOverviewSourceData(startDate, endDate);
      console.timeEnd('[Overview] Source fetch');

      console.time('[Overview] Compute metrics+charts');
      const [metrics, charts] = await Promise.all([
        generateAggregatedMetricsFromSource(source),
        generateChartDataFromSource(source)
      ]);
      console.timeEnd('[Overview] Compute metrics+charts');

      setOverviewData({
        metrics,
        charts,
        loading: false,
        error: null
      });

      console.log('[GharGharYatraAnalytics] Overview data fetched successfully');
    } catch (error) {
      console.error('[GharGharYatraAnalytics] Error fetching overview data:', error);
      setOverviewData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch overview data'
      }));
    }
  }, [dateOption, customDateRange]);

  // Fetch overview data when date range changes
  useEffect(() => {
    if (selectedTab === 'overview' && role === 'admin') {
      fetchOverviewData();
    }
  }, [selectedTab, dateOption, customDateRange, role, fetchOverviewData]);

  const handleDateRangeChange = (start: string, end: string, option: string) => {
    setStartDate(start);
    setEndDate(end);
    setDateOption(option);
    
    if (option === 'custom' && start && end) {
      setCustomDateRange({
        startDate: start,
        endDate: end
      });
    } else {
      setCustomDateRange(null);
    }
  };

  const handleGeneratePDF = async () => {
    if (overviewData.loading || overviewData.error) {
      return;
    }

    console.log('[GharGharYatraAnalytics] Generating PDF report');
    setGeneratingPDF(true);

    try {
      // Use custom date range if available, otherwise use current state
      const startDatePDF = customDateRange ? customDateRange.startDate : startDate;
      const endDatePDF = customDateRange ? customDateRange.endDate : endDate;
      
      await generateGharGharYatraPDF(
        { startDate: startDatePDF, endDate: endDatePDF },
        overviewData.metrics,
        overviewData.charts
      );
      
      console.log('[GharGharYatraAnalytics] PDF generated successfully');
    } catch (error) {
      console.error('[GharGharYatraAnalytics] Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Unauthorized state
  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ghar-Ghar Yatra Analytics</h1>
              <p className="text-gray-600 mt-1">Track calling data, SLP performance, and data quality metrics</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedTab === 'overview' && (
                <button
                  onClick={handleGeneratePDF}
                  disabled={overviewData.loading || overviewData.error !== null || generatingPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {generatingPDF ? 'Generating...' : 'Generate PDF'}
                </button>
              )}
              <button
                onClick={() => router.push('/home')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                selectedTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview Analytics
            </button>
            <button
              onClick={() => setSelectedTab('individual-slp')}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                selectedTab === 'individual-slp'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Individual SLP View
            </button>
          </div>
        </div>

        {/* Date Range Filter - Only for Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="mb-6">
            <DateRangeFilter
              label="Date Range"
              startDate={startDate}
              endDate={endDate}
              selectedOption={dateOption}
              onDateChange={handleDateRangeChange}
            />
          </div>
        )}

        {/* Error Display */}
        {overviewData.error && selectedTab === 'overview' && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {overviewData.error}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="space-y-6">
          {selectedTab === 'overview' ? (
            <>
              {/* Metrics Cards */}
              <MetricsCards 
                metrics={overviewData.metrics} 
                loading={overviewData.loading}
              />

              {/* Charts */}
              <AnalyticsCharts 
                charts={overviewData.charts} 
                loading={overviewData.loading}
              />
            </>
          ) : (
            <>
              {/* Individual SLP View */}
              <IndividualSLPView />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
