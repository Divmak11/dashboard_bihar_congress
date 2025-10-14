"use client";

import React, { useMemo, useState } from "react";

export type UserSplitType = "cumulative" | "day" | "month";

interface UserReportOptionsModalProps {
  isOpen: boolean;
  daysInRange: number;
  onClose: () => void;
  onConfirm: (split: UserSplitType) => void;
}

const UserReportOptionsModal: React.FC<UserReportOptionsModalProps> = ({ isOpen, daysInRange, onClose, onConfirm }) => {
  const [split, setSplit] = useState<UserSplitType>("cumulative");

  const canDaySplit = useMemo(() => daysInRange > 1, [daysInRange]);
  const canMonthSplit = useMemo(() => daysInRange >= 31, [daysInRange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Report Options</h2>
              <p className="text-sm text-gray-500 dark:text-gray-300">Choose how to split the selected date range</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">✕</button>
          </div>

          {/* Split Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Split Type</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className={`inline-flex items-center gap-2`}>
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
            <button onClick={() => onConfirm(split)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Generate</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserReportOptionsModal;
