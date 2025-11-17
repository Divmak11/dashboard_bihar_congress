/**
 * Check-In Data Types
 * Data structure for user check-in tracking
 */

/**
 * Daily check-in count for a specific date
 */
export interface DailyCount {
  date: string; // Format: YYYY-MM-DD
  count: number;
}

/**
 * User check-in data with daily counts
 */
export interface UserCheckin {
  user_id: string; // Phone number
  name: string;
  totalCount: number;
  dailyCounts: DailyCount[];
}

/**
 * Summary metrics for check-in data home card
 */
export interface CheckinHomeSummary {
  totalUsers: number;
  totalCheckins: number;
  activeUsersLastWeek: number;
}
