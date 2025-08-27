'use client';

import React from 'react';

interface ReportProgressProps {
  isOpen: boolean;
  progress: number;
  message: string;
  vertical: 'wtm-slp' | 'shakti-abhiyaan';
  dateRange: {
    startDate: string;
    endDate: string;
    label?: string;
  };
  onClose?: () => void;
}

export const ReportProgress: React.FC<ReportProgressProps> = ({
  isOpen,
  progress,
  message,
  vertical,
  dateRange,
  onClose
}) => {
  if (!isOpen) return null;

  const isComplete = progress === 100;
  const hasError = message.toLowerCase().includes('error');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Generating {vertical === 'shakti-abhiyaan' ? 'Shakti Abhiyaan' : 'WTM-SLP'} Report
        </h3>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                hasError ? 'bg-red-600' : isComplete ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Message */}
        <p className={`text-sm mb-4 ${
          hasError ? 'text-red-700' : isComplete ? 'text-green-700' : 'text-gray-700'
        }`}>
          {message}
        </p>

        {/* Date Range Info */}
        <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
          <div className="flex justify-between mb-1">
            <span>Period:</span>
            <span>{dateRange.label || 'Custom Range'}</span>
          </div>
          {dateRange.startDate && dateRange.endDate && (
            <div className="flex justify-between">
              <span>Dates:</span>
              <span>{dateRange.startDate} to {dateRange.endDate}</span>
            </div>
          )}
          <div className="flex justify-between mt-1">
            <span>Vertical:</span>
            <span>{vertical === 'shakti-abhiyaan' ? 'Shakti Abhiyaan' : 'WTM-SLP'}</span>
          </div>
        </div>

        {/* Close button (only shown when complete or error) */}
        {(isComplete || hasError) && onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportProgress;
