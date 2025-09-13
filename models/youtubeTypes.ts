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
}

// Video metrics interface
export interface YoutubeVideoMetrics {
  views?: number;
  likes?: number;
}

// Campaign influencer entry interface
export interface YoutubeCampaignInfluencerEntry {
  influencerId: string;
  id: string;
  videoType: YoutubeVideoType;
  videoLink: string;
  metrics?: YoutubeVideoMetrics; // Optional, fallback when API unavailable
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
