// YouTube Channel API Integration
// Handles fetching videos from YouTube channels with smart pagination and filtering

import { ChannelVideoData, ChannelFetchError } from '../../models/youtubeTypes';

// Extract channel ID from various YouTube channel URL formats
export function extractChannelId(channelLink: string): string | null {
  if (!channelLink) return null;

  try {
    // Handle different YouTube channel URL formats
    const patterns = [
      // Standard channel URL: https://www.youtube.com/channel/UC...
      /youtube\.com\/channel\/([^\/\?]+)/,
      // Custom URL: https://www.youtube.com/@username
      /youtube\.com\/@([^\/\?]+)/,
      // User URL: https://www.youtube.com/user/username
      /youtube\.com\/user\/([^\/\?]+)/,
      // C/ format: https://www.youtube.com/c/channelname
      /youtube\.com\/c\/([^\/\?]+)/,
    ];

    for (const pattern of patterns) {
      const match = channelLink.match(pattern);
      if (match && match[1]) {
        console.log(`[extractChannelId] Extracted: ${match[1]} from ${channelLink}`);
        return match[1];
      }
    }

    // If it's already a channel ID (starts with UC and 22 chars)
    if (/^UC[\w-]{22}$/.test(channelLink)) {
      console.log(`[extractChannelId] Direct channel ID: ${channelLink}`);
      return channelLink;
    }

    console.warn(`[extractChannelId] Could not extract ID from: ${channelLink}`);
    return null;
  } catch (error) {
    console.error('[extractChannelId] Error:', error);
    return null;
  }
}

// Get channel's uploads playlist ID
export async function getChannelUploadsPlaylistId(
  channelIdOrUsername: string,
  apiKey: string
): Promise<{ playlistId: string | null; error?: ChannelFetchError }> {
  console.log(`[getChannelUploadsPlaylistId] Starting lookup for: ${channelIdOrUsername}`);

  try {
    let response: Response;
    let data: any;
    let attemptNumber = 0;

    // Strategy 1: If it looks like a channel ID (UC...), try that first
    if (channelIdOrUsername.startsWith('UC') && channelIdOrUsername.length === 24) {
      attemptNumber++;
      const url = new URL('https://www.googleapis.com/youtube/v3/channels');
      url.searchParams.append('part', 'contentDetails,snippet');
      url.searchParams.append('id', channelIdOrUsername);
      url.searchParams.append('key', apiKey);
      
      console.log(`[getChannelUploadsPlaylistId] Attempt ${attemptNumber}: Channel ID lookup`);
      response = await fetch(url.toString());
      data = await response.json();
      
      if (response.ok && data.items && data.items.length > 0) {
        console.log(`[getChannelUploadsPlaylistId] ✓ Success via channel ID`);
        const uploadsPlaylistId = data.items[0].contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylistId) {
          console.log(`[getChannelUploadsPlaylistId] Found playlist: ${uploadsPlaylistId}`);
          return { playlistId: uploadsPlaylistId };
        }
      }
      console.log(`[getChannelUploadsPlaylistId] ✗ Channel ID lookup failed:`, data);
    }

    // Strategy 2: Try as @handle (for @username format)
    if (channelIdOrUsername.startsWith('@') || !channelIdOrUsername.startsWith('UC')) {
      attemptNumber++;
      const handle = channelIdOrUsername.startsWith('@') ? channelIdOrUsername.slice(1) : channelIdOrUsername;
      const url = new URL('https://www.googleapis.com/youtube/v3/channels');
      url.searchParams.append('part', 'contentDetails,snippet');
      url.searchParams.append('forHandle', handle);
      url.searchParams.append('key', apiKey);
      
      console.log(`[getChannelUploadsPlaylistId] Attempt ${attemptNumber}: Handle lookup for "${handle}"`);
      response = await fetch(url.toString());
      data = await response.json();
      
      if (response.ok && data.items && data.items.length > 0) {
        console.log(`[getChannelUploadsPlaylistId] ✓ Success via handle`);
        const uploadsPlaylistId = data.items[0].contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylistId) {
          console.log(`[getChannelUploadsPlaylistId] Found playlist: ${uploadsPlaylistId}`);
          return { playlistId: uploadsPlaylistId };
        }
      }
      console.log(`[getChannelUploadsPlaylistId] ✗ Handle lookup failed:`, data);
    }

    // Strategy 3: Try as legacy username (forUsername)
    attemptNumber++;
    const username = channelIdOrUsername.startsWith('@') ? channelIdOrUsername.slice(1) : channelIdOrUsername;
    const urlUsername = new URL('https://www.googleapis.com/youtube/v3/channels');
    urlUsername.searchParams.append('part', 'contentDetails,snippet');
    urlUsername.searchParams.append('forUsername', username);
    urlUsername.searchParams.append('key', apiKey);
    
    console.log(`[getChannelUploadsPlaylistId] Attempt ${attemptNumber}: Username lookup for "${username}"`);
    response = await fetch(urlUsername.toString());
    data = await response.json();

    
    if (response.ok && data.items && data.items.length > 0) {
      console.log(`[getChannelUploadsPlaylistId] ✓ Success via username`);
      const uploadsPlaylistId = data.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (uploadsPlaylistId) {
        console.log(`[getChannelUploadsPlaylistId] Found playlist: ${uploadsPlaylistId}`);
        return { playlistId: uploadsPlaylistId };
      }
    }
    console.log(`[getChannelUploadsPlaylistId] ✗ Username lookup failed:`, data);

    // All strategies failed - check for specific error types
    if (response.status === 403) {
      console.error(`[getChannelUploadsPlaylistId] API quota exceeded`);
      return {
        playlistId: null,
        error: {
          influencerId: '',
          influencerName: '',
          error: 'API quota exceeded. Please try again later.',
          type: 'quota'
        }
      };
    }

    // Generic failure after all attempts
    console.error(`[getChannelUploadsPlaylistId] All lookup strategies failed for: ${channelIdOrUsername}`);
    console.error(`[getChannelUploadsPlaylistId] Final response status: ${response.status}`);
    console.error(`[getChannelUploadsPlaylistId] Final response data:`, data);
    
    return {
      playlistId: null,
      error: {
        influencerId: '',
        influencerName: '',
        error: `Channel not found: "${channelIdOrUsername}". Please verify the channel link is correct and the channel exists.`,
        type: 'invalid'
      }
    };
  } catch (error) {
    console.error('[getChannelUploadsPlaylistId] Error:', error);
    return {
      playlistId: null,
      error: {
        influencerId: '',
        influencerName: '',
        error: error instanceof Error ? error.message : 'Network error',
        type: 'network'
      }
    };
  }
}

// Fetch video IDs from playlist with pagination
export async function fetchPlaylistVideoIds(
  playlistId: string,
  apiKey: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<{ videoIds: string[]; nextPageToken?: string; error?: ChannelFetchError }> {
  console.log(`[fetchPlaylistVideoIds] Fetching ${maxResults} videos from ${playlistId}`);

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.append('part', 'contentDetails');
    url.searchParams.append('playlistId', playlistId);
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('key', apiKey);

    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 403) {
        return {
          videoIds: [],
          error: {
            influencerId: '',
            influencerName: '',
            error: 'API quota exceeded',
            type: 'quota'
          }
        };
      }

      if (response.status === 404) {
        return {
          videoIds: [],
          error: {
            influencerId: '',
            influencerName: '',
            error: 'Playlist not found or private',
            type: 'private'
          }
        };
      }

      return {
        videoIds: [],
        error: {
          influencerId: '',
          influencerName: '',
          error: `API error: ${response.status}`,
          type: 'unknown'
        }
      };
    }

    const data = await response.json();
    const videoIds = data.items?.map((item: any) => item.contentDetails.videoId).filter(Boolean) || [];

    console.log(`[fetchPlaylistVideoIds] Found ${videoIds.length} video IDs`);
    return {
      videoIds,
      nextPageToken: data.nextPageToken
    };
  } catch (error) {
    console.error('[fetchPlaylistVideoIds] Error:', error);
    return {
      videoIds: [],
      error: {
        influencerId: '',
        influencerName: '',
        error: error instanceof Error ? error.message : 'Network error',
        type: 'network'
      }
    };
  }
}

// Parse ISO 8601 duration to seconds
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Format duration seconds to readable string (MM:SS or HH:MM:SS)
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Determine if video is Short based on URL or duration
export function determineVideoType(videoId: string, durationSeconds: number): 'Long' | 'Short' {
  // Shorts are typically under 60 seconds
  if (durationSeconds <= 60) {
    return 'Short';
  }
  return 'Long';
}

// Fetch detailed video information
export async function fetchVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<{ videos: ChannelVideoData[]; error?: ChannelFetchError }> {
  console.log(`[fetchVideoDetails] Fetching details for ${videoIds.length} videos`);

  if (videoIds.length === 0) {
    return { videos: [] };
  }

  try {
    // Batch into groups of 50 (YouTube API limit)
    const batches: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      batches.push(videoIds.slice(i, i + 50));
    }

    const allVideos: ChannelVideoData[] = [];

    for (const batch of batches) {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.append('part', 'snippet,contentDetails,statistics');
      url.searchParams.append('id', batch.join(','));
      url.searchParams.append('key', apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 403) {
          return {
            videos: allVideos,
            error: {
              influencerId: '',
              influencerName: '',
              error: 'API quota exceeded',
              type: 'quota'
            }
          };
        }

        console.error(`[fetchVideoDetails] API error: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const durationSeconds = parseDuration(item.contentDetails.duration);
          const videoType = determineVideoType(item.id, durationSeconds);

          const video: ChannelVideoData = {
            videoId: item.id,
            title: item.snippet.title || 'Untitled',
            description: item.snippet.description || '',
            publishedAt: item.snippet.publishedAt,
            thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            duration: item.contentDetails.duration,
            durationSeconds,
            videoUrl: item.snippet.title.toLowerCase().includes('short') || videoType === 'Short'
              ? `https://www.youtube.com/shorts/${item.id}`
              : `https://www.youtube.com/watch?v=${item.id}`,
            views: parseInt(item.statistics?.viewCount || '0', 10),
            likes: parseInt(item.statistics?.likeCount || '0', 10),
            videoType
          };

          allVideos.push(video);
        }
      }
    }

    console.log(`[fetchVideoDetails] Retrieved ${allVideos.length} video details`);
    return { videos: allVideos };
  } catch (error) {
    console.error('[fetchVideoDetails] Error:', error);
    return {
      videos: [],
      error: {
        influencerId: '',
        influencerName: '',
        error: error instanceof Error ? error.message : 'Network error',
        type: 'network'
      }
    };
  }
}

// Main function: Fetch channel videos with smart pagination and filtering
export async function fetchInfluencerChannelVideos(
  influencerId: string,
  influencerName: string,
  channelLink: string,
  channelName: string,
  apiKey: string,
  dateRange: { startDate: string; endDate: string }
): Promise<{ videos: ChannelVideoData[]; error?: ChannelFetchError }> {
  console.log(`[fetchInfluencerChannelVideos] Starting for ${influencerName}`);

  // Extract channel ID
  const channelId = extractChannelId(channelLink);
  if (!channelId) {
    return {
      videos: [],
      error: {
        influencerId,
        influencerName,
        error: 'Invalid channel link format',
        type: 'invalid'
      }
    };
  }

  // Get uploads playlist ID
  const { playlistId, error: playlistError } = await getChannelUploadsPlaylistId(channelId, apiKey);
  if (!playlistId || playlistError) {
    return {
      videos: [],
      error: playlistError ? { ...playlistError, influencerId, influencerName } : undefined
    };
  }

  // Parse date range
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  endDate.setHours(23, 59, 59, 999); // End of day

  console.log(`[fetchInfluencerChannelVideos] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Smart pagination: Fetch videos until date range is covered
  let allVideoIds: string[] = [];
  let pageToken: string | undefined;
  let shouldContinue = true;
  let iteration = 0;
  const MAX_ITERATIONS = 10; // Safety limit

  while (shouldContinue && iteration < MAX_ITERATIONS) {
    iteration++;
    const fetchCount = iteration === 1 ? 10 : 5; // First fetch 10, then 5 at a time

    const { videoIds, nextPageToken, error: fetchError } = await fetchPlaylistVideoIds(
      playlistId,
      apiKey,
      fetchCount,
      pageToken
    );

    if (fetchError) {
      return {
        videos: [],
        error: { ...fetchError, influencerId, influencerName }
      };
    }

    if (videoIds.length === 0) {
      shouldContinue = false;
      break;
    }

    allVideoIds.push(...videoIds);
    pageToken = nextPageToken;

    // Fetch details for current batch to check dates
    const { videos: batchVideos } = await fetchVideoDetails(videoIds, apiKey);

    if (batchVideos.length === 0) {
      shouldContinue = false;
      break;
    }

    // Check if last video in batch is before start date
    const lastVideo = batchVideos[batchVideos.length - 1];
    const lastVideoDate = new Date(lastVideo.publishedAt);

    if (lastVideoDate < startDate) {
      console.log(`[fetchInfluencerChannelVideos] Last video (${lastVideoDate.toISOString()}) is before start date, stopping`);
      shouldContinue = false;
      break;
    }

    // If no more pages, stop
    if (!nextPageToken) {
      shouldContinue = false;
      break;
    }
  }

  console.log(`[fetchInfluencerChannelVideos] Collected ${allVideoIds.length} video IDs`);

  // Fetch full details for all videos
  const { videos: allVideos, error: detailsError } = await fetchVideoDetails(allVideoIds, apiKey);

  if (detailsError) {
    return {
      videos: [],
      error: { ...detailsError, influencerId, influencerName }
    };
  }

  // Filter videos by date range
  const filteredVideos = allVideos.filter((video) => {
    const videoDate = new Date(video.publishedAt);
    return videoDate >= startDate && videoDate <= endDate;
  });

  console.log(`[fetchInfluencerChannelVideos] Filtered to ${filteredVideos.length} videos in date range`);

  // Sort by published date (newest first)
  filteredVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return {
    videos: filteredVideos
  };
}

// Fetch subscriber count for a single channel using multi-strategy resolution
export async function fetchChannelSubscriberCount(
  channelLink: string,
  apiKey: string
): Promise<{ subscriberCount: number | null; error?: ChannelFetchError }> {
  console.log(`[fetchChannelSubscriberCount] Fetching subscriber count for: ${channelLink}`);

  // Extract channel ID
  const channelId = extractChannelId(channelLink);
  if (!channelId) {
    return {
      subscriberCount: null,
      error: {
        influencerId: '',
        influencerName: '',
        error: 'Invalid channel link format',
        type: 'invalid'
      }
    };
  }

  try {
    let response: Response;
    let data: any;
    let attemptNumber = 0;

    // Strategy 1: If it looks like a channel ID (UC...), try that first
    if (channelId.startsWith('UC') && channelId.length === 24) {
      attemptNumber++;
      const url = new URL('https://www.googleapis.com/youtube/v3/channels');
      url.searchParams.append('part', 'statistics');
      url.searchParams.append('id', channelId);
      url.searchParams.append('key', apiKey);
      
      console.log(`[fetchChannelSubscriberCount] Attempt ${attemptNumber}: Channel ID lookup`);
      response = await fetch(url.toString());
      data = await response.json();
      
      if (response.ok && data.items && data.items.length > 0) {
        console.log(`[fetchChannelSubscriberCount] ✓ Success via channel ID`);
        const subscriberCount = parseInt(data.items[0].statistics?.subscriberCount || '0', 10);
        console.log(`[fetchChannelSubscriberCount] Found ${subscriberCount} subscribers`);
        return { subscriberCount };
      }
      console.log(`[fetchChannelSubscriberCount] ✗ Channel ID lookup failed:`, data);
    }

    // Strategy 2: Try as @handle (for @username format)
    if (channelId.startsWith('@') || !channelId.startsWith('UC')) {
      attemptNumber++;
      const handle = channelId.startsWith('@') ? channelId.slice(1) : channelId;
      const url = new URL('https://www.googleapis.com/youtube/v3/channels');
      url.searchParams.append('part', 'statistics');
      url.searchParams.append('forHandle', handle);
      url.searchParams.append('key', apiKey);
      
      console.log(`[fetchChannelSubscriberCount] Attempt ${attemptNumber}: Handle lookup for "${handle}"`);
      response = await fetch(url.toString());
      data = await response.json();
      
      if (response.ok && data.items && data.items.length > 0) {
        console.log(`[fetchChannelSubscriberCount] ✓ Success via handle`);
        const subscriberCount = parseInt(data.items[0].statistics?.subscriberCount || '0', 10);
        console.log(`[fetchChannelSubscriberCount] Found ${subscriberCount} subscribers`);
        return { subscriberCount };
      }
      console.log(`[fetchChannelSubscriberCount] ✗ Handle lookup failed:`, data);
    }

    // Strategy 3: Try as legacy username (forUsername)
    attemptNumber++;
    const username = channelId.startsWith('@') ? channelId.slice(1) : channelId;
    const urlUsername = new URL('https://www.googleapis.com/youtube/v3/channels');
    urlUsername.searchParams.append('part', 'statistics');
    urlUsername.searchParams.append('forUsername', username);
    urlUsername.searchParams.append('key', apiKey);
    
    console.log(`[fetchChannelSubscriberCount] Attempt ${attemptNumber}: Username lookup for "${username}"`);
    response = await fetch(urlUsername.toString());
    data = await response.json();
    
    if (response.ok && data.items && data.items.length > 0) {
      console.log(`[fetchChannelSubscriberCount] ✓ Success via username`);
      const subscriberCount = parseInt(data.items[0].statistics?.subscriberCount || '0', 10);
      console.log(`[fetchChannelSubscriberCount] Found ${subscriberCount} subscribers`);
      return { subscriberCount };
    }
    console.log(`[fetchChannelSubscriberCount] ✗ Username lookup failed:`, data);

    // All strategies failed - check for specific error types
    if (response.status === 403) {
      console.error(`[fetchChannelSubscriberCount] API quota exceeded`);
      return {
        subscriberCount: null,
        error: {
          influencerId: '',
          influencerName: '',
          error: 'API quota exceeded. Please try again later.',
          type: 'quota'
        }
      };
    }

    // Generic failure after all attempts
    console.error(`[fetchChannelSubscriberCount] All lookup strategies failed for: ${channelId}`);
    console.error(`[fetchChannelSubscriberCount] Final response status: ${response.status}`);
    console.error(`[fetchChannelSubscriberCount] Final response data:`, data);
    
    return {
      subscriberCount: null,
      error: {
        influencerId: '',
        influencerName: '',
        error: `Channel not found: "${channelId}". Please verify the channel link is correct and the channel exists.`,
        type: 'invalid'
      }
    };
  } catch (error) {
    console.error('[fetchChannelSubscriberCount] Error:', error);
    return {
      subscriberCount: null,
      error: {
        influencerId: '',
        influencerName: '',
        error: error instanceof Error ? error.message : 'Network error',
        type: 'network'
      }
    };
  }
}

// Batch fetch subscriber counts for multiple channels
export async function fetchChannelSubscriberCounts(
  channelLinks: string[],
  apiKey: string,
  opts: { concurrency?: number } = {}
): Promise<Map<string, number>> {
  console.log(`[fetchChannelSubscriberCounts] Fetching subscribers for ${channelLinks.length} channels`);
  
  const results = new Map<string, number>();
  
  if (!apiKey) {
    console.error('[fetchChannelSubscriberCounts] No API key provided');
    return results;
  }

  if (!channelLinks || channelLinks.length === 0) {
    console.log('[fetchChannelSubscriberCounts] No channel links provided');
    return results;
  }

  // Process channels with concurrency control
  const concurrency = opts.concurrency || 3;
  
  for (let i = 0; i < channelLinks.length; i += concurrency) {
    const batch = channelLinks.slice(i, i + concurrency);
    
    const promises = batch.map(async (link) => {
      const { subscriberCount, error } = await fetchChannelSubscriberCount(link, apiKey);
      
      if (subscriberCount !== null) {
        results.set(link, subscriberCount);
      } else if (error) {
        console.warn(`[fetchChannelSubscriberCounts] Failed for ${link}:`, error.error);
      }
    });
    
    // Wait for current batch to complete
    await Promise.all(promises);
    
    console.log(`[fetchChannelSubscriberCounts] Progress: ${Math.min(i + concurrency, channelLinks.length)}/${channelLinks.length}`);
  }

  console.log(`[fetchChannelSubscriberCounts] Fetched subscribers for ${results.size} channels`);
  return results;
}
