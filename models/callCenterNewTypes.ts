// Types for Call Center New (external) dataset
// Mirrors per-day documents with converted users list

export interface CallCenterNewConvertedRow {
  name?: string;
  phone?: string; // keep as string to preserve leading zeros and formatting
  acName?: string;
}

export interface CallCenterNewTotals {
  total_rows?: number;
}

export interface CallCenterNewSummary {
  totals?: CallCenterNewTotals;
  convertedCount?: number; // number of converted rows
  notConvertedCount?: number; // number of non-converted rows
  convertedList?: CallCenterNewConvertedRow[]; // list of converted rows for the day
}

export interface CallCenterNewDocument {
  date?: string; // YYYY-MM-DD
  summary?: CallCenterNewSummary;
  report_url?: string; // optional artifact link (if any)
  created_at?: any; // Firestore Timestamp | number
  updated_at?: any; // Firestore Timestamp | number
}

export interface CallCenterNewMetrics {
  conversions: number; // derived from convertedCount or convertedList length
  notContacted: number; // mapped from notConvertedCount
  totalCalls: number; // prefer totals.total_rows; fallback to conversions + notContacted
  date?: string;
}
