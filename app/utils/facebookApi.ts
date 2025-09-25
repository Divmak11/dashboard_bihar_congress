// Facebook API Integration
// Handles video statistics fetching from Facebook Graph API

import { VideoMetrics } from '../../models/youtubeTypes';

// In-memory cache for Facebook video stats (TTL-based)
interface CachedFacebookStats {
  stats: VideoMetrics;
  timestamp: number;
}

const facebookStatsCache: Map<string, CachedFacebookStats> = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes TTL

// Clear the Facebook video stats cache
export function clearFacebookStatsCache(): void {
  console.log('[facebookApi] Clearing Facebook stats cache');
  facebookStatsCache.clear();
}

// Extract video ID from various Facebook URL formats
export function extractFacebookVideoId(link: string): string | null {
  if (!link) return null;

  try {
    // Handle different Facebook URL formats
    const patterns = [
      // Facebook watch URL: https://www.facebook.com/watch?v=VIDEO_ID
      /(?:facebook\.com\/watch\?v=)([^&\s]+)/,
      // Facebook video post: https://www.facebook.com/USER/videos/VIDEO_ID
      /facebook\.com\/[^\/]+\/videos\/([^\/?\s]+)/,
      // Facebook mobile: https://m.facebook.com/watch?v=VIDEO_ID
      /m\.facebook\.com\/watch\?v=([^&\s]+)/,
      // Facebook direct video link: https://www.facebook.com/VIDEO_ID/videos/VIDEO_ID
      /facebook\.com\/([^\/]+)\/videos\/([^\/?\s]+)/,
      // Facebook story/reel: https://www.facebook.com/reel/VIDEO_ID
      /facebook\.com\/reel\/([^\/?\s]+)/
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        // For patterns that capture multiple groups, use the last one (video ID)
        const videoId = match[match.length - 1];
        if (videoId) {
          console.log(`[extractFacebookVideoId] Extracted ID: ${videoId} from ${link}`);
          return videoId;
        }
      }
    }

    // If no pattern matches but link looks like just an ID
    if (/^[0-9]+$/.test(link)) {
      console.log(`[extractFacebookVideoId] Direct ID detected: ${link}`);
      return link;
    }

    console.warn(`[extractFacebookVideoId] Could not extract ID from: ${link}`);
    return null;
  } catch (error) {
    console.error('[extractFacebookVideoId] Error:', error);
    return null;
  }
}

// Fetch video statistics from Facebook Graph API with batching and caching
export async function fetchFacebookVideoStats(
  videoIds: string[],
  accessToken: string,
  opts: { concurrency?: number } = {}
): Promise<Map<string, VideoMetrics>> {
  console.log(`[fetchFacebookVideoStats] Fetching stats for ${videoIds.length} videos`);
  
  const results = new Map<string, VideoMetrics>();
  
  if (!accessToken) {
    console.error('[fetchFacebookVideoStats] No access token provided');
    return results;
  }

  if (!videoIds || videoIds.length === 0) {
    console.log('[fetchFacebookVideoStats] No video IDs provided');
    return results;
  }

  const now = Date.now();
  const uncachedIds: string[] = [];

  // Check cache first
  for (const id of videoIds) {
    const cached = facebookStatsCache.get(id);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      results.set(id, cached.stats);
    } else {
      uncachedIds.push(id);
    }
  }

  console.log(`[fetchFacebookVideoStats] ${results.size} cached, ${uncachedIds.length} to fetch`);

  if (uncachedIds.length === 0) {
    return results;
  }

  // Process videos individually (Facebook Graph API doesn't support batch video stats)
  const concurrency = opts.concurrency || 3;
  const promises: Promise<void>[] = [];

  for (let i = 0; i < uncachedIds.length; i += concurrency) {
    const batch = uncachedIds.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (videoId) => {
      try {
        // Facebook Graph API endpoint for video insights
        const url = new URL(`https://graph.facebook.com/v18.0/${videoId}`);
        url.searchParams.append('fields', 'video_insights.metric(total_video_views,total_video_likes),title');
        url.searchParams.append('access_token', accessToken);

        const response = await fetch(url.toString());
        
        if (!response.ok) {
          console.error(`[fetchFacebookVideoStats] API error for ${videoId}: ${response.status} ${response.statusText}`);
          
          // Handle common Facebook API errors
          if (response.status === 403) {
            console.warn('[fetchFacebookVideoStats] Access denied - check permissions');
          } else if (response.status === 400) {
            console.warn(`[fetchFacebookVideoStats] Invalid video ID: ${videoId}`);
          }
          
          // Set zero stats for failed requests
          results.set(videoId, { views: 0, likes: 0 });
          return;
        }

        const data = await response.json();
        
        let views = 0;
        let likes = 0;

        // Parse video insights if available
        if (data.video_insights && data.video_insights.data) {
          data.video_insights.data.forEach((insight: any) => {
            if (insight.name === 'total_video_views' && insight.values?.[0]?.value) {
              views = parseInt(insight.values[0].value, 10) || 0;
            } else if (insight.name === 'total_video_likes' && insight.values?.[0]?.value) {
              likes = parseInt(insight.values[0].value, 10) || 0;
            }
          });
        }

        const stats: VideoMetrics = { views, likes };
        
        // Update results
        results.set(videoId, stats);
        
        // Update cache
        facebookStatsCache.set(videoId, {
          stats,
          timestamp: now
        });

        console.log(`[fetchFacebookVideoStats] Video ${videoId}: ${stats.views} views, ${stats.likes} likes`);
      } catch (error) {
        console.error(`[fetchFacebookVideoStats] Error for ${videoId}:`, error);
        // Set zero stats for errored requests
        results.set(videoId, { views: 0, likes: 0 });
      }
    });

    promises.push(...batchPromises);
    
    // Wait for current batch to complete before starting next
    if (i + concurrency < uncachedIds.length) {
      await Promise.all(batchPromises);
    }
  }

  // Wait for all remaining requests
  await Promise.all(promises);

  console.log(`[fetchFacebookVideoStats] Fetched stats for ${results.size} videos`);
  return results;
}

// Helper to check if a video link is a valid Facebook link
export function isValidFacebookLink(link: string): boolean {
  return extractFacebookVideoId(link) !== null;
}

// Helper to build Facebook watch URL from video ID
export function buildFacebookWatchUrl(videoId: string): string {
  return `https://www.facebook.com/watch?v=${videoId}`;
}

// Batch fetch Facebook video stats from links
export async function fetchFacebookVideoStatsFromLinks(
  videoLinks: string[],
  accessToken: string,
  opts: { concurrency?: number } = {}
): Promise<Map<string, VideoMetrics>> {
  console.log(`[fetchFacebookVideoStatsFromLinks] Processing ${videoLinks.length} links`);
  
  // Extract video IDs from links
  const videoIds: string[] = [];
  const linkToIdMap = new Map<string, string>();
  
  for (const link of videoLinks) {
    const videoId = extractFacebookVideoId(link);
    if (videoId) {
      videoIds.push(videoId);
      linkToIdMap.set(link, videoId);
    } else {
      console.warn(`[fetchFacebookVideoStatsFromLinks] Invalid Facebook link: ${link}`);
    }
  }

  // Fetch stats for valid IDs
  const idStats = await fetchFacebookVideoStats(videoIds, accessToken, opts);
  
  // Map back to original links
  const linkStats = new Map<string, VideoMetrics>();
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
