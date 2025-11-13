// Types for Migrant Survey vertical
// Mirrors the legacy ReportGeneration.js data shape but typed and modular

export type City = 'delhi' | 'jaipur';

export interface MigrantFilters {
  dateFrom?: string;
  dateTo?: string;
  volunteerName?: string;
  biharDistrict?: string;
  delhiDistrict?: string; // only for city === 'delhi'
  jaipurDistrict?: string; // only for city === 'jaipur'
  availableCommunity?: string;
}

export interface MigrantStatistics {
  totalSurveys: number;
  biharDistrictAssembly?: Record<string, number>;
  biharProblems?: Record<string, number>;
  delhiProblems?: Record<string, number>;
  jaipurProblems?: Record<string, number>;
  religion?: Record<string, number>;
  caste?: Record<string, number>;
  politicalParty?: Record<string, number>;
  volunteerStats?: Record<string, number>;
}

export interface MigrantSurveyItem {
  // Volunteer / Respondent
  volunteerName?: string;
  respondentName?: string;
  phoneNumber?: string;

  // City-specific geography
  delhiArea?: string;
  delhiDistrict?: string;
  delhiAssembly?: string;
  jaipurArea?: string;
  jaipurDistrict?: string;
  jaipurAssembly?: string;

  // Bihar geography
  biharDistrict?: string;
  biharAssembly?: string;

  // Demographics
  religion?: string;
  caste?: string;
  subCaste?: string;
  age?: number | string;
  gender?: string;
  educationLevel?: string;
  livingWith?: string;

  // Work and income
  currentWork?: string[] | string;
  otherWork?: string;
  migrationPeriod?: string;
  monthlyIncome?: string;
  moneySentHome?: string;
  otherMoneySent?: string;

  // Problems
  biharProblems?: string[] | string;
  otherBiharProblem?: string;
  delhiProblems?: string[] | string;
  otherDelhiProblem?: string;
  jaipurProblems?: string[] | string;
  otherJaipurProblem?: string;

  // Politics & migration
  politicalParty?: string;
  migrationReason?: string;
  returnMotivation?: string;

  // Community
  othersNearby?: string;
  knownPeopleCount?: string;
  knownPeopleDetails?: string;

  // Timestamps
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
}

export interface MigrantReportsResponse {
  data: MigrantSurveyItem[];
  statistics?: MigrantStatistics;
}

export interface MigrantPagedResult {
  data: MigrantSurveyItem[];
  statistics?: MigrantStatistics;
  totalSurveys: number;
}
