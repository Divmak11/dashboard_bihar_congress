'use client';

import React from 'react';

interface ReportButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  vertical: 'wtm-slp' | 'shakti-abhiyaan';
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  onClick,
  isGenerating,
  vertical
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isGenerating}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
      title="Generate PDF Report"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {isGenerating ? 'Generating...' : `Generate ${vertical === 'shakti-abhiyaan' ? 'Shakti' : 'WTM-SLP'} Report`}
    </button>
  );
};

export default ReportButton;
