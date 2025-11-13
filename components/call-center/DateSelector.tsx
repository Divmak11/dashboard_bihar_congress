"use client";

import React from 'react';
import type { CallCenterListItem } from "../../models/callCenterTypes";
import type { DateMode } from "../../models/callCenterTypes";

export interface DateSelectorProps {
  mode: DateMode;
  selectedDate?: string;
  dates: CallCenterListItem[];
  loading?: boolean;
  hasMore?: boolean;
  onModeChange: (mode: DateMode) => void;
  onDateChange: (date: string) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
}

export function DateSelector({
  mode,
  selectedDate,
  dates,
  loading,
  hasMore,
  onModeChange,
  onDateChange,
  onRefresh,
  onLoadMore,
}: DateSelectorProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
        <button
          type="button"
          onClick={() => onModeChange('all')}
          className={`px-3 py-1.5 text-sm font-medium ${mode === 'all' ? 'bg-cyan-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          aria-pressed={mode === 'all'}
        >
          All dates (Cumulative)
        </button>
        <button
          type="button"
          onClick={() => onModeChange('single')}
          className={`px-3 py-1.5 text-sm font-medium border-l border-gray-300 ${mode === 'single' ? 'bg-cyan-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          aria-pressed={mode === 'single'}
        >
          Single date
        </button>
      </div>

      {mode === 'single' && (
        <div className="flex items-center gap-2">
          <label htmlFor="cc-date-select" className="text-sm text-gray-700">Date</label>
          <select
            id="cc-date-select"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-800"
            disabled={loading}
            value={selectedDate || ''}
            onChange={(e) => onDateChange(e.target.value)}
          >
            <option value="" disabled>
              {loading ? 'Loading dates…' : 'Select a date'}
            </option>
            {dates.map((d) => (
              <option key={d.id} value={d.date || d.id}>
                {d.date || d.id}
              </option>
            ))}
          </select>
          {onLoadMore && (
            <button
              type="button"
              disabled={loading || !hasMore}
              onClick={onLoadMore}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Load more
            </button>
          )}
        </div>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
          Refresh
        </button>
      )}
    </div>
  );
}

export default DateSelector;
