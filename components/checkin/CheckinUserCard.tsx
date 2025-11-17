/**
 * User Summary Card Component for Check-In Data
 * Displays user name, phone number, and total check-in count
 */

import React from 'react';
import { UserCheckin } from '../../models/checkinTypes';

interface CheckinUserCardProps {
  user: UserCheckin;
  onClick: () => void;
}

export default function CheckinUserCard({ user, onClick }: CheckinUserCardProps) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-blue-50 p-6 hover:shadow-2xl transition-all duration-200 cursor-pointer group"
    >
      {/* User Name Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition">
          {user.name}
        </h3>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200">
          {user.totalCount} check-ins
        </span>
      </div>

      {/* Phone Number */}
      <div className="flex items-center gap-2 text-gray-600 mb-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <span className="text-sm font-medium">{user.user_id}</span>
      </div>

      {/* Daily Check-ins Count */}
      <div className="flex items-center gap-2 text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm">{user.dailyCounts.length} days tracked</span>
      </div>

      {/* Click indicator */}
      <div className="mt-4 text-xs text-gray-500 text-center group-hover:text-blue-600 transition">
        Click to view daily details →
      </div>
    </div>
  );
}
