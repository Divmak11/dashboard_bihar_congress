// Report Generation Module - Data Models and Interfaces

export interface ReportMetric {
  name: string;
  value: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface ACPerformance {
  id: string;
  name: string;
  assembly: string;
  meetingCount: number;
  performanceLevel: 'high' | 'moderate' | 'poor';
  metrics: {
    meetings: number;
    members: number;
    volunteers: number;
    leaders: number;
    slps: number;
    videos: number;
    clubs: number;
    forms: number;
    chaupals: number;
    assemblyWaGroups: number;
    centralWaGroups: number;
  };
}

export interface AssemblyData {
  name: string;
  totalACs: number;
  activeACs: number;
  acs: ACPerformance[];
  metrics: {
    meetings: number;
    members: number;
    volunteers: number;
    leaders: number;
    slps: number;
    videos: number;
    clubs: number;
    forms: number;
    assemblyWaGroups: number;
    centralWaGroups: number;
  };
}

export interface ZoneData {
  name: string;
  inchargeName?: string;
  assemblies: AssemblyData[];
  totalAssemblies: number;
  totalACs: number;
  activeACs: number;
  metrics: ReportMetric[];
}

export interface DetailedActivity {
  id: string;
  date: string;
  type: string;
  assembly: string;
  ac?: string;
  slp?: string;
  description?: string;
  handler_id: string;
  [key: string]: any; // For additional fields
}

export interface ReportHeader {
  title: string;
  vertical: 'wtm-slp' | 'shakti-abhiyaan';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
  generatedBy: string;
  hierarchy: {
    zone?: string;
    assembly?: string;
    ac?: string;
    slp?: string;
  };
}

export interface ExecutiveSummary {
  totalZones: number;
  totalAssemblies: number;
  totalACs: number;
  totalSLPs: number;
  activeACs: number;
  activeSLPs: number;
  keyMetrics: ReportMetric[];
  performanceSummary: {
    high: number;
    moderate: number;
    poor: number;
  };
}

export interface ReportData {
  header: ReportHeader;
  summary: ExecutiveSummary;
  zones: ZoneData[];
  detailedActivities?: {
    meetings?: DetailedActivity[];
    members?: DetailedActivity[];
    volunteers?: DetailedActivity[];
    videos?: DetailedActivity[];
    [key: string]: DetailedActivity[] | undefined;
  };
  metadata: {
    totalRecords: number;
    processingTime: number;
    dataSource: string;
  };
}

export interface ReportGenerationOptions {
  selectedZone?: string;
  selectedAssembly?: string;
  selectedAC?: string;
  selectedSLP?: string;
  includeDetails?: boolean;
  includeSlps?: boolean;
}

export interface ReportGeneratorProps {
  vertical: 'wtm-slp' | 'shakti-abhiyaan';
  dateRange: { startDate: string; endDate: string };
  selectedZone?: string;
  selectedAssembly?: string;
  selectedAC?: string;
  selectedSLP?: string;
  includeDetails?: boolean;
  includeSlps?: boolean;
}
