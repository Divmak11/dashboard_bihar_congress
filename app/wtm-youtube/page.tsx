"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebase";
import { getCurrentAdminUser } from "../utils/fetchFirebaseData";
import { 
  fetchInfluencers, 
  fetchThemes, 
  fetchYoutubeSummary,
  clearYoutubeCache,
  computeOverviewAggregates
} from "../utils/fetchYoutubeData";
import { 
  clearAllVideoStatsCache,
} from "../utils/videoApi";
import { fetchVideoStatsFromLinks } from '../utils/videoApi';
import {
  YoutubeInfluencerDoc,
  YoutubeCampaignDoc,
  OverviewAggregates,
  YoutubeDateMode
} from "../../models/youtubeTypes";
import Overview from "../../components/youtube/Overview";
import ThemesList from "../../components/youtube/ThemesList";
import InfluencersList from "../../components/youtube/InfluencersList";
import LogoutButton from "../../components/LogoutButton";

type TabType = 'overview' | 'themes' | 'influencers';

export default function WtmYoutubePage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data states
  const [influencers, setInfluencers] = useState<YoutubeInfluencerDoc[]>([]);
  const [themes, setThemes] = useState<YoutubeCampaignDoc[]>([]);
  const [overviewData, setOverviewData] = useState<OverviewAggregates | null>(null);
  const [videoStats, setVideoStats] = useState<Map<string, { views: number; likes: number }>>(new Map());
  
  // Filter states
  const [dateMode, setDateMode] = useState<YoutubeDateMode>('entries');
  const [startDate, setStartDate] = useState<number | undefined>();
  const [endDate, setEndDate] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Check authorization
  const checkAuthorization = useCallback(async () => {
    try {
      setIsCheckingAuth(true);
      const adminUser = await getCurrentAdminUser(user?.uid || "");
      
      // Only admin and dept-head have access
      if (adminUser?.role === 'admin' || adminUser?.role === 'dept-head') {
        setIsAuthorized(true);
      } else {
        console.log('[WtmYoutube] Unauthorized access attempt by role:', adminUser?.role);
        router.push('/home');
      }
    } catch (error) {
      console.error('[WtmYoutube] Error checking authorization:', error);
      router.push('/home');
    } finally {
      setIsCheckingAuth(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      checkAuthorization();
    } else if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router, checkAuthorization]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch influencers and themes in parallel
      const [influencersData, themesData] = await Promise.all([
        fetchInfluencers({ search: searchQuery }),
        fetchThemes({ 
          dateMode, 
          startDate, 
          endDate,
          search: searchQuery 
        })
      ]);
      
      setInfluencers(influencersData);
      setThemes(themesData);
      
      // Extract all video links for fetching stats
      const videoLinks: string[] = [];
      themesData.forEach(theme => {
        if (theme.influencerEntries) {
          theme.influencerEntries.forEach(entry => {
            if (entry.videoLink) {
              videoLinks.push(entry.videoLink);
            }
          });
        }
      });
      
      // Fetch video stats from both YouTube and Facebook APIs if credentials are available
      let finalVideoStats = new Map<string, { views: number; likes: number }>();
      const youtubeApiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      const facebookAccessToken = process.env.NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN;
      
      if ((youtubeApiKey || facebookAccessToken) && videoLinks.length > 0) {
        try {
          const stats = await fetchVideoStatsFromLinks(videoLinks, {
            youtubeApiKey,
            facebookAccessToken
          });
          // Convert VideoMetrics to required format
          const convertedStats = new Map<string, { views: number; likes: number }>();
          stats.forEach((metrics, videoId) => {
            convertedStats.set(videoId, {
              views: metrics.views || 0,
              likes: metrics.likes || 0
            });
          });
          finalVideoStats = convertedStats;
          setVideoStats(convertedStats);
        } catch (error) {
          console.error('[WtmYoutube] Error fetching video stats:', error);
          // Continue with empty stats
        }
      }
      
      // Compute overview aggregates with the freshly fetched video stats
      const aggregates = computeOverviewAggregates({
        influencers: influencersData,
        themes: themesData,
        videoStats: finalVideoStats
      });
      setOverviewData(aggregates);
      
    } catch (error) {
      console.error('[WtmYoutube] Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateMode, startDate, endDate, searchQuery]);

  // Fetch data when filters change or on mount
  useEffect(() => {
    if (isAuthorized) {
      fetchAllData();
    }
  }, [isAuthorized, fetchAllData]);

  // Handle refresh
  const handleRefresh = () => {
    clearYoutubeCache();
    clearAllVideoStatsCache();
    fetchAllData();
  };

  // Loading states
  if (authLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/home')}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">WTM-Youtube Analytics</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Date Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Date Mode:</label>
              <select
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value as YoutubeDateMode)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="entries">Entries by Day</option>
                <option value="campaign">Campaign Window</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value).getTime() : undefined)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value).getTime() : undefined)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search themes or influencers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 border border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Channel Videos Report</h3>
                <p className="text-sm text-gray-600">Fetch and analyze videos from influencer YouTube channels</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/wtm-youtube/channel-videos')}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>Open Report</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium transition ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className={`py-3 px-1 border-b-2 font-medium transition ${
                activeTab === 'themes'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Themes
            </button>
            <button
              onClick={() => setActiveTab('influencers')}
              className={`py-3 px-1 border-b-2 font-medium transition ${
                activeTab === 'influencers'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Influencers
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <Overview 
                data={overviewData}
                isLoading={isLoading}
              />
            )}
            {activeTab === 'themes' && (
              <ThemesList 
                themes={themes}
                videoStats={videoStats}
                isLoading={isLoading}
              />
            )}
            {activeTab === 'influencers' && (
              <InfluencersList 
                influencers={influencers}
                themes={themes}
                videoStats={videoStats}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
