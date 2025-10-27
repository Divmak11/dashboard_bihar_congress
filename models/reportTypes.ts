// Report Generation Module - Data Models and Interfaces

export type ReportFormat = 'ac-wise' | 'zone-wise';

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
    acVideos?: number;
    slpVideos?: number;
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
    acVideos?: number;
    slpVideos?: number;
    clubs: number;
    forms: number;
    assemblyWaGroups: number;
    centralWaGroups: number;
    // Optional nukkad metrics propagated from aggregation for summary computation
    nukkadAc?: number;
    nukkadSlp?: number;
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

// New types for AC-wise performance report
export interface ACPerformanceSections {
  greenZone: ACWithAssemblies[];
  orangeZone: ACWithAssemblies[];
  redZone: ACWithAssemblies[];
  unavailable: ACWithAssemblies[];
}

// New types for Zone-wise performance report
export interface ZoneWithPerformanceSections {
  zoneNumber: number;
  zoneName: string;
  zoneIncharge: string;
  acPerformanceSections: ACPerformanceSections;
}

export interface ZoneWisePerformanceSections {
  zones: ZoneWithPerformanceSections[];
}

export interface ACWithAssemblies {
  acId: string;
  acName: string;
  zoneNumber: number;
  zoneName: string;
  zoneIncharge: string;
  primaryPerformanceLevel: 'high' | 'moderate' | 'poor' | 'unavailable';
  totalAssemblies: number;
  workedAssemblies: number;
  assemblies: ACAssemblyRow[];
}

export interface ACAssemblyRow {
  assembly: string;
  meetings: number;
  onboarded: number;
  slps: number;
  forms: number;
  videos: number;
  waGroups: number;
  // Display-only derived metric: per-AC per-assembly total nukkads = nukkadAc (AC) + nukkadSlp (assembly-level)
  totalNukkads?: number;
  // Color grading flags
  includeInColorGrading: boolean;
  shouldBeRed?: boolean;
  isUnavailable?: boolean;
  workStatus?: string;
  // Color based on meetings count and flags
  rowColor: 'high' | 'moderate' | 'poor' | 'white';
}

export interface ReportData {
  header: ReportHeader;
  summary: ExecutiveSummary;
  zones: ZoneData[];
  acPerformanceSections?: ACPerformanceSections;
  detailedActivities?: any[];
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
