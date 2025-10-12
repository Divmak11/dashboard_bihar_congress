"use client";

import React, { useMemo, useState } from "react";
import DateRangeFilter from "../DateRangeFilter";

export type GGYReportSplitType = "cumulative" | "day" | "month";

interface ReportOptionsModalProps {
  isOpen: boolean;
  initialStartDate: string;
  initialEndDate: string;
  onClose: () => void;
  onConfirm: (options: { startDate: string; endDate: string; split: GGYReportSplitType }) => void;
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  // Normalize to local day boundaries
  const sn = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const en = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  const ms = en.getTime() - sn.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1; // inclusive
}

const ReportOptionsModal: React.FC<ReportOptionsModalProps> = ({ isOpen, initialStartDate, initialEndDate, onClose, onConfirm }) => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [selectedOption, setSelectedOption] = useState<string>("custom");
  const [split, setSplit] = useState<GGYReportSplitType>("cumulative");

  const days = useMemo(() => diffDays(startDate, endDate), [startDate, endDate]);
  const canDaySplit = days > 1; // day-wise only if >1 day
  const canMonthSplit = days >= 31; // month-wise if >= 31 days

  const handleDateChange = (start: string, end: string, option: string) => {
    setStartDate(start);
    setEndDate(end);
    setSelectedOption(option);
    // auto-adjust split availability if needed
    if (split === "day" && !canDaySplit) setSplit("cumulative");
    if (split === "month" && !canMonthSplit) setSplit("cumulative");
  };

  const handleConfirm = () => {
    if (!startDate || !endDate) return;
    onConfirm({ startDate, endDate, split });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl sm:max-w-3xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Generate GGY Report</h2>
              <p className="text-sm text-gray-500 dark:text-gray-300">Choose date range and split type for the report</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">✕</button>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <DateRangeFilter
              label="Date Range"
              startDate={startDate}
              endDate={endDate}
              selectedOption={selectedOption}
              onDateChange={handleDateChange}
            />
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Selected range covers <span className="font-semibold">{days}</span> day(s).</div>
          </div>

          {/* Split Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Split Type</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className={`inline-flex items-center gap-2 ${!canDaySplit && split === 'day' ? 'opacity-60' : ''}`}>
                <input
                  type="radio"
                  name="split"
                  value="cumulative"
                  checked={split === "cumulative"}
                  onChange={() => setSplit("cumulative")}
                />
                <span>Cumulative</span>
              </label>
              <label className={`inline-flex items-center gap-2 ${!canDaySplit ? 'opacity-60' : ''}`}>
                <input
                  type="radio"
                  name="split"
                  value="day"
                  checked={split === "day"}
                  onChange={() => canDaySplit && setSplit("day")}
                  disabled={!canDaySplit}
                />
                <span>Day-wise</span>
              </label>
              <label className={`inline-flex items-center gap-2 ${!canMonthSplit ? 'opacity-60' : ''}`}>
                <input
                  type="radio"
                  name="split"
                  value="month"
                  checked={split === "month"}
                  onChange={() => canMonthSplit && setSplit("month")}
                  disabled={!canMonthSplit}
                />
                <span>Month-wise</span>
              </label>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div>Day-wise is enabled only if the selected range spans more than 1 day.</div>
              <div>Month-wise is enabled only if the selected range spans at least 31 days.</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 sticky bottom-0 pt-2 bg-white dark:bg-gray-800">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Generate</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportOptionsModal;
