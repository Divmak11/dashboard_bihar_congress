"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../utils/firebase";
import { getWtmSlpSummary, getCurrentAdminUser } from "../utils/fetchFirebaseData";
import { fetchYoutubeSummary } from "../utils/fetchYoutubeData";
import { fetchManifestoSummary } from "../utils/fetchManifestoData";
import { fetchMigrantSummary } from "../utils/fetchMigrantData";
import { WtmSlpSummary } from "../../models/types";
import { YoutubeSummaryMetrics } from "../../models/youtubeTypes";
import { initializeCache, forceCacheRefresh, CACHE_KEYS } from "../utils/cacheUtils";
import LogoutButton from "../../components/LogoutButton";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { initializeApp, deleteApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Interface for homepage card metrics
interface DashboardCardMetrics {
  wtmSlpMetrics: WtmSlpSummary | null;
  youtubeMetrics: YoutubeSummaryMetrics | null;
  isLoading: boolean;
  manifestoTotalSurveys: number | null;
  migrantTotalSurveys: number | null;
}

export default function HomePage() {
  const [user, authLoading, authError] = useAuthState(auth);
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardCardMetrics>({
    wtmSlpMetrics: null,
    youtubeMetrics: null,
    isLoading: true,
    manifestoTotalSurveys: null,
    migrantTotalSurveys: null
  });
  const [role, setRole] = useState<string | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createAccountData, setCreateAccountData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'dept-head' as 'dept-head' | 'zonal-incharge',
    parentVertical: 'wtm' as 'wtm' | 'shakti-abhiyaan' | 'youtube'
  });
  const [selectedAssemblies, setSelectedAssemblies] = useState<string[]>([]);
  const [assemblies, setAssemblies] = useState<string[]>([]);
  const [assemblySearch, setAssemblySearch] = useState('');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState('');

  // Initialize cache on component mount
  useEffect(() => {
    try {
      initializeCache();
      setCacheInitialized(true);
      console.log('[HomePage] Cache initialized successfully');
    } catch (error) {
      console.error('[HomePage] Error initializing cache:', error);
      setCacheInitialized(true); // Continue anyway
    }
  }, []);

  // Fetch assemblies for Create Account modal
  useEffect(() => {
    async function fetchAssemblies() {
      try {
        const response = await fetch('/data/bihar_assemblies.json');
        const data = await response.json();
        setAssemblies(data);
      } catch (error) {
        console.error('Error fetching assemblies:', error);
      }
    }
    fetchAssemblies();
  }, []);

  // Fetch dashboard data and handle role-based routing
  const fetchDashboardData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      console.log('[HomePage] Fetching admin user data and checking role');
      
      // Get user role and handle redirection
      const adminUser = await getCurrentAdminUser(user.uid);
      console.log('[HomePage] Admin user data:', adminUser);
      setRole(adminUser?.role || null);
      
      // Auto-redirect non-admin users to their appropriate dashboards
      if (adminUser?.role !== 'admin') {
        console.log('[HomePage] Non-admin user detected, performing role-based redirect');
        
        let redirectUrl = '/wtm-slp-new'; // Default
        
        if (adminUser?.role === 'dept-head') {
          if (adminUser?.parentVertical === 'youtube') {
            redirectUrl = '/wtm-youtube';
            console.log('[HomePage] YouTube dept-head detected - redirecting to /wtm-youtube');
          } else if (adminUser?.parentVertical === 'wtm' || adminUser?.parentVertical === 'shakti-abhiyaan') {
            redirectUrl = '/wtm-slp-new';
            console.log(`[HomePage] ${adminUser.parentVertical.toUpperCase()} dept-head detected - redirecting to /wtm-slp-new`);
          }
        } else if (adminUser?.role === 'zonal-incharge') {
          redirectUrl = '/wtm-slp-new';
          console.log(`[HomePage] Zonal-incharge detected - redirecting to /wtm-slp-new`);
        }
        
        setNavigatingTo(redirectUrl);
        router.push(redirectUrl);
        return; // Exit early, no need to fetch dashboard metrics
      }
      
      // Only admin users reach this point - fetch dashboard data
      console.log('[HomePage] Admin user confirmed - fetching dashboard data');
      setMetrics(prev => ({ ...prev, isLoading: true }));
      
      // Fetch summaries in parallel with caching (auto-login if needed)
      const [wtmSlpSummary, youtubeSummary, manifestoSummary, migrantSummary] = await Promise.all([
        // Fetch WTM-SLP summary for all time (no date parameters) - uses caching for homepage
        getWtmSlpSummary(undefined, undefined, undefined),
        // Fetch YouTube summary for admin only - uses caching
        fetchYoutubeSummary(),
        // Manifesto summary (auto-login inside util)
        fetchManifestoSummary(),
        // Migrant summary (auto-login inside util)
        fetchMigrantSummary()
      ]);
      
      console.log('[HomePage] WTM-SLP summary data:', wtmSlpSummary);
      console.log('[HomePage] YouTube summary data:', youtubeSummary);
      
      // Update metrics state with fetched data
      setMetrics({
        wtmSlpMetrics: wtmSlpSummary,
        youtubeMetrics: youtubeSummary,
        isLoading: false,
        manifestoTotalSurveys: manifestoSummary?.totalSurveys ?? 0,
        migrantTotalSurveys: migrantSummary?.totalSurveys ?? 0
      });
      
    } catch (error) {
      console.error('[HomePage] Error in fetchDashboardData:', error);
      setMetrics({
        wtmSlpMetrics: null,
        youtubeMetrics: null,
        isLoading: false,
        manifestoTotalSurveys: null,
        migrantTotalSurveys: null
      });
    }
  }, [user?.uid, router]);
  
  // Fetch data based on user role when user auth state changes
  useEffect(() => {
    // Skip if not authenticated yet or cache not initialized
    if (!user || !cacheInitialized) return;
    
    // Call the unified fetchDashboardData function which handles both role checking and data fetching
    fetchDashboardData();
  }, [user, cacheInitialized, fetchDashboardData]);

  // Function to force refresh all cached data
  const handleForceRefresh = async () => {
    console.log('[HomePage] Force refresh requested');
    setMetrics(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Clear caches
      forceCacheRefresh([
        CACHE_KEYS.WTM_SLP_SUMMARY,
        CACHE_KEYS.YOUTUBE_SUMMARY,
        CACHE_KEYS.MANIFESTO_SUMMARY,
        CACHE_KEYS.MIGRANT_SUMMARY
      ]);
      
      // Fetch fresh data
      const [wtmSlpSummary, youtubeSummary, manifestoSummary, migrantSummary] = await Promise.all([
        getWtmSlpSummary(undefined, undefined, undefined, undefined, undefined, true), // forceRefresh = true
        fetchYoutubeSummary(true), // forceRefresh = true
        fetchManifestoSummary(true),
        fetchMigrantSummary(true)
      ]);
      
      setMetrics({
        wtmSlpMetrics: wtmSlpSummary,
        youtubeMetrics: youtubeSummary,
        isLoading: false,
        manifestoTotalSurveys: manifestoSummary?.totalSurveys ?? 0,
        migrantTotalSurveys: migrantSummary?.totalSurveys ?? 0
      });
      
      console.log('[HomePage] Force refresh completed');
    } catch (error) {
      console.error('[HomePage] Error during force refresh:', error);
      setMetrics(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Auth error state
  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {authError.message}
        </div>
      </div>
    );
  }
  
  // Dept. Head cards with pastel colors and metrics
  const DEPT_CARDS = [
    {
      key: "wtm-shakti-prof",
      title: "WTM-SLP (SHAKTI PROF.)",
      lead: "Ms. Trishala Shandilya",
      color: "bg-pink-100",
      metrics: [
        { label: "Total Assemblies Covered", value: 0 },
        { label: "Total Meetings", value: 0 },
        { label: "Total Volunteers (Potential)", value: 0 },
        { label: "Total Registrations (MBY)", value: 0 },
      ],
    },
    // Other department cards remain unchanged
    {
      key: "wtm-shakti-club",
      title: "WTM-SHAKTI CLUB",
      lead: "Ms. Reecha and Ms. Sadaf",
      color: "bg-blue-100",
      metrics: [
        { label: "Total Meetings", value: 0 },
        { label: "Total Volunteers", value: 0 },
      ],
    },
    {
      key: "wtm-whatsapp",
      title: "WTM-Whatsapp",
      lead: "Mr. Mithilesh",
      color: "bg-green-100",
      metrics: [
        { label: "Total Groups Created", value: 0 },
        { label: "Total Members", value: 0 },
      ],
    },
    {
      key: "wtm-shakti-club-2",
      title: "WTM-SHAKTI CLUB - 2",
      lead: "Mr. Karan Chaurasia",
      color: "bg-yellow-100",
      metrics: [
        { label: "Total Channels Onboarded", value: 0 },
        { label: "Total Ready to Onboard Channels", value: 0 },
        { label: "Total Channels Contacted", value: 0 },
      ],
    },
    {
      key: "wtm-hostel-segment",
      title: "WTM-Hostel Segment",
      lead: "Mr. Jay Maurya",
      color: "bg-purple-100",
      metrics: [
        { label: "Total Assemblies Covered", value: 0 },
        { label: "No. of Hostels Visited", value: 0 },
        { label: "Total Volunteers", value: 0 },
      ],
    },
    {
      key: "ghar-ghar-yatra-analytics",
      title: "Ghar-Ghar Yatra Data",
      lead: "Data Analytics Team",
      color: "bg-indigo-100",
      metrics: [
        { label: "Total Calls Tracked", value: 0 },
        { label: "Active SLPs", value: 0 },
        { label: "Data Match Rate", value: 0 },
        { label: "Days with Data", value: 0 },
      ],
    },
  ];

  // Check if user has access to YouTube vertical
  const hasYoutubeAccess = role === 'admin' || role === 'dept-head';

  return (
    <div className="max-w-5xl mx-auto p-8 grid gap-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">WTM Dashboard</h1>
        <div className="flex items-center gap-4">
          {role === 'admin' && (
            <button
              onClick={() => setShowCreateAccountModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-all duration-200 font-semibold text-sm flex items-center gap-2 border border-green-500 hover:shadow-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Account
            </button>
          )}
          <button
            onClick={handleForceRefresh}
            disabled={metrics.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-all duration-200 font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh cached data"
          >
            <svg 
              className={`w-4 h-4 ${metrics.isLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {metrics.isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <LogoutButton />
        </div>
      </div>
      {role === 'admin' && (
        <div className="flex justify-center mb-6">
          <Link href="/map">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold text-lg">
              View Map
            </button>
          </Link>
        </div>
      )}
      {/* All cards in a single grid for alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ravi Pandit card with real data and dashboard link */}
        <div
          onClick={() => {
            setNavigatingTo('/wtm-slp-new');
            router.push('/wtm-slp-new');
          }}
          className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-red-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group cursor-pointer relative"
        >
          <div className="flex flex-col items-center mb-2 gap-1">
            <h2 className="text-xl font-bold text-center group-hover:text-red-700 transition">WTM-SLP</h2>
            <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
              Lead: Mr. Ravi Pandit
            </span>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {metrics.isLoading ? (
              // Loading state
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : (
              // Data display
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Total Meetings:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">
                    {metrics.wtmSlpMetrics?.totalMeetings || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">SLPs:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">
                    {metrics.wtmSlpMetrics?.totalSlps || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Onboarded:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">
                    {metrics.wtmSlpMetrics?.totalOnboarded || 0}
                  </span>
                </div>
              </>
            )}
          </div>
          {/* Loading overlay for navigation */}
          {navigatingTo === '/wtm-slp-new' && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-500 border-t-transparent"></div>
                <span className="text-gray-700 font-medium">Loading WTM-SLP...</span>
              </div>
            </div>
          )}
        </div>

        {/* WTM-Youtube card - only visible to admin and dept-head */}
        {hasYoutubeAccess ? (
          <div
            onClick={() => {
              setNavigatingTo('/wtm-youtube');
              router.push('/wtm-youtube');
            }}
            className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-indigo-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group cursor-pointer relative"
          >
            <div className="flex flex-col items-center mb-2 gap-1">
              <h2 className="text-xl font-bold text-center group-hover:text-indigo-700 transition">WTM-Youtube</h2>
              <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
                Lead: Mr. Karan Chourasia
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {metrics.isLoading ? (
                // Loading state
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                // Data display - show 2-3 key metrics
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Total Campaigns:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-bold">
                      {metrics.youtubeMetrics?.totalThemes || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Total Influencers:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-bold">
                      {metrics.youtubeMetrics?.totalInfluencers || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Total Videos:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-bold">
                      {metrics.youtubeMetrics?.totalVideos || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
            {/* Loading overlay for navigation */}
            {navigatingTo === '/wtm-youtube' && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                  <span className="text-gray-700 font-medium">Loading WTM-Youtube...</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Manifesto Complaints card - Admin only */}
        {role === 'admin' ? (
          <div
            onClick={() => {
              setNavigatingTo('/manifesto-complaints');
              router.push('/manifesto-complaints');
            }}
            className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-rose-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group cursor-pointer relative"
          >
            <div className="flex flex-col items-center mb-2 gap-1">
              <h2 className="text-xl font-bold text-center group-hover:text-rose-700 transition">Manifesto Complaints</h2>
              <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
                Excel Import (AC/Panchayat)
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-sm text-gray-700 text-center">Tap to view AC and Panchayat level complaints.</div>
            </div>
            {/* Loading overlay for navigation */}
            {navigatingTo === '/manifesto-complaints' && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-rose-500 border-t-transparent"></div>
                  <span className="text-gray-700 font-medium">Loading Manifesto Complaints...</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Manifesto card - Admin only */}
        {role === 'admin' ? (
          <div
            onClick={() => {
              setNavigatingTo('/manifesto');
              router.push('/manifesto');
            }}
            className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-amber-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group cursor-pointer relative"
          >
            <div className="flex flex-col items-center mb-2 gap-1">
              <h2 className="text-xl font-bold text-center group-hover:text-amber-700 transition">Manifesto</h2>
              <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
                External API
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {metrics.isLoading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
                </div>
              ) : (
                <>
                  {metrics.manifestoTotalSurveys === null ? (
                    <div className="text-sm text-gray-700 text-center">Login required</div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center">
                      <span className="font-semibold text-gray-700">Total Surveys:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-bold">
                        {metrics.manifestoTotalSurveys}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Loading overlay for navigation */}
            {navigatingTo === '/manifesto' && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                  <span className="text-gray-700 font-medium">Loading Manifesto...</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Migrant card - Admin only */}
        {role === 'admin' ? (
          <div
            onClick={() => {
              setNavigatingTo('/migrant');
              router.push('/migrant');
            }}
            className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-emerald-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group cursor-pointer relative"
          >
            <div className="flex flex-col items-center mb-2 gap-1">
              <h2 className="text-xl font-bold text-center group-hover:text-emerald-700 transition">Migrant</h2>
              <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
                External API
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {metrics.isLoading ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <span className="font-semibold text-gray-700">Total Surveys:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">
                    {metrics.migrantTotalSurveys ?? 0}
                  </span>
                </div>
              )}
            </div>
            {/* Loading overlay for navigation */}
            {navigatingTo === '/migrant' && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent"></div>
                  <span className="text-gray-700 font-medium">Loading Migrant...</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Call Center parent card - navigational only */}
        <div
          onClick={() => {
            setNavigatingTo('/verticals/call-center');
            router.push('/verticals/call-center');
          }}
          className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-cyan-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group cursor-pointer relative"
        >
          <div className="flex flex-col items-center mb-2 gap-1">
            <h2 className="text-xl font-bold text-center group-hover:text-cyan-700 transition">Call Center</h2>
            <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
              Parent Vertical
            </span>
          </div>
          <div className="text-sm text-gray-700">
            Tap to open. Inside you’ll find the “Call Center Old” dataset card with report metrics.
          </div>

          {/* Loading overlay for navigation */}
          {navigatingTo === '/verticals/call-center' && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent"></div>
                <span className="text-gray-700 font-medium">Loading Call Center...</span>
              </div>
            </div>
          )}
        </div>

        {/* Ghar-Ghar Yatra Analytics card - Admin only */}
        {role === 'admin' ? (
          <div
            onClick={() => {
              setNavigatingTo('/verticals/ghar-ghar-yatra-analytics');
              router.push('/verticals/ghar-ghar-yatra-analytics');
            }}
            className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-indigo-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group cursor-pointer relative"
          >
            <div className="flex flex-col items-center mb-2 gap-1">
              <h2 className="text-xl font-bold text-center group-hover:text-indigo-700 transition">Ghar-Ghar Yatra Data</h2>
              <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
                Lead: Data Analytics Team
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Total Calls Tracked:</span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">-</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Active SLPs:</span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">-</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Match Rate:</span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">-</span>
              </div>
            </div>
            {/* Loading overlay for navigation */}
            {navigatingTo === '/verticals/ghar-ghar-yatra-analytics' && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                  <span className="text-gray-700 font-medium">Loading Analytics...</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* COMMENTED OUT: Coming Soon cards as requested by user 
        {DEPT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 ${card.color} p-6 flex flex-col gap-4 transition group opacity-50 cursor-not-allowed relative`}
          >
            <div className="absolute inset-0 bg-gray-900/20 rounded-xl flex items-center justify-center">
              <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Coming Soon
              </span>
            </div>
            <div className="flex flex-col items-center mb-2 gap-1">
              <h2 className="text-xl font-bold text-center text-gray-500">{card.title}</h2>
              <span className="px-3 py-1 rounded-full bg-white/70 text-gray-500 text-xs font-semibold border border-gray-300 mt-1">
                Lead: {card.lead}
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {card.metrics.map((metric) => (
                <div key={metric.label} className="flex items-center gap-2">
                  <span className="font-semibold text-gray-500">{metric.label}:</span>
                  <span className="text-gray-500 font-bold">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        */}
      </div>

      {/* Create Account Modal */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Create New Account</h2>
                <button
                  onClick={() => {
                    setShowCreateAccountModal(false);
                    setCreateAccountData({ email: '', password: '', confirmPassword: '', name: '', role: 'dept-head', parentVertical: 'wtm' });
                    setSelectedAssemblies([]);
                    setAssemblySearch('');
                    setCreateAccountError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {createAccountError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {createAccountError}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setCreateAccountError('');

                // Validation
                if (!createAccountData.email || !createAccountData.password || !createAccountData.confirmPassword || !createAccountData.name.trim()) {
                  setCreateAccountError('Please fill in all fields');
                  return;
                }
                if (createAccountData.password !== createAccountData.confirmPassword) {
                  setCreateAccountError('Passwords do not match');
                  return;
                }
                // Only require assemblies for non-YouTube verticals
                if (createAccountData.parentVertical !== 'youtube' && selectedAssemblies.length === 0) {
                  setCreateAccountError('Please select at least one assembly');
                  return;
                }

                setCreateAccountLoading(true);
                try {
                  // Create a secondary Firebase app instance using the same config as the primary app
                  const { db: primaryDb } = await import('../utils/firebase');
                  const primaryApp = getApp();
                  const secondaryApp = initializeApp(primaryApp.options, `secondary-${Date.now()}`);
                  const secondaryAuth = getAuth(secondaryApp);
                  
                  // Create user with secondary auth instance (won't affect main auth state)
                  const userCredential = await createUserWithEmailAndPassword(
                    secondaryAuth, 
                    createAccountData.email, 
                    createAccountData.password
                  );
                  const newUser = userCredential.user;

                  // Add user to admin-users collection using primary database
                  await setDoc(doc(primaryDb, 'admin-users', newUser.uid), {
                    id: newUser.uid,
                    email: newUser.email,
                    name: createAccountData.name.trim(),
                    assemblies: createAccountData.parentVertical === 'youtube' ? [] : selectedAssemblies,
                    role: createAccountData.role,
                    parentVertical: createAccountData.parentVertical,
                    createdAt: serverTimestamp()
                  });

                  // Clean up secondary app to avoid memory leaks
                  await deleteApp(secondaryApp);

                  // Reset form and close modal
                  setCreateAccountData({ email: '', password: '', confirmPassword: '', name: '', role: 'dept-head', parentVertical: 'wtm' });
                  setSelectedAssemblies([]);
                  setAssemblySearch('');
                  setShowCreateAccountModal(false);
                  alert('Account created successfully!');
                } catch (error: any) {
                  setCreateAccountError(error.message || 'Failed to create account. Please try again.');
                } finally {
                  setCreateAccountLoading(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createAccountData.email}
                    onChange={(e) => setCreateAccountData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={createAccountData.name}
                    onChange={(e) => setCreateAccountData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={createAccountData.role}
                    onChange={(e) => setCreateAccountData(prev => ({ ...prev, role: e.target.value as 'dept-head' | 'zonal-incharge' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="dept-head">Department Head</option>
                    <option value="zonal-incharge">Zonal Incharge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vertical</label>
                  <select
                    value={createAccountData.parentVertical}
                    onChange={(e) => {
                      const vertical = e.target.value as 'wtm' | 'shakti-abhiyaan' | 'youtube';
                      setCreateAccountData(prev => ({ ...prev, parentVertical: vertical }));
                      // Clear selected assemblies when switching to YouTube
                      if (vertical === 'youtube') {
                        setSelectedAssemblies([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="shakti-abhiyaan">Shakti Abhiyaan</option>
                    <option value="wtm">WT-Samvidhan Leader</option>
                    <option value="youtube">Youtube</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={createAccountData.password}
                    onChange={(e) => setCreateAccountData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={createAccountData.confirmPassword}
                    onChange={(e) => setCreateAccountData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Only show assembly selection for non-YouTube verticals */}
                {createAccountData.parentVertical !== 'youtube' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Assemblies</label>
                  <input
                    type="text"
                    placeholder="Search assemblies..."
                    value={assemblySearch}
                    onChange={(e) => setAssemblySearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent mb-2"
                  />
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {assemblies.length === 0 ? (
                      <p className="text-gray-500 text-sm">Loading assemblies...</p>
                    ) : (
                      (() => {
                        const filteredAssemblies = assemblies.filter(assembly =>
                          assembly.toLowerCase().includes(assemblySearch.toLowerCase())
                        );
                        return filteredAssemblies.length === 0 ? (
                          <p className="text-gray-500 text-sm">No assemblies found matching &quot;{assemblySearch}&quot;</p>
                        ) : (
                          filteredAssemblies.map((assembly) => (
                            <label key={assembly} className="flex items-center space-x-2 py-1 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedAssemblies.includes(assembly)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAssemblies(prev => [...prev, assembly]);
                                  } else {
                                    setSelectedAssemblies(prev => prev.filter(a => a !== assembly));
                                  }
                                }}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">{assembly}</span>
                            </label>
                          ))
                        );
                      })()
                    )}
                  </div>
                  {selectedAssemblies.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedAssemblies.length} assembly(ies) selected
                    </p>
                  )}
                </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAccountModal(false);
                      setCreateAccountData({ email: '', password: '', confirmPassword: '', name: '', role: 'dept-head', parentVertical: 'wtm' });
                      setSelectedAssemblies([]);
                      setAssemblySearch('');
                      setCreateAccountError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAccountLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createAccountLoading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
