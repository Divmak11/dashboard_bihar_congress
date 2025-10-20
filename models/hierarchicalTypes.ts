// models/hierarchicalTypes.ts
// Type definitions for the Hierarchical WTM-SLP Dashboard.
// These are initial placeholders and will be expanded in later milestones.

export interface Zone {
  id: string;
  name: string; // Display name: "Zone - {zoneName}"
  assemblies: string[];
  /** Vertical this zone belongs to (e.g., 'wtm' or 'shakti-abhiyaan'). */
  parentVertical?: string;
  /** Raw zone name from admin-users.zoneName */
  zoneName?: string;
  /** Zonal incharge name from admin-users.name */
  inchargeName?: string;
}

export interface AC {
  uid: string;
  name: string;
  assembly: string;
  handler_id?: string;
  isShaktiAC?: boolean;
}

export interface SLP {
  uid: string;
  name: string;
  assembly: string;
  role: 'SLP' | 'ASLP';
  handler_id?: string;
  independent?: boolean;
  isShaktiSLP?: boolean;
  shaktiId?: string;
}

export type MetricKey =
  | 'meetings'
  | 'volunteers'
  | 'slps'
  | 'saathi'
  | 'shaktiLeaders'
  | 'shaktiSaathi'
  | 'clubs'
  | 'shaktiClubs'
  | 'forms'
  | 'shaktiForms'
  | 'videos'
  | 'acVideos'
  | 'nukkadAc'
  | 'nukkadSlp'
  | 'chaupals'
  | 'centralWaGroups'
  | 'assemblyWaGroups'
  | 'shaktiAssemblyWaGroups'
  | 'shaktiBaithaks'
  | 'shaktiVideos';

export type MetricRecord = Record<MetricKey, number | string>;

export interface CumulativeMetrics extends MetricRecord {
  meetings: number | string;
  volunteers: number | string;
  slps: number | string;
  saathi: number | string;
  shaktiLeaders: number | string;
  shaktiSaathi: number | string;
  clubs: number | string;
  shaktiClubs: number | string;
  forms: number | string;
  shaktiForms: number | string;
  videos: number | string;
  shaktiVideos: number | string;
  acVideos: number | string;
  nukkadAc: number | string;
  nukkadSlp: number | string;
  chaupals: number | string;
  shaktiBaithaks: number | string;
  centralWaGroups: number | string;
  assemblyWaGroups: number | string;
  shaktiAssemblyWaGroups: number | string;
}

export interface DetailedData {
  // Placeholder for detailed list/table data
  // To be defined per metric in later milestones
  [key: string]: unknown;
}

export interface HierarchicalState {
  selectedZone: Zone | null;
  selectedAssembly: string | null;
  selectedAC: AC | null;
  selectedSLP: SLP | null;

  zones: Zone[];
  assemblies: string[];
  acs: AC[];
  slps: SLP[];

  cumulativeData: CumulativeMetrics;
  detailedData: DetailedData | null;
  selectedCard: string | null;

  loading: {
    zones: boolean;
    assemblies: boolean;
    acs: boolean;
    slps: boolean;
    data: boolean;
  };

  dateRange: {
    startDate: string;
    endDate: string;
    option: string;
  };
}

export interface CacheEntry<T> {
  data: T;
  fetchedAt: number; // epoch ms
}

export interface CacheStructure {
  zoneData: Map<string, CacheEntry<CumulativeMetrics>>;
  assemblyData: Map<string, CacheEntry<CumulativeMetrics>>;
  acData: Map<string, CacheEntry<CumulativeMetrics>>;
  slpData: Map<string, CacheEntry<CumulativeMetrics>>;
  cacheExpiryMs: number; // e.g., 300_000 (5 min)
}

// END OF TYPE DEFINITIONS
 
// Pagination & Search Types (for Detailed Views)
export interface PageCursor {
  // The primary order field value to resume after (e.g., createdAt, date_submitted)
  lastOrderValue?: string | number;
  // Optional secondary tiebreaker: last document ID
  lastDocId?: string;
  // Optional per-stream cursors when multiple queries are merged
  streamCursors?: Array<{
    key: string; // stream identifier (e.g., 'form_type', 'type', 'assembly:chunk:0', 'handler:uid')
    lastOrderValue?: string | number;
    lastDocId?: string;
  }>;
}

export interface SearchOptions {
  term: string;
  // Optional explicit field to search; if omitted, use per-metric defaults
  field?: string;
}

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: PageCursor;
}
