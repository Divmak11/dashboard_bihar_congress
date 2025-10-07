'use client';

import React, { useState } from 'react';
import { fetchInfluencers } from '../../app/utils/fetchYoutubeData';
import { fetchInfluencerChannelVideos } from '../../app/utils/youtubeChannelApi';
import { generateChannelVideosReport, generateReportSummary } from '../../app/utils/excelReportGenerator';
import {
  YoutubeInfluencerDoc,
  InfluencerVideosData,
  ChannelVideoData,
  ChannelFetchProgress,
  ChannelFetchError
} from '../../models/youtubeTypes';
import { formatDuration } from '../../app/utils/youtubeChannelApi';

interface ChannelVideosFetcherProps {
  apiKey: string;
}

export default function ChannelVideosFetcher({ apiKey }: ChannelVideosFetcherProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<ChannelFetchProgress | null>(null);
  const [influencersData, setInfluencersData] = useState<InfluencerVideosData[]>([]);
  const [errors, setErrors] = useState<ChannelFetchError[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<Set<string>>(new Set());
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  // Validate date range
  const isDateRangeValid = (): boolean => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  };

  // Handle fetch videos for all influencers
  const handleFetchVideos = async () => {
    if (!isDateRangeValid()) {
      alert('Please select a valid date range');
      return;
    }

    if (!apiKey) {
      alert('YouTube API key is not configured. Please contact administrator.');
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: 0 });
    setInfluencersData([]);
    setErrors([]);
    setRemovedVideoIds(new Set());
    setQuotaExceeded(false);

    try {
      // Fetch all influencers
      console.log('[ChannelVideosFetcher] Fetching influencers...');
      const allInfluencers = await fetchInfluencers();

      if (allInfluencers.length === 0) {
        alert('No influencers found in database');
        setLoading(false);
        return;
      }

      // Filter to only YouTube links (exclude Facebook, Instagram, etc.)
      const influencers = allInfluencers.filter(inf => {
        if (!inf.channelLink) return false;
        const link = inf.channelLink.toLowerCase();
        const isYouTube = link.includes('youtube.com') || link.includes('youtu.be');
        if (!isYouTube) {
          console.log(`[ChannelVideosFetcher] Skipping ${inf.name} - Non-YouTube link: ${inf.channelLink}`);
        }
        return isYouTube;
      });

      console.log(`[ChannelVideosFetcher] Found ${allInfluencers.length} total influencers, ${influencers.length} with YouTube links`);
      
      if (influencers.length === 0) {
        alert('No influencers found with YouTube channel links');
        setLoading(false);
        return;
      }

      setProgress({ current: 0, total: influencers.length });

      const results: InfluencerVideosData[] = [];
      const fetchErrors: ChannelFetchError[] = [];

      // Fetch videos for each influencer
      for (let i = 0; i < influencers.length; i++) {
        const influencer = influencers[i];
        
        setProgress({
          current: i + 1,
          total: influencers.length,
          currentInfluencer: influencer.name
        });

        console.log(`[ChannelVideosFetcher] Fetching videos for ${influencer.name} (${i + 1}/${influencers.length})`);

        // Skip if no channel link
        if (!influencer.channelLink) {
          console.warn(`[ChannelVideosFetcher] No channel link for ${influencer.name}`);
          fetchErrors.push({
            influencerId: influencer.id,
            influencerName: influencer.name,
            error: 'No channel link provided',
            type: 'invalid'
          });
          continue;
        }

        const { videos, error } = await fetchInfluencerChannelVideos(
          influencer.id,
          influencer.name,
          influencer.channelLink,
          influencer.channelName,
          apiKey,
          { startDate, endDate }
        );

        if (error) {
          console.error(`[ChannelVideosFetcher] Error for ${influencer.name}:`, error);
          fetchErrors.push(error);

          // Check for quota exceeded
          if (error.type === 'quota') {
            setQuotaExceeded(true);
            console.warn('[ChannelVideosFetcher] Quota exceeded, stopping fetch');
            break;
          }
        } else if (videos.length > 0) {
          results.push({
            influencerId: influencer.id,
            influencerName: influencer.name,
            channelName: influencer.channelName,
            channelLink: influencer.channelLink,
            videos
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setInfluencersData(results);
      setErrors(fetchErrors);
      setProgress(null);
      setLoading(false);

      if (results.length === 0 && fetchErrors.length === 0) {
        alert('No videos found in the selected date range');
      }

      console.log(`[ChannelVideosFetcher] Fetch complete: ${results.length} influencers with videos, ${fetchErrors.length} errors`);
    } catch (error) {
      console.error('[ChannelVideosFetcher] Fatal error:', error);
      alert('An unexpected error occurred. Please try again.');
      setLoading(false);
      setProgress(null);
    }
  };

  // Handle remove video
  const handleRemoveVideo = (videoId: string) => {
    setRemovedVideoIds(prev => {
      const newSet = new Set(prev);
      newSet.add(videoId);
      return newSet;
    });
  };

  // Handle generate report
  const handleGenerateReport = () => {
    if (influencersData.length === 0) {
      alert('No videos to export. Please fetch videos first.');
      return;
    }

    // Filter out removed videos
    const filteredData = influencersData.map(influencerData => ({
      ...influencerData,
      videos: influencerData.videos.filter(video => !removedVideoIds.has(video.videoId))
    })).filter(influencerData => influencerData.videos.length > 0);

    if (filteredData.length === 0) {
      alert('No videos remaining after removals. Cannot generate report.');
      return;
    }

    generateChannelVideosReport(filteredData, { startDate, endDate });
  };

  // Handle clear all
  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all fetched data?')) {
      setInfluencersData([]);
      setErrors([]);
      setRemovedVideoIds(new Set());
      setQuotaExceeded(false);
    }
  };

  // Get filtered videos (excluding removed ones)
  const getFilteredVideos = (videos: ChannelVideoData[]) => {
    return videos.filter(video => !removedVideoIds.has(video.videoId));
  };

  // Calculate summary
  const summary = generateReportSummary(
    influencersData.map(influencerData => ({
      ...influencerData,
      videos: getFilteredVideos(influencerData.videos)
    }))
  );

  // Format date for display
  const formatDisplayDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Channel Videos Fetcher</h2>
        <p className="text-gray-600">Fetch and analyze videos from YouTube influencer channels within a date range</p>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={handleFetchVideos}
            disabled={loading || !isDateRangeValid()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Fetch Videos</span>
              </>
            )}
          </button>

          {influencersData.length > 0 && (
            <>
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Excel Report</span>
              </button>

              <button
                onClick={handleClearAll}
                disabled={loading}
                className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Processing: {progress.currentInfluencer || 'Initializing...'}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Quota Warning */}
      {quotaExceeded && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-yellow-800">YouTube API Quota Exceeded</p>
              <p className="text-sm text-yellow-700 mt-1">
                The YouTube API daily quota has been reached. Please try again tomorrow or contact administrator to increase quota limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {influencersData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Influencers</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalInfluencers}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Total Videos</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{summary.totalVideos}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Long Videos</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{summary.longVideos}</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <p className="text-sm text-pink-600 font-medium">Short Videos</p>
              <p className="text-2xl font-bold text-pink-700 mt-1">{summary.shortVideos}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600 font-medium">Total Views</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">{formatNumber(summary.totalViews)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600 font-medium">Total Likes</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{formatNumber(summary.totalLikes)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Errors Section */}
      {errors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Errors ({errors.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-red-800">{error.influencerName}</p>
                  <p className="text-sm text-red-700">{error.error}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos by Influencer */}
      {influencersData.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-800">Videos by Influencer</h3>
          {influencersData.map((influencerData) => {
            const filteredVideos = getFilteredVideos(influencerData.videos);
            
            if (filteredVideos.length === 0) return null;

            return (
              <div key={influencerData.influencerId} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Influencer Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-white">{influencerData.influencerName}</h4>
                      <p className="text-blue-100 text-sm mt-1">
                        Channel: <span className="font-medium">{influencerData.channelName}</span>
                      </p>
                      <a
                        href={influencerData.channelLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-100 hover:text-white text-sm mt-1 inline-flex items-center gap-1"
                      >
                        <span>View Channel</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{filteredVideos.length}</p>
                      <p className="text-blue-100 text-sm">Videos</p>
                    </div>
                  </div>
                </div>

                {/* Videos List */}
                <div className="divide-y divide-gray-200">
                  {filteredVideos.map((video) => (
                    <div key={video.videoId} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-40 h-24 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                            />
                          </a>
                          <div className="mt-2 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              video.videoType === 'Short' 
                                ? 'bg-pink-100 text-pink-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {video.videoType}
                            </span>
                          </div>
                        </div>

                        {/* Video Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <a
                                href={video.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                              >
                                {video.title}
                              </a>
                              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span className="font-medium">{formatNumber(video.views)}</span>
                                  <span>views</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                  <span className="font-medium">{formatNumber(video.likes)}</span>
                                  <span>likes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{formatDuration(video.durationSeconds)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{formatDisplayDate(video.publishedAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => handleRemoveVideo(video.videoId)}
                              className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove from list"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && influencersData.length === 0 && errors.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 text-lg font-medium mb-2">No videos fetched yet</p>
          <p className="text-gray-500 text-sm">Select a date range and click &quot;Fetch Videos&quot; to begin</p>
        </div>
      )}
    </div>
  );
}
