// Unified Video API
// Handles video statistics fetching from multiple platforms (YouTube, Facebook)

import { VideoMetrics, VideoPlatform } from '../../models/youtubeTypes';
import { 
  extractVideoId as extractYoutubeId, 
  fetchVideoStatsFromLinks as fetchYoutubeStatsFromLinks,
  clearVideoStatsCache as clearYoutubeCache,
  isValidYoutubeLink
} from './youtubeApi';
import {
  extractFacebookVideoId,
  fetchFacebookVideoStatsFromLinks,
  clearFacebookStatsCache,
  isValidFacebookLink
} from './facebookApi';

// Platform detection result
interface PlatformDetection {
  platform: VideoPlatform;
  videoId: string;
}

// Clear all video stats caches
export function clearAllVideoStatsCache(): void {
  console.log('[videoApi] Clearing all video stats caches');
  clearYoutubeCache();
  clearFacebookStatsCache();
}

// Detect platform from video link
export function detectVideoPlatform(link: string): PlatformDetection | null {
  if (!link) return null;

  // Try YouTube first
  const youtubeId = extractYoutubeId(link);
  if (youtubeId) {
    return {
      platform: 'youtube',
      videoId: youtubeId
    };
  }

  // Try Facebook
  const facebookId = extractFacebookVideoId(link);
  if (facebookId) {
    return {
      platform: 'facebook',
      videoId: facebookId
    };
  }

  console.warn(`[detectVideoPlatform] Unsupported platform for link: ${link}`);
  return null;
}

// Check if a link is from a supported video platform
export function isSupportedVideoLink(link: string): boolean {
  return isValidYoutubeLink(link) || isValidFacebookLink(link);
}

// Group links by platform for efficient batch processing
interface PlatformGroups {
  youtube: string[];
  facebook: string[];
  unsupported: string[];
}

function groupLinksByPlatform(links: string[]): PlatformGroups {
  const groups: PlatformGroups = {
    youtube: [],
    facebook: [],
    unsupported: []
  };

  for (const link of links) {
    const detection = detectVideoPlatform(link);
    if (detection) {
      groups[detection.platform].push(link);
    } else {
      groups.unsupported.push(link);
    }
  }

  console.log(`[groupLinksByPlatform] YouTube: ${groups.youtube.length}, Facebook: ${groups.facebook.length}, Unsupported: ${groups.unsupported.length}`);
  return groups;
}

// Unified function to fetch video stats from mixed platform links
export async function fetchVideoStatsFromLinks(
  videoLinks: string[],
  opts: { 
    youtubeApiKey?: string;
    facebookAccessToken?: string;
    concurrency?: number;
  } = {}
): Promise<Map<string, VideoMetrics>> {
  console.log(`[fetchVideoStatsFromLinks] Processing ${videoLinks.length} mixed platform links`);
  
  const results = new Map<string, VideoMetrics>();
  
  if (!videoLinks || videoLinks.length === 0) {
    return results;
  }

  // Group links by platform
  const platformGroups = groupLinksByPlatform(videoLinks);
  
  // Prepare promises for parallel fetching
  const fetchPromises: Promise<Map<string, VideoMetrics>>[] = [];

  // Fetch YouTube stats if we have YouTube links and API key
  if (platformGroups.youtube.length > 0 && opts.youtubeApiKey) {
    console.log(`[fetchVideoStatsFromLinks] Fetching YouTube stats for ${platformGroups.youtube.length} videos`);
    fetchPromises.push(
      fetchYoutubeStatsFromLinks(platformGroups.youtube, opts.youtubeApiKey, { concurrency: opts.concurrency })
    );
  } else if (platformGroups.youtube.length > 0) {
    console.warn('[fetchVideoStatsFromLinks] YouTube links found but no API key provided');
  }

  // Fetch Facebook stats if we have Facebook links and access token
  if (platformGroups.facebook.length > 0 && opts.facebookAccessToken) {
    console.log(`[fetchVideoStatsFromLinks] Fetching Facebook stats for ${platformGroups.facebook.length} videos`);
    fetchPromises.push(
      fetchFacebookVideoStatsFromLinks(platformGroups.facebook, opts.facebookAccessToken, { concurrency: opts.concurrency })
    );
  } else if (platformGroups.facebook.length > 0) {
    console.warn('[fetchVideoStatsFromLinks] Facebook links found but no access token provided');
  }

  // Execute all platform fetches in parallel
  const platformResults = await Promise.all(fetchPromises);

  // Merge results from all platforms
  for (const platformResult of platformResults) {
    for (const [link, stats] of platformResult.entries()) {
      results.set(link, stats);
    }
  }

  // Set zero stats for unsupported links
  for (const unsupportedLink of platformGroups.unsupported) {
    console.warn(`[fetchVideoStatsFromLinks] Unsupported link, setting zero stats: ${unsupportedLink}`);
    results.set(unsupportedLink, { views: 0, likes: 0 });
  }

  // Set zero stats for links that couldn't be fetched (missing API keys)
  for (const youtubeLink of platformGroups.youtube) {
    if (!results.has(youtubeLink)) {
      results.set(youtubeLink, { views: 0, likes: 0 });
    }
  }
  
  for (const facebookLink of platformGroups.facebook) {
    if (!results.has(facebookLink)) {
      results.set(facebookLink, { views: 0, likes: 0 });
    }
  }

  console.log(`[fetchVideoStatsFromLinks] Successfully processed ${results.size} total links`);
  return results;
}

// Helper to get platform-specific video URL
export function getVideoUrl(detection: PlatformDetection): string {
  switch (detection.platform) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${detection.videoId}`;
    case 'facebook':
      return `https://www.facebook.com/watch?v=${detection.videoId}`;
    default:
      return '';
  }
}

// Helper to get platform display name
export function getPlatformDisplayName(platform: VideoPlatform): string {
  switch (platform) {
    case 'youtube':
      return 'YouTube';
    case 'facebook':
      return 'Facebook';
    default:
      return 'Unknown';
  }
}

// Legacy exports for backward compatibility
export { extractVideoId, isValidYoutubeLink } from './youtubeApi';
export { 
  fetchVideoStatsFromLinks as fetchVideoStatsFromLinksLegacy 
} from './youtubeApi';
