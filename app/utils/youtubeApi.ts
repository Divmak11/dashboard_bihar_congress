// YouTube API Integration
// Handles video statistics fetching from YouTube Data API v3

import { YoutubeVideoMetrics } from '../../models/youtubeTypes';

// In-memory cache for video stats (TTL-based)
interface CachedVideoStats {
  stats: YoutubeVideoMetrics;
  timestamp: number;
}

const videoStatsCache: Map<string, CachedVideoStats> = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes TTL

// Clear the video stats cache (called by Refresh button)
export function clearVideoStatsCache(): void {
  console.log('[youtubeApi] Clearing video stats cache');
  videoStatsCache.clear();
}

// Extract video ID from various YouTube URL formats
export function extractVideoId(link: string): string | null {
  if (!link) return null;

  try {
    // Handle different YouTube URL formats
    const patterns = [
      // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([^&\s]+)/,
      // Short URL: https://youtu.be/VIDEO_ID
      /youtu\.be\/([^?\s]+)/,
      // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
      /youtube\.com\/shorts\/([^?\s]+)/,
      // Embed URL: https://www.youtube.com/embed/VIDEO_ID
      /youtube\.com\/embed\/([^?\s]+)/,
      // Mobile URL: https://m.youtube.com/watch?v=VIDEO_ID
      /m\.youtube\.com\/watch\?v=([^&\s]+)/
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match && match[1]) {
        console.log(`[extractVideoId] Extracted ID: ${match[1]} from ${link}`);
        return match[1];
      }
    }

    // If no pattern matches but link looks like just an ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(link)) {
      console.log(`[extractVideoId] Direct ID detected: ${link}`);
      return link;
    }

    console.warn(`[extractVideoId] Could not extract ID from: ${link}`);
    return null;
  } catch (error) {
    console.error('[extractVideoId] Error:', error);
    return null;
  }
}

// Fetch video statistics from YouTube API with batching and caching
export async function fetchVideoStats(
  videoIds: string[],
  apiKey: string,
  opts: { concurrency?: number } = {}
): Promise<Map<string, YoutubeVideoMetrics>> {
  console.log(`[fetchVideoStats] Fetching stats for ${videoIds.length} videos`);
  
  const results = new Map<string, YoutubeVideoMetrics>();
  
  if (!apiKey) {
    console.error('[fetchVideoStats] No API key provided');
    return results;
  }

  if (!videoIds || videoIds.length === 0) {
    console.log('[fetchVideoStats] No video IDs provided');
    return results;
  }

  const now = Date.now();
  const uncachedIds: string[] = [];

  // Check cache first
  for (const id of videoIds) {
    const cached = videoStatsCache.get(id);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      results.set(id, cached.stats);
    } else {
      uncachedIds.push(id);
    }
  }

  console.log(`[fetchVideoStats] ${results.size} cached, ${uncachedIds.length} to fetch`);

  if (uncachedIds.length === 0) {
    return results;
  }

  // Batch uncached IDs (YouTube API allows up to 50 IDs per request)
  const batches: string[][] = [];
  const batchSize = 50;
  
  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    batches.push(uncachedIds.slice(i, i + batchSize));
  }

  console.log(`[fetchVideoStats] Created ${batches.length} batches`);

  // Process batches with concurrency control
  const concurrency = opts.concurrency || 3;
  const batchPromises: Promise<void>[] = [];

  for (let i = 0; i < batches.length; i += concurrency) {
    const concurrentBatches = batches.slice(i, i + concurrency);
    
    const promises = concurrentBatches.map(async (batch) => {
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.append('part', 'statistics');
        url.searchParams.append('id', batch.join(','));
        url.searchParams.append('key', apiKey);

        const response = await fetch(url.toString());
        
        if (!response.ok) {
          console.error(`[fetchVideoStats] API error: ${response.status} ${response.statusText}`);
          
          // Handle quota errors gracefully
          if (response.status === 403) {
            console.warn('[fetchVideoStats] Quota exceeded or API key invalid');
          }
          return;
        }

        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            const stats: YoutubeVideoMetrics = {
              views: parseInt(item.statistics?.viewCount || '0', 10),
              likes: parseInt(item.statistics?.likeCount || '0', 10)
            };
            
            // Update results
            results.set(item.id, stats);
            
            // Update cache
            videoStatsCache.set(item.id, {
              stats,
              timestamp: now
            });

            console.log(`[fetchVideoStats] Video ${item.id}: ${stats.views} views, ${stats.likes} likes`);
          });
        }
      } catch (error) {
        console.error('[fetchVideoStats] Batch error:', error);
      }
    });

    batchPromises.push(...promises);
    
    // Wait for current concurrent batch to complete before starting next
    if (i + concurrency < batches.length) {
      await Promise.all(promises);
    }
  }

  // Wait for all remaining batches
  await Promise.all(batchPromises);

  console.log(`[fetchVideoStats] Fetched stats for ${results.size} videos`);
  return results;
}

// Helper to check if a video link is valid
export function isValidYoutubeLink(link: string): boolean {
  return extractVideoId(link) !== null;
}

// Helper to get video thumbnail URL
export function getVideoThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
  const qualityMap = {
    'default': 'default',    // 120x90
    'medium': 'mqdefault',   // 320x180
    'high': 'hqdefault',     // 480x360
    'maxres': 'maxresdefault' // 1280x720
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

// Helper to build YouTube watch URL from video ID
export function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Batch fetch video stats from links
export async function fetchVideoStatsFromLinks(
  videoLinks: string[],
  apiKey: string,
  opts: { concurrency?: number } = {}
): Promise<Map<string, YoutubeVideoMetrics>> {
  console.log(`[fetchVideoStatsFromLinks] Processing ${videoLinks.length} links`);
  
  // Extract video IDs from links
  const videoIds: string[] = [];
  const linkToIdMap = new Map<string, string>();
  
  for (const link of videoLinks) {
    const videoId = extractVideoId(link);
    if (videoId) {
      videoIds.push(videoId);
      linkToIdMap.set(link, videoId);
    } else {
      console.warn(`[fetchVideoStatsFromLinks] Invalid link: ${link}`);
    }
  }

  // Fetch stats for valid IDs
  const idStats = await fetchVideoStats(videoIds, apiKey, opts);
  
  // Map back to original links
  const linkStats = new Map<string, YoutubeVideoMetrics>();
  for (const [link, id] of linkToIdMap.entries()) {
    const stats = idStats.get(id);
    if (stats) {
      linkStats.set(link, stats);
    } else {
      // Set zero stats for videos that couldn't be fetched
      linkStats.set(link, { views: 0, likes: 0 });
    }
  }

  return linkStats;
}

// Re-export channel-related functions from youtubeChannelApi for consistency
import {
  extractChannelId as extractChannelIdFromChannelApi,
  fetchChannelSubscriberCounts
} from './youtubeChannelApi';

// Extract channel ID - delegates to youtubeChannelApi for consistency
export function extractChannelId(channelLink: string): string | null {
  return extractChannelIdFromChannelApi(channelLink);
}

// Check if a link is a valid YouTube channel link (not a video link)
export function isValidYoutubeChannelLink(link: string): boolean {
  if (!link) return false;
  
  // Must contain youtube.com or youtu.be
  const hasYoutubeDomain = link.includes('youtube.com') || link.includes('youtu.be');
  if (!hasYoutubeDomain) return false;
  
  // Should NOT be a video link
  const isVideoLink = link.includes('/watch?v=') || link.includes('/shorts/') || link.includes('/embed/');
  if (isVideoLink) return false;
  
  // Should be a channel, user, or handle link
  const isChannelLink = link.includes('/channel/') || link.includes('/@') || 
                        link.includes('/c/') || link.includes('/user/');
  
  return isChannelLink;
}

// Fetch subscriber counts for multiple YouTube channels
// Now delegates to youtubeChannelApi which uses multi-strategy resolution
export async function fetchChannelSubscribers(
  channelLinks: string[],
  apiKey: string,
  opts: { concurrency?: number } = {}
): Promise<Map<string, number>> {
  console.log(`[fetchChannelSubscribers] Delegating to youtubeChannelApi for ${channelLinks.length} channels`);
  return fetchChannelSubscriberCounts(channelLinks, apiKey, opts);
}
