// YouTube Vertical Data Types
// As specified in PRD Section 4: Data Models (Firestore)

// Influencer status types
export type YoutubeInfluencerStatus = 'Active' | 'Inactive';
export type YoutubeInfluencerWorkingStatus = 'Working' | 'Busy' | 'Not Working For Us';

// Video types for campaigns
export type YoutubeVideoType = 'Package' | 'Public Opinion One' | 'Public Opinion Two' | 'Reel/Short';

// Influencer document interface (form_type: 'influencer-data')
export interface YoutubeInfluencerDoc {
  id: string;
  createdAt: number; // epoch milliseconds
  handler_id: string;
  form_type: 'influencer-data';
  name: string;
  phoneNumber: string;
  subscribers: number;
  channelName: string;
  channelLink: string;
  status: YoutubeInfluencerStatus;
  workingStatus: YoutubeInfluencerWorkingStatus;
  remark?: string;
  assembly?: string; // Optional, display "--" when missing
  lastVideoId?: string; // Last fetched video ID for incremental fetching
  lastFetchedAt?: number; // Timestamp of last video fetch (epoch milliseconds)
}

// Video metrics interface (platform-agnostic)
export interface VideoMetrics {
  views?: number;
  likes?: number;
}

// Legacy alias for backward compatibility
export interface YoutubeVideoMetrics extends VideoMetrics {}

// Video platform types
export type VideoPlatform = 'youtube' | 'facebook';

// Campaign influencer entry interface
export interface YoutubeCampaignInfluencerEntry {
  influencerId: string;
  id: string;
  videoType: YoutubeVideoType;
  videoLink: string;
  metrics?: VideoMetrics; // Optional, fallback when API unavailable
}

// Campaign/Theme document interface (form_type: 'theme-data')
export interface YoutubeCampaignDoc {
  id: string;
  createdAt: number; // epoch milliseconds
  handler_id: string;
  form_type: 'theme-data';
  weeklyTheme: string;
  from: number; // campaign start date (epoch milliseconds)
  to: number; // campaign end date (epoch milliseconds)
  influencerEntries: YoutubeCampaignInfluencerEntry[];
  influencerIds: string[]; // list of assigned influencer IDs
}

// Summary metrics for home card
export interface YoutubeSummaryMetrics {
  totalThemes: number;
  totalInfluencers: number;
  totalVideos: number;
}

// Aggregated theme metrics
export interface ThemeAggregateMetrics {
  totals: {
    videos: number;
    views: number;
    likes: number;
    assignedInfluencers: number;
    activeInfluencers: number;
  };
  perInfluencer: Array<{
    influencerId: string;
    influencerName?: string;
    videos: number;
    views: number;
    likes: number;
  }>;
  byType: Record<YoutubeVideoType, {
    videos: number;
    views: number;
    likes: number;
  }>;
}

// Aggregated influencer metrics
export interface InfluencerAggregateMetrics {
  videos: number;
  views: number;
  likes: number;
  themes: number;
  avgViewsPerVideo: number;
  perTheme: Array<{
    themeId: string;
    themeName: string;
    videos: number;
    views: number;
    likes: number;
  }>;
}

// Overview page aggregate data
export interface OverviewAggregates {
  kpis: {
    totalThemes: number;
    activeThemes: number;
    totalVideos: number;
    totalInfluencers: number;
    activeInfluencers: number;
    totalViews: number;
    totalLikes: number;
    avgViewsPerVideo: number;
  };
  charts: {
    videoTypeDistribution: Array<{ type: YoutubeVideoType; count: number; percentage: number }>;
    topInfluencersByViews: Array<{ name: string; views: number }>;
    themesByVideos: Array<{ theme: string; videos: number }>;
    viewsTrend: Array<{ date: string; views: number }>;
  };
  topLists: {
    topInfluencers: Array<{ id: string; name: string; views: number; videos: number }>;
    topThemes: Array<{ id: string; name: string; views: number; videos: number }>;
  };
}

// Date filter options
export type YoutubeDateMode = 'entries' | 'campaign';

// Filter options for fetching data
export interface YoutubeFilterOptions {
  status?: YoutubeInfluencerStatus[];
  workingStatus?: YoutubeInfluencerWorkingStatus[];
  assembly?: string[];
  search?: string;
  limit?: number;
  dateMode?: YoutubeDateMode;
  startDate?: number;
  endDate?: number;
  activeOnly?: boolean;
  pastOnly?: boolean;
}

// Channel video interfaces for new feature
export interface ChannelVideoData {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string; // ISO 8601 date string
  thumbnailUrl: string;
  duration: string; // ISO 8601 duration format (PT1M30S)
  durationSeconds: number; // Duration in seconds
  videoUrl: string;
  views: number;
  likes: number;
  videoType: 'Long' | 'Short'; // Determined by URL or duration
}

export interface InfluencerVideosData {
  influencerId: string;
  influencerName: string;
  channelName: string;
  channelLink: string;
  videos: ChannelVideoData[];
  error?: string; // Error message if fetch failed
}

export interface ChannelFetchProgress {
  current: number;
  total: number;
  currentInfluencer?: string;
}

export interface ChannelFetchError {
  influencerId: string;
  influencerName: string;
  error: string;
  type: 'private' | 'deleted' | 'invalid' | 'quota' | 'network' | 'unknown';
}

// Subscriber update feature types
export interface SubscriberUpdateError {
  influencerId: string;
  influencerName: string;
  channelLink: string;
  error: string;
  type: 'invalid_link' | 'api_error' | 'firebase_error' | 'channel_not_found' | 'quota_exceeded';
}

export interface SubscriberUpdateProgress {
  current: number;
  total: number;
  currentInfluencer?: string;
  phase: 'fetching' | 'updating' | 'completed';
}

export interface SubscriberUpdateResult {
  success: number;
  failed: number;
  skipped: number;
  errors: SubscriberUpdateError[];
  updated: Array<{
    influencerId: string;
    influencerName: string;
    oldCount: number;
    newCount: number;
  }>;
}
