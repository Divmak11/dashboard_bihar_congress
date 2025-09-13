// YouTube Data Fetching Functions
// Implements all Firestore operations for YouTube vertical

import {
  collection,
  query,
  where,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  orderBy,
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import {
  YoutubeInfluencerDoc,
  YoutubeCampaignDoc,
  YoutubeSummaryMetrics,
  YoutubeInfluencerStatus,
  YoutubeInfluencerWorkingStatus,
  ThemeAggregateMetrics,
  InfluencerAggregateMetrics,
  OverviewAggregates,
  YoutubeVideoType,
  YoutubeDateMode,
  YoutubeFilterOptions
} from '../../models/youtubeTypes';
import { homePageCache, CACHE_KEYS } from './cacheUtils';

// Clear all caches (called by Refresh button)
export function clearYoutubeCache(): void {
  console.log('[fetchYoutubeData] Clearing YouTube cache');
  homePageCache.delete(CACHE_KEYS.YOUTUBE_SUMMARY);
}

// Fetch summary metrics for home card with persistent caching
export async function fetchYoutubeSummary(forceRefresh?: boolean): Promise<YoutubeSummaryMetrics> {
  console.log('[fetchYoutubeSummary] Starting');
  
  if (forceRefresh) {
    console.log('[fetchYoutubeSummary] Force refresh requested - clearing cache');
    homePageCache.delete(CACHE_KEYS.YOUTUBE_SUMMARY);
  }

  return homePageCache.getOrSet(CACHE_KEYS.YOUTUBE_SUMMARY, async () => {
    console.log('[fetchYoutubeSummary] Cache miss - fetching fresh data');
    return fetchYoutubeSummaryData();
  });
}

/**
 * Internal function to fetch YouTube summary data from Firestore
 * @returns Promise resolving to YouTube summary metrics
 */
async function fetchYoutubeSummaryData(): Promise<YoutubeSummaryMetrics> {
  try {
    const youtubeCollection = collection(db, 'youtube');
    
    // Fetch all documents in parallel
    const [influencersQuery, themesQuery] = await Promise.all([
      getDocs(query(youtubeCollection, where('form_type', '==', 'influencer-data'))),
      getDocs(query(youtubeCollection, where('form_type', '==', 'theme-data')))
    ]);

    const totalInfluencers = influencersQuery.size;
    const totalThemes = themesQuery.size;
    
    // Calculate total videos from all themes
    let totalVideos = 0;
    themesQuery.forEach((doc) => {
      const theme = doc.data() as YoutubeCampaignDoc;
      if (theme.influencerEntries && Array.isArray(theme.influencerEntries)) {
        totalVideos += theme.influencerEntries.length;
      }
    });

    const summary: YoutubeSummaryMetrics = {
      totalThemes,
      totalInfluencers,
      totalVideos
    };

    console.log('[fetchYoutubeSummaryData] Fresh data fetched:', summary);
    return summary;
  } catch (error) {
    console.error('[fetchYoutubeSummaryData] Error:', error);
    return { totalThemes: 0, totalInfluencers: 0, totalVideos: 0 };
  }
}

// Fetch influencers with filters
export async function fetchInfluencers(opts: YoutubeFilterOptions = {}): Promise<YoutubeInfluencerDoc[]> {
  console.log('[fetchInfluencers] Starting with options:', opts);
  
  try {
    const youtubeCollection = collection(db, 'youtube');
    let q = query(youtubeCollection, where('form_type', '==', 'influencer-data'));

    // Apply status filter
    if (opts.status && opts.status.length > 0) {
      q = query(q, where('status', 'in', opts.status));
    }

    // Apply working status filter
    if (opts.workingStatus && opts.workingStatus.length > 0) {
      q = query(q, where('workingStatus', 'in', opts.workingStatus));
    }

    // Apply assembly filter
    if (opts.assembly && opts.assembly.length > 0) {
      q = query(q, where('assembly', 'in', opts.assembly));
    }

    // Apply ordering and limit
    q = query(q, orderBy('createdAt', 'desc'));
    if (opts.limit) {
      q = query(q, firestoreLimit(opts.limit));
    }

    const snapshot = await getDocs(q);
    const influencers: YoutubeInfluencerDoc[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as YoutubeInfluencerDoc;
      const influencer = { ...data, id: doc.id };
      
      // Apply client-side search filter
      if (opts.search) {
        const searchLower = opts.search.toLowerCase();
        const matchesSearch = 
          influencer.name?.toLowerCase().includes(searchLower) ||
          influencer.phoneNumber?.includes(searchLower) ||
          influencer.channelName?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return;
      }

      influencers.push(influencer);
    });

    console.log(`[fetchInfluencers] Found ${influencers.length} influencers`);
    return influencers;
  } catch (error) {
    console.error('[fetchInfluencers] Error:', error);
    return [];
  }
}

// Fetch themes/campaigns with filters
export async function fetchThemes(opts: YoutubeFilterOptions = {}): Promise<YoutubeCampaignDoc[]> {
  console.log('[fetchThemes] Starting with options:', opts);
  
  try {
    const youtubeCollection = collection(db, 'youtube');
    let q = query(youtubeCollection, where('form_type', '==', 'theme-data'));

    // Apply ordering
    q = query(q, orderBy('from', 'desc'));

    const snapshot = await getDocs(q);
    const themes: YoutubeCampaignDoc[] = [];
    const now = Date.now();

    snapshot.forEach((doc) => {
      const data = doc.data() as YoutubeCampaignDoc;
      const theme = { ...data, id: doc.id };

      // Apply date filtering based on mode
      if (opts.dateMode === 'entries' && opts.startDate && opts.endDate) {
        // Filter by createdAt (when entry was created)
        if (theme.createdAt < opts.startDate || theme.createdAt > opts.endDate) {
          return;
        }
      } else if (opts.dateMode === 'campaign' && opts.startDate && opts.endDate) {
        // Filter by campaign window overlap
        const overlaps = theme.from <= opts.endDate && theme.to >= opts.startDate;
        if (!overlaps) return;
      }

      // Apply active/past filter
      if (opts.activeOnly && theme.to < now) return;
      if (opts.pastOnly && theme.to >= now) return;

      // Apply client-side search filter
      if (opts.search) {
        const searchLower = opts.search.toLowerCase();
        if (!theme.weeklyTheme?.toLowerCase().includes(searchLower)) {
          return;
        }
      }

      themes.push(theme);
    });

    console.log(`[fetchThemes] Found ${themes.length} themes`);
    return themes;
  } catch (error) {
    console.error('[fetchThemes] Error:', error);
    return [];
  }
}

// Split themes by active/past status
export function splitThemesByStatus(
  themes: YoutubeCampaignDoc[],
  todayMs: number = Date.now()
): { active: YoutubeCampaignDoc[]; past: YoutubeCampaignDoc[] } {
  const active: YoutubeCampaignDoc[] = [];
  const past: YoutubeCampaignDoc[] = [];

  themes.forEach(theme => {
    if (theme.to >= todayMs) {
      active.push(theme);
    } else {
      past.push(theme);
    }
  });

  console.log(`[splitThemesByStatus] Active: ${active.length}, Past: ${past.length}`);
  return { active, past };
}

// Aggregate metrics for a theme
export function aggregateTheme(
  theme: YoutubeCampaignDoc,
  stats: Map<string, { views: number; likes: number }>
): ThemeAggregateMetrics {
  const totals = {
    videos: 0,
    views: 0,
    likes: 0,
    assignedInfluencers: theme.influencerIds?.length || 0,
    activeInfluencers: 0
  };

  const perInfluencer: Map<string, any> = new Map();
  const byType: Record<YoutubeVideoType, any> = {
    'Package': { videos: 0, views: 0, likes: 0 },
    'Public Opinion One': { videos: 0, views: 0, likes: 0 },
    'Public Opinion Two': { videos: 0, views: 0, likes: 0 },
    'Reel/Short': { videos: 0, views: 0, likes: 0 }
  };

  // Process each video entry
  if (theme.influencerEntries && Array.isArray(theme.influencerEntries)) {
    theme.influencerEntries.forEach(entry => {
      const videoStats = stats.get(entry.videoLink) || entry.metrics || { views: 0, likes: 0 };
      
      totals.videos++;
      totals.views += videoStats.views || 0;
      totals.likes += videoStats.likes || 0;

      // Per influencer aggregation
      if (!perInfluencer.has(entry.influencerId)) {
        perInfluencer.set(entry.influencerId, {
          influencerId: entry.influencerId,
          videos: 0,
          views: 0,
          likes: 0
        });
      }
      const inf = perInfluencer.get(entry.influencerId);
      inf.videos++;
      inf.views += videoStats.views || 0;
      inf.likes += videoStats.likes || 0;

      // By type aggregation
      if (byType[entry.videoType]) {
        byType[entry.videoType].videos++;
        byType[entry.videoType].views += videoStats.views || 0;
        byType[entry.videoType].likes += videoStats.likes || 0;
      }
    });
  }

  totals.activeInfluencers = perInfluencer.size;

  return {
    totals,
    perInfluencer: Array.from(perInfluencer.values()),
    byType
  };
}

// Aggregate metrics for an influencer across themes
export function aggregateInfluencer(
  influencerId: string,
  themes: YoutubeCampaignDoc[],
  stats: Map<string, { views: number; likes: number }>
): InfluencerAggregateMetrics {
  let totalVideos = 0;
  let totalViews = 0;
  let totalLikes = 0;
  const perTheme: Array<any> = [];

  themes.forEach(theme => {
    let themeVideos = 0;
    let themeViews = 0;
    let themeLikes = 0;

    if (theme.influencerEntries && Array.isArray(theme.influencerEntries)) {
      theme.influencerEntries.forEach(entry => {
        if (entry.influencerId === influencerId) {
          const videoStats = stats.get(entry.videoLink) || entry.metrics || { views: 0, likes: 0 };
          themeVideos++;
          themeViews += videoStats.views || 0;
          themeLikes += videoStats.likes || 0;
        }
      });
    }

    if (themeVideos > 0) {
      perTheme.push({
        themeId: theme.id,
        themeName: theme.weeklyTheme,
        videos: themeVideos,
        views: themeViews,
        likes: themeLikes
      });
      totalVideos += themeVideos;
      totalViews += themeViews;
      totalLikes += themeLikes;
    }
  });

  return {
    videos: totalVideos,
    views: totalViews,
    likes: totalLikes,
    themes: perTheme.length,
    avgViewsPerVideo: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
    perTheme
  };
}

// Compute overview aggregates for dashboard
export function computeOverviewAggregates(args: {
  influencers: YoutubeInfluencerDoc[];
  themes: YoutubeCampaignDoc[];
  videoStats: Map<string, { views: number; likes: number }>;
}): OverviewAggregates {
  const { influencers, themes, videoStats } = args;
  const now = Date.now();

  // Calculate KPIs
  const activeThemes = themes.filter(t => t.to >= now).length;
  const activeInfluencers = influencers.filter(
    i => i.status === 'Active' && i.workingStatus === 'Working'
  ).length;

  let totalVideos = 0;
  let totalViews = 0;
  let totalLikes = 0;
  const videoTypeCount: Map<YoutubeVideoType, number> = new Map();
  const influencerViews: Map<string, number> = new Map();
  const themeVideos: Map<string, number> = new Map();
  const dailyViews: Map<string, number> = new Map();

  // Process all themes
  themes.forEach(theme => {
    if (theme.influencerEntries && Array.isArray(theme.influencerEntries)) {
      themeVideos.set(theme.weeklyTheme, theme.influencerEntries.length);
      
      theme.influencerEntries.forEach(entry => {
        const stats = videoStats.get(entry.videoLink) || entry.metrics || { views: 0, likes: 0 };
        totalVideos++;
        totalViews += stats.views || 0;
        totalLikes += stats.likes || 0;

        // Video type distribution
        const currentCount = videoTypeCount.get(entry.videoType) || 0;
        videoTypeCount.set(entry.videoType, currentCount + 1);

        // Influencer views aggregation
        const currentViews = influencerViews.get(entry.influencerId) || 0;
        influencerViews.set(entry.influencerId, currentViews + (stats.views || 0));

        // Daily views trend (using theme's createdAt)
        const date = new Date(theme.createdAt).toISOString().split('T')[0];
        const dayViews = dailyViews.get(date) || 0;
        dailyViews.set(date, dayViews + (stats.views || 0));
      });
    }
  });

  // Prepare chart data
  const videoTypeDistribution = Array.from(videoTypeCount.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: totalVideos > 0 ? Math.round((count / totalVideos) * 100) : 0
  }));

  // Get top influencers by views
  const influencerViewsArray = Array.from(influencerViews.entries())
    .map(([id, views]) => {
      const influencer = influencers.find(i => i.id === id);
      return { name: influencer?.name || 'Unknown', views };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Get themes by videos
  const themesByVideos = Array.from(themeVideos.entries())
    .map(([theme, videos]) => ({ theme, videos }))
    .sort((a, b) => b.videos - a.videos)
    .slice(0, 10);

  // Get views trend (last 30 days)
  const viewsTrend = Array.from(dailyViews.entries())
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  // Get top lists
  const topInfluencers = Array.from(influencerViews.entries())
    .map(([id, views]) => {
      const influencer = influencers.find(i => i.id === id);
      const videos = themes.reduce((count, theme) => {
        return count + (theme.influencerEntries?.filter(e => e.influencerId === id).length || 0);
      }, 0);
      return {
        id,
        name: influencer?.name || 'Unknown',
        views,
        videos
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const topThemes = themes
    .map(theme => {
      const themeMetrics = aggregateTheme(theme, videoStats);
      return {
        id: theme.id,
        name: theme.weeklyTheme,
        views: themeMetrics.totals.views,
        videos: themeMetrics.totals.videos
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return {
    kpis: {
      totalThemes: themes.length,
      activeThemes,
      totalVideos,
      totalInfluencers: influencers.length,
      activeInfluencers,
      totalViews,
      totalLikes,
      avgViewsPerVideo: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0
    },
    charts: {
      videoTypeDistribution,
      topInfluencersByViews: influencerViewsArray,
      themesByVideos,
      viewsTrend
    },
    topLists: {
      topInfluencers,
      topThemes
    }
  };
}
