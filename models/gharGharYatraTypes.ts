/**
 * TypeScript interfaces for Ghar-Ghar Yatra Analytics module
 */

/**
 * Summary object stored in main ghar_ghar_yatra document
 */
export interface GharGharYatraSummary {
  total_param2_values: number;
  matched_count: number;
  unidentifiable_count: number;
  incorrect_count: number;
  no_match_count: number;
  
  // New pre-calculated aggregate fields (optional for backward compatibility)
  total_punches?: number;
  total_unique_entries?: number;
  total_double_entries?: number;
  total_triple_and_more_entries?: number;
  numbers_without_param2?: number;

  // Extended fields per new Summary schema (optional to support mixed-era docs)
  less_than_equal_3_digits_count?: number;
  matched_double_entries?: number;
  matched_total_punches?: number;
  matched_triple_and_more_entries?: number;
  matched_unique_entries?: number;
  members_over_15_punches?: number;
  members_under_5_punches?: number;
  total_incorrect_entries?: number;
  total_unmatched?: number; // same semantics as no_match_count
  unmatched_total_punches?: number;
}

/**
 * Main document structure from ghar_ghar_yatra collection
 * Document ID is the date in YYYY-MM-DD format
 */
export interface GharGharYatraDocument {
  uploaded_by: string;
  upload_date: any; // Firestore Timestamp
  summary: GharGharYatraSummary;
}

/**
 * SLP data document from slp_data sub-collection
 * Path: ghar_ghar_yatra/{date}/slp_data/{slp_id}
 */
export interface SLPDataDocument {
  totalPunches: number;
  uniquePunches: number;
  doubleEntries: number;
  tripleEntries: number;
  slpId: string;
  slpPhoneNumber: string;
  // New in latest schema: assembly of the member for this slp_data record
  assembly?: string;
}

/**
 * SLP data document with associated date (YYYY-MM-DD)
 * Used for overview aggregation and charting to avoid approximations
 */
export interface SLPDataWithDate extends SLPDataDocument {
  date: string;
}

/**
 * SLP metadata fetched from wtm-slp collection
 */
export interface SLPMetadata {
  name: string;
  assembly: string;
  phoneNumber: string;
}

/**
 * Merged SLP data with metadata for display
 */
export interface SLPWithMetadata extends SLPDataDocument {
  slpName: string;
  assembly: string;
  performanceBadge: 'High' | 'Low';
}

/**
 * Aggregated statistics per SLP across date range
 */
export interface SLPAggregatedStats {
  slpId: string;
  slpName: string;
  assembly: string;
  totalPunches: number;
  avgPunchesPerDay: number;
  daysActive: number;
  performanceCategory: 'High' | 'Low';
}

/**
 * Aggregated metrics for overview cards
 */
export interface AggregatedMetrics {
  // Total Activity Card
  totalPunches: number;
  totalUniquePunches: number;
  totalDoubleEntries: number;
  totalTripleEntries: number;
  
  // SLP Performance Card
  highPerformersCount: number;
  lowPerformersCount: number;
  avgPunchesPerSlpPerDay: number;
  
  // Data Quality Card
  totalMatched: number;
  totalUnidentifiable: number;
  totalIncorrect: number;
  totalNoMatch: number;
  matchRatePercentage: number;
  
  // Coverage Card
  totalDatesWithData: number;
  totalUniqueSLPs: number;
  avgSLPsPerDay: number;
}

/**
 * Chart data point for daily trend chart
 */
export interface DailyTrendDataPoint {
  date: string;
  totalPunches: number;
  formattedDate: string; // For display (e.g., "14 Jan")
}

/**
 * Chart data point for top SLPs bar chart
 */
export interface TopSLPDataPoint {
  slpName: string;
  totalPunches: number;
  assembly: string;
}

/**
 * Chart data point for data quality pie chart
 */
export interface DataQualityDataPoint {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * Chart data point for calling patterns stacked bar chart
 */
export interface CallingPatternDataPoint {
  date: string;
  uniqueCalls: number;
  doubleCalls: number;
  tripleCalls: number;
  formattedDate: string;
}

/**
 * Complete chart data structure
 */
export interface ChartData {
  dailyTrend: DailyTrendDataPoint[];
  topSLPs: TopSLPDataPoint[];
  dataQuality: DataQualityDataPoint[];
  callingPatterns: CallingPatternDataPoint[];
}

/**
 * Date range for filtering
 */
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Complete data structure for overview page
 */
export interface OverviewData {
  metrics: AggregatedMetrics;
  charts: ChartData;
  loading: boolean;
  error: string | null;
}

/**
 * Data structure for individual SLP view
 */
export interface IndividualSLPViewData {
  date: string; // YYYY-MM-DD
  slpList: SLPWithMetadata[];
  loading: boolean;
  error: string | null;
}

/**
 * PDF report data structure
 */
export interface PDFReportData {
  reportTitle: string;
  dateRange: DateRange;
  generatedAt: string;
  executiveSummary: {
    totalReports: number;
    totalPunches: number;
    uniqueSLPs: number;
    avgPunchesPerDay: number;
    matchRate: number;
  };
  performanceMetrics: {
    highPerformersCount: number;
    lowPerformersCount: number;
    topPerformers: TopSLPDataPoint[];
    dataQualityBreakdown: DataQualityDataPoint[];
  };
  detailedData?: SLPWithMetadata[]; // For single date reports
  trends?: ChartData; // For date range reports
}

/**
 * CSV export data structure
 */
export interface CSVExportData {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

/**
 * Other data document from other_data sub-collection
 * Path: ghar_ghar_yatra/{date}/other_data/{doc_id}
 * Doc IDs: 'unmatched-{digits}' or 'incorrect-{digits}'
 */
export interface OtherDataDocument {
  totalPunches: number;
  uniquePunches: number;
  doubleEntries: number;
  tripleEntries: number;
  slpPhoneNumber: string;
  entryType?: 'unmatched' | 'incorrect'; // Derived from doc ID
}

/**
 * Pagination state for other_data queries
 */
export interface PaginationState {
  hasMore: boolean;
  lastVisible: any; // Firestore DocumentSnapshot
  currentPage: number;
  totalFetched: number;
}

/**
 * Data structure for unidentified entries view
 */
export interface UnidentifiedEntriesViewData {
  date: string; // YYYY-MM-DD
  entries: OtherDataDocument[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  filterType: 'all' | 'unmatched' | 'incorrect';
  searchTerm: string;
}
