// Types for Manifesto Survey API

export type HindiYesNo = 'हाँ' | 'नहीं';

export interface ManifestoFilters {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  name?: string;
  ageMin?: string | number;
  ageMax?: string | number;
  respondentGroup?: string;
  profession?: string;
  religion?: string;
  casteCategory?: string; // Community
  subCaste?: string;
  district?: string;
  assembly?: string;
  hasProtests?: '' | HindiYesNo | string;
}

export interface ManifestoAgeGroupDatum {
  count: number;
  avgAge?: number;
}

export interface ManifestoStatistics {
  totalSurveys: number;
  respondentGroupStats?: Record<string, number>;
  districtAssembly?: Record<string, number>;
  professionStats?: Record<string, number>;
  religionStats?: Record<string, number>;
  casteCategoryStats?: Record<string, number>;
  subCasteStats?: Record<string, number>;
  ageGroupStats?: Record<string, ManifestoAgeGroupDatum | number>;
  protestStats?: Record<string, number>;
  specificProblemsStats?: Record<string, number>;
  casteIssuesStats?: Record<string, number>;
}

export interface ManifestoCasteIssueItem {
  community?: string;
  subCaste?: string;
  problem?: string;
}

export interface ManifestoSurveyItem {
  // Basic
  name?: string;
  age?: number | string;
  respondentGroup?: string;
  phoneNumber?: string;
  profession?: string | string[];
  religion?: string;
  casteCategory?: string;
  subCaste?: string;
  district?: string;
  assembly?: string;

  // Participation
  hasProtests?: HindiYesNo | string;
  protestCount?: number;
  protestDetails?: string[] | string;

  // Problems
  specificProblemsCount?: number;
  specificProblems?: string[] | string;
  casteIssuesCount?: number;
  casteIssues?: ManifestoCasteIssueItem[] | string;

  // Percentages / Aspects
  religionPercentages?: Record<string, number>;
  communityPercentages?: Record<string, number>;
  problemAspects?: Record<string, number>;

  // Timestamps
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface ManifestoReportsResponse {
  data: ManifestoSurveyItem[];
  statistics?: ManifestoStatistics;
}

export interface ManifestoPagedResult {
  data: ManifestoSurveyItem[];
  statistics?: ManifestoStatistics;
  totalSurveys: number;
}
