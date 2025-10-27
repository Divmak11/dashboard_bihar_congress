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
  computeOverviewAggregates,
  updateInfluencerSubscribers
} from "../utils/fetchYoutubeData";
import { 
  clearAllVideoStatsCache,
} from "../utils/videoApi";
import { fetchVideoStatsFromLinks } from '../utils/videoApi';
import { fetchChannelSubscribers, isValidYoutubeChannelLink } from '../utils/youtubeApi';
import { extractChannelId } from '../utils/youtubeChannelApi';
import {
  YoutubeInfluencerDoc,
  YoutubeCampaignDoc,
  OverviewAggregates,
  YoutubeDateMode,
  SubscriberUpdateProgress,
  SubscriberUpdateResult
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
  
  // Subscriber update states
  const [isUpdatingSubscribers, setIsUpdatingSubscribers] = useState(false);
  const [subscriberProgress, setSubscriberProgress] = useState<SubscriberUpdateProgress | null>(null);
  const [subscriberResult, setSubscriberResult] = useState<SubscriberUpdateResult | null>(null);
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);

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

  // Handle subscriber update
  const handleUpdateSubscribers = async () => {
    if (isUpdatingSubscribers) return;
    
    // Show confirmation dialog
    if (!window.confirm('Fetch latest subscriber counts for all YouTube channels? This will consume API quota.')) {
      return;
    }
    
    try {
      setIsUpdatingSubscribers(true);
      setShowSubscriberModal(true);
      setSubscriberProgress({ current: 0, total: influencers.length, phase: 'fetching' });
      setSubscriberResult(null);
      
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      if (!apiKey) {
        alert('YouTube API key not configured');
        setIsUpdatingSubscribers(false);
        setShowSubscriberModal(false);
        return;
      }
      
      // Filter for YouTube channels only
      const youtubeInfluencers = influencers.filter(inf => 
        inf.channelLink && isValidYoutubeChannelLink(inf.channelLink)
      );
      
      console.log(`[handleUpdateSubscribers] Found ${youtubeInfluencers.length} YouTube channels out of ${influencers.length} total`);
      
      if (youtubeInfluencers.length === 0) {
        alert('No valid YouTube channels found');
        setIsUpdatingSubscribers(false);
        setShowSubscriberModal(false);
        return;
      }
      
      setSubscriberProgress({ 
        current: 0, 
        total: youtubeInfluencers.length, 
        phase: 'fetching',
        currentInfluencer: 'Fetching subscriber counts from YouTube...'
      });
      
      // Fetch subscriber counts from YouTube API
      const channelLinks = youtubeInfluencers.map(inf => inf.channelLink);
      const subscriberCounts = await fetchChannelSubscribers(channelLinks, apiKey);
      
      console.log(`[handleUpdateSubscribers] Fetched ${subscriberCounts.size} subscriber counts`);
      
      // Prepare updates for Firebase
      const updates: Array<{ id: string; subscribers: number; name: string; channelLink: string; oldSubscribers: number }> = [];
      const errors: any[] = [];
      let skipped = 0;
      
      for (const influencer of youtubeInfluencers) {
        const newCount = subscriberCounts.get(influencer.channelLink);
        
        if (newCount !== undefined) {
          updates.push({
            id: influencer.id,
            subscribers: newCount,
            name: influencer.name,
            channelLink: influencer.channelLink,
            oldSubscribers: influencer.subscribers || 0
          });
        } else {
          // Channel not found or API error
          skipped++;
          errors.push({
            influencerId: influencer.id,
            influencerName: influencer.name,
            channelLink: influencer.channelLink,
            error: 'Channel not found or API error',
            type: 'channel_not_found' as const
          });
        }
      }
      
      console.log(`[handleUpdateSubscribers] Prepared ${updates.length} updates, ${skipped} skipped`);
      
      // Update Firebase
      setSubscriberProgress({ 
        current: 0, 
        total: updates.length, 
        phase: 'updating',
        currentInfluencer: 'Updating Firebase documents...'
      });
      
      const result = await updateInfluencerSubscribers(updates);
      
      // Add skipped count and errors
      result.skipped = skipped;
      result.errors.push(...errors);
      
      setSubscriberProgress({ 
        current: updates.length, 
        total: updates.length, 
        phase: 'completed',
        currentInfluencer: 'Update completed!'
      });
      
      setSubscriberResult(result);
      
      // Refresh influencer list to show new counts
      if (result.success > 0) {
        await fetchAllData();
      }
      
      console.log('[handleUpdateSubscribers] Complete:', result);
      
    } catch (error) {
      console.error('[handleUpdateSubscribers] Error:', error);
      alert(`Error updating subscribers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingSubscribers(false);
    }
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
                onClick={handleUpdateSubscribers}
                disabled={isUpdatingSubscribers || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Fetch latest subscriber counts from YouTube"
              >
                <svg className={`w-4 h-4 ${isUpdatingSubscribers ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isUpdatingSubscribers ? 'Updating...' : 'Update Subscribers'}
              </button>
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

      {/* Subscriber Update Modal */}
      {showSubscriberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Update Subscriber Counts</h2>
                  <p className="text-sm text-gray-600 mt-1">Fetching latest data from YouTube API</p>
                </div>
                {subscriberResult && (
                  <button
                    onClick={() => {
                      setShowSubscriberModal(false);
                      setSubscriberProgress(null);
                      setSubscriberResult(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Progress */}
              {subscriberProgress && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {subscriberProgress.phase === 'fetching' && 'Fetching from YouTube API...'}
                      {subscriberProgress.phase === 'updating' && 'Updating Firebase...'}
                      {subscriberProgress.phase === 'completed' && 'Update Complete!'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {subscriberProgress.current} / {subscriberProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(subscriberProgress.current / subscriberProgress.total) * 100}%` }}
                    />
                  </div>
                  {subscriberProgress.currentInfluencer && (
                    <p className="text-xs text-gray-500 mt-2">{subscriberProgress.currentInfluencer}</p>
                  )}
                </div>
              )}

              {/* Results */}
              {subscriberResult && (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-900">{subscriberResult.success}</p>
                      <p className="text-sm text-gray-600">Updated</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-900">{subscriberResult.skipped}</p>
                      <p className="text-sm text-gray-600">Skipped</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-900">{subscriberResult.failed}</p>
                      <p className="text-sm text-gray-600">Failed</p>
                    </div>
                  </div>

                  {/* Updated Influencers */}
                  {subscriberResult.updated.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Updated Channels ({subscriberResult.updated.length})</h3>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {subscriberResult.updated.slice(0, 10).map((update) => (
                          <div key={update.influencerId} className="bg-gray-50 rounded p-3 text-sm">
                            <p className="font-medium text-gray-900">{update.influencerName}</p>
                            <p className="text-gray-600">
                              {update.oldCount.toLocaleString()} → <span className="text-green-600 font-semibold">{update.newCount.toLocaleString()}</span>
                              <span className="text-xs ml-2">
                                ({update.newCount > update.oldCount ? '+' : ''}{(update.newCount - update.oldCount).toLocaleString()})
                              </span>
                            </p>
                          </div>
                        ))}
                        {subscriberResult.updated.length > 10 && (
                          <p className="text-xs text-gray-500 text-center pt-2">...and {subscriberResult.updated.length - 10} more</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {subscriberResult.errors.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Errors ({subscriberResult.errors.length})</h3>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {subscriberResult.errors.slice(0, 5).map((error, idx) => (
                          <div key={idx} className="bg-red-50 rounded p-3 text-sm">
                            <p className="font-medium text-red-900">{error.influencerName}</p>
                            <p className="text-red-700 text-xs">{error.error}</p>
                          </div>
                        ))}
                        {subscriberResult.errors.length > 5 && (
                          <p className="text-xs text-gray-500 text-center pt-2">...and {subscriberResult.errors.length - 5} more errors</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Close Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => {
                        setShowSubscriberModal(false);
                        setSubscriberProgress(null);
                        setSubscriberResult(null);
                      }}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {!subscriberResult && isUpdatingSubscribers && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
