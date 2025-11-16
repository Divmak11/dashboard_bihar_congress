// Training Data Types - Firebase collection: training

export type TrainingFormType = 'wtm' | 'shakti-data';

export interface TrainingRecord {
  id?: string;
  zonal: string;
  assembly: string;
  assemblyCoordinator: string;
  trainingStatus: string;
  dateOfTraining: string;
  slpName: string;
  attendees: number;
  attendeesOtherThanClub: number;
  form_type: TrainingFormType;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingAssemblyItem {
  assembly: string;
  items: TrainingRecord[];
  totalAttendees: number;
  latestDate: Date | null;
  sessionCount: number;
}

export interface TrainingZoneGroup {
  zonal: string;
  assemblies: TrainingAssemblyItem[];
  totals: {
    sessions: number;
    attendees: number;
    assembliesCount: number;
  };
}

export interface TrainingDataState {
  wtmGroups: TrainingZoneGroup[];
  shaktiGroups: TrainingZoneGroup[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface TrainingTabCounts {
  wtm: number;
  shakti: number;
}

// Lightweight summary for the Home card
export interface TrainingHomeSummary {
  totalSessions: number;
  wtmSessions: number;
  shaktiSessions: number;
  totalAttendees: number;
  totalAssemblies: number;
  totalZones: number;
}
