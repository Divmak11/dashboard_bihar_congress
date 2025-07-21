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

function getDateRange(option: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(23, 59, 59, 999); // Set to end of today

  let start: Date | null = null;
  let end: Date | null = today;

  switch (option) {
    case "lastDay":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start.setHours(0, 0, 0, 0); // Start of yesterday
      break;
    case "lastWeek":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      start.setHours(0, 0, 0, 0); // Start of day 7 days ago
      break;
    case "last3Months":
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      start.setHours(0, 0, 0, 0);
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
    startDate: start ? start.toISOString().split('T')[0] : "",
    endDate: end ? end.toISOString().split('T')[0] : "",
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

  const handleDateOptionChange = (option: string) => {
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
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
