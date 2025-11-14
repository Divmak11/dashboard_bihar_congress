// SLP Training data types
export interface SlpTrainingRecord {
  id: string;
  name: string;
  mobile_number: string;
  assembly: string;
  status: 'trained' | 'in-progress' | 'pending';
  trainingDate: string; // YYYY-MM-DD format
  createdAt: string;
  updatedAt: string;
}

export interface SlpTrainingAssemblyGroup {
  assembly: string;
  slpCount: number;
  slps: SlpTrainingRecord[];
}

export interface SlpTrainingSummary {
  totalSlps: number;
  totalAssemblies: number;
  trainedCount: number;
  pendingCount: number;
  inProgressCount: number;
}

export interface SlpTrainingPageData {
  summary: SlpTrainingSummary;
  assemblies: SlpTrainingAssemblyGroup[];
}
