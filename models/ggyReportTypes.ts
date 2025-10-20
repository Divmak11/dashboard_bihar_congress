// Types specific to GGY split report generation
import { AggregatedMetrics, DateRange } from "./gharGharYatraTypes";

export type GGYReportSplitType = "cumulative" | "day" | "month";

export interface GGYReportOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  split: GGYReportSplitType;
}

export interface GGYReportSegment {
  label: string; // e.g., YYYY-MM-DD or Oct 2025
  startDate: string;
  endDate: string;
}

export interface GGYAssemblyMemberAgg {
  slpId: string;
  slpName: string;
  phoneNumber: string;
  assembly: string;
  totalPunches: number;
  uniquePunches: number;
  doubleEntries: number;
  tripleEntries: number;
}

export interface GGYAssemblyGroup {
  assembly: string;
  members: GGYAssemblyMemberAgg[];
  totalPunches?: number; // Optional: sum of all member totalPunches for this assembly
}

export interface ReportSummary {
  total_param2_values: number;
  matched_count: number;
  unidentifiable_count: number;
  incorrect_count: number;
  no_match_count: number;

  less_than_equal_3_digits_count: number;

  total_punches: number;
  total_unique_entries: number;
  total_double_entries: number;
  total_triple_and_more_entries: number;

  matched_total_punches?: number;
  matched_unique_entries?: number;
  matched_double_entries?: number;
  matched_triple_and_more_entries?: number;

  unmatched_total_punches?: number;
  members_over_15_punches?: number;
  members_under_5_punches?: number;
  total_unmatched?: number;
  total_incorrect_entries?: number;

  blank_param2_total_punches?: number;
  blank_param2_unique_count?: number;

  // Derived
  matched_percentage: number; // matched_count / total_param2_values * 100
  duplicate_calls: number; // total_double_entries + total_triple_and_more_entries
  total_calls_from_parts: number; // total_unique_entries + duplicate_calls
  missing_fields?: string[]; // list any missing optional fields we expected
}

export interface GGYZoneGroup {
  zoneId: string;
  zoneName: string;
  assembliesPerforming: GGYAssemblyGroup[]; // totalPunches >= threshold
  assembliesUnderperforming: GGYAssemblyGroup[]; // totalPunches < threshold
  threshold: number; // Default 10
}

export interface GGYSegmentData {
  segmentLabel: string;
  startDate: string;
  endDate: string;
  metrics: AggregatedMetrics;
  invalidCount: number; // from summaries (incorrect_count)
  assemblyGroups: GGYAssemblyGroup[];
  reportSummary: ReportSummary;
  zoneGroups?: GGYZoneGroup[]; // Optional: zone-wise grouping with performing/underperforming splits
}

export interface GGYReportData {
  header: {
    title: string;
    generatedAt: string;
    dateRange: DateRange;
    split: GGYReportSplitType;
  };
  overall: GGYSegmentData; // Overall summary used for summary table and optionally overall assembly-wise/invalid
  segments?: GGYSegmentData[]; // Present only for split day/month
}
