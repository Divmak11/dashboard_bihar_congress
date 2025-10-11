// Types for D2D Members List feature
// Kept separate per implementation_rules: models separate from business logic and UI

export type D2DRole = 'AC' | 'SLP' | 'Saathi';

export interface D2DMember {
  id: string; // Firestore doc id (not displayed)
  name: string;
  phoneNumber: string;
  assembly: string;
  handler_id: string; // not displayed
  role: D2DRole;
  status: string; // e.g., "Active"
  createdAt: number; // epoch ms (not displayed)
}

export interface D2DMemberMetrics {
  totalPunches: number;
  uniquePunches: number;
  doubleEntries: number;
  tripleEntries: number;
}

export interface D2DMemberWithMetrics extends D2DMember {
  metrics: D2DMemberMetrics;
}
