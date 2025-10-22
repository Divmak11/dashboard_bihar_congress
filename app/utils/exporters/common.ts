// app/utils/exporters/common.ts
// Shared utilities for XLSX exporters

/**
 * Normalizes date values from various formats to locale date string
 * Handles: epoch ms (number), Firestore Timestamp ({seconds} or .toDate()), ISO strings
 * 
 * @param row - The data row object
 * @param keys - Array of possible date field keys to try in order
 * @returns Formatted date string or empty string if no valid date found
 */
export function normalizeDate(row: any, keys: string[]): string {
  for (const key of keys) {
    const value = row?.[key];
    if (!value) continue;

    try {
      let date: Date | null = null;

      // Handle epoch milliseconds (number)
      if (typeof value === 'number') {
        date = new Date(value);
      }
      // Handle Firestore Timestamp with seconds
      else if (typeof value === 'object' && value.seconds) {
        date = new Date(value.seconds * 1000);
      }
      // Handle Firestore Timestamp with toDate method
      else if (typeof value === 'object' && typeof value.toDate === 'function') {
        date = value.toDate();
      }
      // Handle ISO string or other date string formats
      else if (typeof value === 'string') {
        date = new Date(value);
      }

      // Validate and return if we got a valid date
      if (date && !isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    } catch (error) {
      // Continue to next key if parsing fails
      continue;
    }
  }

  // Return empty string if no valid date found
  return '';
}

/**
 * Normalizes link/URL values from various formats to array of strings
 * Handles: single string, array of strings, null/undefined
 * 
 * @param input - The link value (string | string[] | null | undefined)
 * @returns Array of valid link strings (non-empty, trimmed)
 */
export function normalizeLinks(input: any): string[] {
  if (!input) return [];

  // If already an array, filter and trim
  if (Array.isArray(input)) {
    return input
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }

  // If single string, return as array
  if (typeof input === 'string' && input.trim().length > 0) {
    return [input.trim()];
  }

  return [];
}

/**
 * Joins an array of links with a delimiter (default: newline)
 * Each link appears on its own line in Excel when using newline delimiter
 * 
 * @param links - Array of link strings
 * @param delimiter - Delimiter to use (default: '\n' for newline)
 * @returns Joined string or empty string if no links
 */
export function joinLinks(links: string[], delimiter: string = '\n'): string {
  if (!links || links.length === 0) return '';
  return links.join(delimiter);
}

/**
 * Builds a standardized export filename with context
 * Format: MetricName_Context_DateRange.xlsx
 * 
 * @param metric - The metric name (e.g., 'Videos', 'Clubs', 'Forms')
 * @param context - Optional context (e.g., 'AC-Rajgir', 'Zone-1', 'Assembly-XYZ')
 * @param dateRange - Optional date range object with startDate and endDate
 * @returns Formatted filename string
 */
export function buildExportFilename(
  metric: string,
  context?: string,
  dateRange?: { startDate?: string; endDate?: string }
): string {
  const parts: string[] = [metric.replace(/\s+/g, '_')];

  if (context) {
    parts.push(context.replace(/\s+/g, '_'));
  }

  if (dateRange?.startDate && dateRange?.endDate) {
    parts.push(`${dateRange.startDate}_to_${dateRange.endDate}`);
  } else {
    // Default to current date if no range specified
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    parts.push(`AllTime_${dateStr}`);
  }

  return `${parts.join('_')}.xlsx`;
}

/**
 * Formats a local date for filename (YYYY-MM-DD)
 * Avoids UTC conversion issues
 * 
 * @param date - Date object (defaults to current date)
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatLocalDateForFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
