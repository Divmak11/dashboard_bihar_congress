'use client';

import React from 'react';
import { AggregatedMetrics } from '../../models/gharGharYatraTypes';

interface MetricsCardsProps {
  metrics: AggregatedMetrics;
  loading: boolean;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Card 1: Total Activity */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Activity</h3>
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalPunches.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Punches</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">{metrics.totalUniquePunches.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Unique</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{metrics.totalDoubleEntries.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Double</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{metrics.totalTripleEntries.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Triple</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: SLP Performance */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">SLP Performance</h3>
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgPunchesPerSlpPerDay.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Avg Punches/SLP/Day</p>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">High Performers (&gt;10)</span>
              <span className="text-sm font-semibold text-green-600">{metrics.highPerformersCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ 
                  width: `${(metrics.highPerformersCount / (metrics.highPerformersCount + metrics.lowPerformersCount)) * 100}%` 
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">Low Performers (≤10)</span>
              <span className="text-sm font-semibold text-orange-600">{metrics.lowPerformersCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Data Quality */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Data Quality</h3>
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">{metrics.matchRatePercentage.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Match Rate</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-600 mb-1">Matched</p>
              <p className="text-sm font-semibold text-green-600">{metrics.totalMatched.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Unidentifiable</p>
              <p className="text-sm font-semibold text-yellow-600">{metrics.totalUnidentifiable.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Incorrect</p>
              <p className="text-sm font-semibold text-orange-600">{metrics.totalIncorrect.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">No Match</p>
              <p className="text-sm font-semibold text-red-600">{metrics.totalNoMatch.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Coverage */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Coverage</h3>
          <div className="p-2 bg-indigo-100 rounded-lg">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalDatesWithData}</p>
            <p className="text-xs text-gray-500">Days with Data</p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">{metrics.totalUniqueSLPs}</p>
              <p className="text-xs text-gray-500">Unique SLPs</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{metrics.avgSLPsPerDay.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Avg SLPs/Day</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsCards;
