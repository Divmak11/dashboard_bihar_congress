"use client";

import React from 'react';

// Helper for date filter options
const DATE_FILTERS = [
  { label: "All Time", value: "all" },
  { label: "Last Day", value: "lastDay" },
  { label: "Last Week", value: "lastWeek" },
  { label: "Last 3 Months", value: "last3Months" },
  { label: "Custom Range", value: "custom" },
];

// Helper function to format date in local timezone as YYYY-MM-DD
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(option: string) {
  const now = new Date();
  
  let start: Date | null = null;
  let end: Date | null = null;

  switch (option) {
    case "lastDay":
      // Yesterday only (T-1)
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start.setHours(0, 0, 0, 0); // Start of yesterday
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end.setHours(23, 59, 59, 999); // End of yesterday
      break;
    case "lastWeek":
      // Last 7 days (T-7 to T-1)
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      start.setHours(0, 0, 0, 0); // Start of day 7 days ago
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end.setHours(23, 59, 59, 999); // End of yesterday
      break;
    case "last3Months":
      // Last 3 months ending yesterday
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end.setHours(23, 59, 59, 999); // End of yesterday
      break;
    case "all":
      start = null;
      end = null;
      break;
    case "custom":
    default:
      return null; // Let custom range be handled manually
  }

  const result = {
    startDate: start ? formatLocalDate(start) : "",
    endDate: end ? formatLocalDate(end) : "",
  };
  
  console.log(`[DateRangeFilter] getDateRange for "${option}":`, {
    option,
    startDate: result.startDate,
    endDate: result.endDate,
    startDateObj: start,
    endDateObj: end
  });
  
  return result;
}

interface DateRangeFilterProps {
  label: string;
  startDate: string;
  endDate: string;
  selectedOption: string;
  onDateChange: (startDate: string, endDate: string, option: string) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ label, startDate, endDate, selectedOption, onDateChange }) => {
  const [hasDateError, setHasDateError] = React.useState(false);

  const handleDateOptionChange = (option: string) => {
    setHasDateError(false); // Reset error when changing options
    if (option !== "custom") {
      const range = getDateRange(option);
      if (range) {
        onDateChange(range.startDate, range.endDate, option);
      } else {
        // For "all" option, pass empty strings
        onDateChange("", "", option);
      }
    } else {
      // For custom option, keep current dates but update option
      onDateChange(startDate, endDate, option);
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    // Validate date range
    if (start && end && new Date(start) > new Date(end)) {
      console.warn('[DateRangeFilter] Start date cannot be after end date');
      setHasDateError(true);
      return;
    }
    setHasDateError(false);
    onDateChange(start, end, "custom");
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <label className="font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{label}:</label>
      
      {/* Date Filter Dropdown */}
      <select
        value={selectedOption}
        onChange={(e) => handleDateOptionChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {DATE_FILTERS.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>

      {/* Custom Date Range Inputs */}
      {selectedOption === "custom" && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
              className={`px-2 py-1 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                hasDateError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
              className={`px-2 py-1 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                hasDateError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
            />
          </div>
          {hasDateError && (
            <div className="text-red-500 text-xs mt-1">
              Start date must be before end date
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
