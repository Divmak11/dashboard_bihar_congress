// Types for Call Center vertical

export interface CallCenterSummaryTotals {
  total_rows?: number;
}

export interface CallCenterSummary {
  totals?: CallCenterSummaryTotals;
  status_counts?: Record<string, number>;
  gender_counts?: Record<string, number>;
  non_contact_reason_counts?: Record<string, number>;
  questions?: Record<string, Record<string, number>>; // Q1..Q6
  assigned_to_counts?: Record<string, number>;
  assigned_to_list?: string[];
}

export interface CallCenterDocument {
  date?: string; // YYYY-MM-DD
  summary?: CallCenterSummary;
  report_url?: string; // Public URL of PDF in Cloud Storage
  created_at?: any; // Firestore Timestamp | number
  updated_at?: any; // Firestore Timestamp | number
}

export interface CallCenterOldMetrics {
  conversions: number; // Conversation Done with Female + Conversation Done with Female via Male
  notContacted: number; // Not contacted
  totalCalls: number; // Sum of all status_counts values
  date?: string;
  reportUrl?: string;
}
