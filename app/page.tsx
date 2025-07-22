"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./utils/firebase";
import { getWtmSlpSummary, getCurrentAdminUser } from "./utils/fetchFirebaseData";
import { WtmSlpSummary } from "../models/types";
import LogoutButton from "../components/LogoutButton";

// Interface for homepage card metrics
interface DashboardCardMetrics {
  wtmSlpMetrics: WtmSlpSummary | null;
  isLoading: boolean;
}

export default function HomePage() {
  const [user, authLoading, authError] = useAuthState(auth);
  const [metrics, setMetrics] = useState<DashboardCardMetrics>({
    wtmSlpMetrics: null,
    isLoading: true
  });
  
  // Fetch data based on user role when user auth state changes
  useEffect(() => {
    // Skip if not authenticated yet
    if (!user) return;
    
    async function fetchDashboardData() {
      try {
        console.log('[HomePage] Fetching dashboard data based on user role');
        setMetrics(prev => ({ ...prev, isLoading: true }));
        
        // Get user role and assigned assemblies
        const adminUser = await getCurrentAdminUser(user?.uid || "");
        console.log('[HomePage] Admin user data:', adminUser);
        
        let assembliesFilter: string[] | undefined;
        
        // Determine which assemblies to filter by based on user role
        if (adminUser?.role === 'admin') {
          // Admin sees all assemblies (no filter)
          assembliesFilter = undefined;
          console.log('[HomePage] Admin user - fetching summary for all assemblies');
        } else if (adminUser?.role === 'zonal-incharge' && adminUser.assemblies?.length > 0) {
          // Zonal Incharge sees only their assigned assemblies
          assembliesFilter = adminUser.assemblies;
          console.log(`[HomePage] Zonal Incharge - fetching summary for assemblies: ${assembliesFilter.join(', ')}`);
        } else {
          // Other roles or no assemblies assigned
          assembliesFilter = [];
          console.log('[HomePage] Other role or no assemblies - showing empty data');
        }
        
        // Fetch WTM-SLP summary for all time (no date parameters)
        const wtmSlpSummary = await getWtmSlpSummary(undefined, undefined, assembliesFilter);
        console.log('[HomePage] WTM-SLP summary data:', wtmSlpSummary);
        
        // Update metrics state with fetched data
        setMetrics({
          wtmSlpMetrics: wtmSlpSummary,
          isLoading: false
        });
        
      } catch (error) {
        console.error('[HomePage] Error fetching dashboard data:', error);
        setMetrics({
          wtmSlpMetrics: null,
          isLoading: false
        });
      }
    }
    
    fetchDashboardData();
  }, [user]);
  
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
  
  // Dept. Head cards with pastel colors and metrics (all 0 for now)
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
  ];

  return (
    <div className="max-w-5xl mx-auto p-8 grid gap-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-center flex-grow">WTM Dashboard</h1>
        <div className="flex-shrink-0">
          <LogoutButton />
        </div>
      </div>
      <div className="flex justify-center mb-6">
        <Link href="/map">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold text-lg">
            View Map
          </button>
        </Link>
      </div>
      {/* All cards in a single grid for alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ravi Pandit card with real data and dashboard link */}
        <Link
          href="/wtm-slp"
          className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-red-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group"
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
        </Link>
        {/* Other department cards - greyed out to indicate not yet available */}
        {DEPT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 ${card.color} p-6 flex flex-col gap-4 transition group opacity-50 cursor-not-allowed relative`}
          >
            {/* Coming Soon overlay */}
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
      </div>
    </div>
  );
}
