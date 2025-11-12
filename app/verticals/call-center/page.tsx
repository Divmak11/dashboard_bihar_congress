"use client";

import React from 'react';
import Link from 'next/link';
import { fetchLatestCallCenterDocument, computeCallCenterOldMetricsFromSummary } from '../../utils/fetchCallCenterData';
import type { CallCenterOldMetrics } from '../../../models/callCenterTypes';

export default function CallCenterPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metrics, setMetrics] = React.useState<CallCenterOldMetrics | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const doc = await fetchLatestCallCenterDocument();
        if (!mounted) return;
        if (!doc || !doc.summary) {
          setMetrics(null);
        } else {
          const computed = computeCallCenterOldMetricsFromSummary(doc.summary, doc.date, doc.report_url);
          setMetrics(computed);
        }
      } catch (err: any) {
        console.error('[CallCenter] Failed to load summary', err);
        if (mounted) setError(err?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Call Center</h1>
        <Link href="/home" className="text-blue-600 hover:underline">Back to Home</Link>
      </div>

      {/* Parent card info */}
      <div className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">Overview</h2>
        <p className="text-sm text-gray-600">This vertical aggregates multiple call center data sources. Below is the legacy &quot;Call Center Old&quot; dataset summary.</p>
      </div>

      {/* Call Center Old card */}
      <div className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-cyan-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Call Center Old</h2>
          {metrics?.date ? (
            <span className="px-2 py-1 text-xs rounded-full bg-white/70 border border-gray-300 text-gray-700">Date: {metrics.date}</span>
          ) : null}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
        ) : !metrics ? (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">No data available. Upload and save a report to view metrics here.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Overall Conversions Done:</span>
              <span className="text-gray-900 font-bold">{metrics.conversions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Not contacted:</span>
              <span className="text-gray-900 font-bold">{metrics.notContacted}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Calls Made:</span>
              <span className="text-gray-900 font-bold">{metrics.totalCalls}</span>
            </div>
            {metrics.reportUrl ? (
              <div className="pt-2">
                <a
                  href={metrics.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg shadow hover:bg-cyan-700 transition font-semibold text-sm"
                >
                  View PDF Report
                </a>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
