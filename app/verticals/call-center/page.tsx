"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  computeCallCenterOldMetricsFromSummary,
  fetchCallCenterCumulativeMetrics,
  fetchCallCenterDatesList,
  fetchCallCenterDocByDate,
} from '../../utils/fetchCallCenterData';
import {
  computeCallCenterNewMetricsFromSummary,
  fetchCallCenterNewCumulativeMetrics,
  fetchCallCenterNewDocByDate,
} from '../../utils/fetchCallCenterNewData';
import { fetchSlpIdentificationSummary } from '../../utils/fetchCallCenterSlp';
import { fetchCallCenterPurposeSummary } from '../../utils/fetchCallCenterPurposes';
import type { CallCenterListItem, CallCenterOldMetrics, DateMode } from '../../../models/callCenterTypes';
import type { CallCenterNewMetrics } from '../../../models/callCenterNewTypes';
import type { SlpIdentificationSummary } from '../../../models/callCenterSlpTypes';
import type { CallCenterPurposeSummary } from '../../../models/callCenterPurposesTypes';
import { FORM_TYPE_DISPLAY_NAMES, FORM_TYPE_COLORS } from '../../../models/callCenterPurposesTypes';
import DateSelector from '../../../components/call-center/DateSelector';
import ReportLinksModal from '../../../components/call-center/ReportLinksModal';

export default function CallCenterPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  // Selector state
  const [mode, setMode] = React.useState<DateMode>('all');
  const [selectedDate, setSelectedDate] = React.useState<string | undefined>(undefined);
  const [dates, setDates] = React.useState<CallCenterListItem[]>([]);
  const [datesLoading, setDatesLoading] = React.useState<boolean>(true);
  const [nextCursor, setNextCursor] = React.useState<any>(undefined);
  const [hasMore, setHasMore] = React.useState<boolean>(false);

  // Metrics state
  const [cumulative, setCumulative] = React.useState<CallCenterOldMetrics | null>(null);
  const [cumulativeLoading, setCumulativeLoading] = React.useState<boolean>(true);
  const [single, setSingle] = React.useState<CallCenterOldMetrics | null>(null);
  const [singleLoading, setSingleLoading] = React.useState<boolean>(false);

  // New dataset metrics state
  const [newCumulative, setNewCumulative] = React.useState<CallCenterNewMetrics | null>(null);
  const [newCumulativeLoading, setNewCumulativeLoading] = React.useState<boolean>(true);
  const [newSingle, setNewSingle] = React.useState<CallCenterNewMetrics | null>(null);
  const [newSingleLoading, setNewSingleLoading] = React.useState<boolean>(false);

  // SLP Identification metrics state
  const [slpSummary, setSlpSummary] = React.useState<SlpIdentificationSummary | null>(null);
  const [slpLoading, setSlpLoading] = React.useState<boolean>(true);

  // Call Center Purposes metrics state
  const [purposesSummary, setPurposesSummary] = React.useState<CallCenterPurposeSummary | null>(null);
  const [purposesLoading, setPurposesLoading] = React.useState<boolean>(true);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);

  // Initial load: cumulative metrics + first page of dates
  React.useEffect(() => {
    let mounted = true;
    async function init() {
      setError(null);
      setCumulativeLoading(true);
      setNewCumulativeLoading(true);
      setSlpLoading(true);
      setPurposesLoading(true);
      setDatesLoading(true);
      try {
        const [cum, newCum, slpSum, purposesSum, datesRes] = await Promise.all([
          fetchCallCenterCumulativeMetrics({ pageSize: 100 }),
          fetchCallCenterNewCumulativeMetrics({ pageSize: 100 }),
          fetchSlpIdentificationSummary(),
          fetchCallCenterPurposeSummary(),
          fetchCallCenterDatesList({ pageSize: 50 }),
        ]);
        if (!mounted) return;
        setCumulative(cum);
        setNewCumulative(newCum);
        setSlpSummary(slpSum);
        setPurposesSummary(purposesSum);
        setDates(datesRes.items);
        setNextCursor(datesRes.nextCursor);
        setHasMore(!!datesRes.nextCursor);
      } catch (e: any) {
        console.error('[CallCenter] init load failed', e);
        if (mounted) setError(e?.message || 'Failed to load data');
      } finally {
        if (mounted) {
          setCumulativeLoading(false);
          setNewCumulativeLoading(false);
          setSlpLoading(false);
          setPurposesLoading(false);
          setDatesLoading(false);
        }
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Load single-date metrics when needed
  React.useEffect(() => {
    let active = true;
    async function loadSingle(date: string) {
      setSingleLoading(true);
      setNewSingleLoading(true);
      setError(null);
      try {
        const doc = await fetchCallCenterDocByDate(date);
        const newDoc = await fetchCallCenterNewDocByDate(date);
        if (!active) return;
        if (doc && doc.summary) {
          setSingle(computeCallCenterOldMetricsFromSummary(doc.summary, doc.date, doc.report_url));
        } else {
          setSingle(null);
        }
        if (newDoc && newDoc.summary) {
          setNewSingle(computeCallCenterNewMetricsFromSummary(newDoc.summary, newDoc.date));
        } else {
          setNewSingle(null);
        }
      } catch (e: any) {
        console.error('[CallCenter] single-date load failed', e);
        if (active) setError(e?.message || 'Failed to load selected date');
      } finally {
        if (active) setSingleLoading(false);
        if (active) setNewSingleLoading(false);
      }
    }

    if (mode === 'single' && selectedDate) {
      loadSingle(selectedDate);
    } else {
      setSingle(null);
      setSingleLoading(false);
      setNewSingle(null);
      setNewSingleLoading(false);
    }

    return () => {
      active = false;
    };
  }, [mode, selectedDate]);

  const handleLoadMoreDates = React.useCallback(async () => {
    if (!hasMore || datesLoading) return;
    setDatesLoading(true);
    try {
      const res = await fetchCallCenterDatesList({ pageSize: 50, cursor: nextCursor });
      setDates((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } catch (e) {
      console.error('[CallCenter] load more dates failed', e);
    } finally {
      setDatesLoading(false);
    }
  }, [hasMore, datesLoading, nextCursor]);

  const handleRefresh = React.useCallback(async () => {
    setCumulativeLoading(true);
    setNewCumulativeLoading(true);
    setDatesLoading(true);
    try {
      const [cum, newCum, slpSum, purposesSum, datesRes] = await Promise.all([
        fetchCallCenterCumulativeMetrics({ pageSize: 100 }),
        fetchCallCenterNewCumulativeMetrics({ pageSize: 100 }),
        fetchSlpIdentificationSummary(),
        fetchCallCenterPurposeSummary(),
        fetchCallCenterDatesList({ pageSize: 50 }),
      ]);
      setCumulative(cum);
      setNewCumulative(newCum);
      setSlpSummary(slpSum);
      setPurposesSummary(purposesSum);
      setDates(datesRes.items);
      setNextCursor(datesRes.nextCursor);
      setHasMore(!!datesRes.nextCursor);
    } catch (e) {
      console.error('[CallCenter] refresh failed', e);
    } finally {
      setCumulativeLoading(false);
      setNewCumulativeLoading(false);
      setSlpLoading(false);
      setPurposesLoading(false);
      setDatesLoading(false);
    }
  }, []);

  const currentMetrics: CallCenterOldMetrics | null = mode === 'all' ? cumulative : single;
  const cardLoading = mode === 'all' ? cumulativeLoading : singleLoading;
  const currentNewMetrics: CallCenterNewMetrics | null = mode === 'all' ? newCumulative : newSingle;
  const newCardLoading = mode === 'all' ? newCumulativeLoading : newSingleLoading;

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

      {/* Date selector and controls */}
      <div className="mb-4">
        <DateSelector
          mode={mode}
          selectedDate={selectedDate}
          dates={dates}
          loading={datesLoading}
          hasMore={hasMore}
          onModeChange={setMode}
          onDateChange={setSelectedDate}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMoreDates}
        />
      </div>

      {/* Call Center Old card */}
      <div
        className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-cyan-100 p-6 cursor-pointer relative"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Call Center Old</h2>
          <span className="px-2 py-1 text-xs rounded-full bg-white/70 border border-gray-300 text-gray-700">
            {mode === 'single' && selectedDate ? `Date: ${selectedDate}` : 'All dates (Cumulative)'}
          </span>
        </div>

        {cardLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
        ) : !currentMetrics ? (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">No data available. Upload and save a report to view metrics here.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Calls:</span>
              <span className="text-gray-900 font-bold">{currentMetrics.totalCalls}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Conversions:</span>
              <span className="text-gray-900 font-bold">{currentMetrics.conversions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Not Contacted:</span>
              <span className="text-gray-900 font-bold">{currentMetrics.notContacted}</span>
            </div>
            {mode === 'single' && currentMetrics.reportUrl ? (
              <div className="pt-2">
                <a
                  href={currentMetrics.reportUrl}
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

        {/* Hint overlay */}
        <div className="absolute right-2 top-2 text-xs text-gray-600">Tap to view per-date reports</div>
      </div>

      {/* Call Center New card */}
      <div
        className="mt-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-emerald-100 p-6 cursor-pointer relative"
        onClick={() => router.push('/verticals/call-center/external-new')}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Call Center New</h2>
          <span className="px-2 py-1 text-xs rounded-full bg-white/70 border border-gray-300 text-gray-700">
            {mode === 'single' && selectedDate ? `Date: ${selectedDate}` : 'All dates (Cumulative)'}
          </span>
        </div>

        {newCardLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
        ) : !currentNewMetrics ? (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">No data available.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Calls:</span>
              <span className="text-gray-900 font-bold">{currentNewMetrics.totalCalls}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Conversions:</span>
              <span className="text-gray-900 font-bold">{currentNewMetrics.conversions}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Not Contacted:</span>
              <span className="text-gray-900 font-bold">{currentNewMetrics.notContacted}</span>
            </div>
          </div>
        )}

        {/* Hint overlay */}
        <div className="absolute right-2 top-2 text-xs text-gray-600">Tap to view converted users per day</div>
      </div>

      {/* SLP Identification card */}
      <div
        className="mt-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-purple-100 p-6 cursor-pointer relative"
        onClick={() => router.push('/verticals/call-center/slp-identification')}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">SLP Identification</h2>
          <span className="px-2 py-1 text-xs rounded-full bg-white/70 border border-gray-300 text-gray-700">
            All Data
          </span>
        </div>

        {slpLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
        ) : !slpSummary ? (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">No data available.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Total Members:</span>
              <span className="text-gray-900 font-bold">{slpSummary.totalRecords}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/70 p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Old Applicant</div>
                <div className="text-lg font-bold text-gray-900">{slpSummary.oldApplicant}</div>
              </div>
              <div className="bg-white/70 p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">SLP Applicant</div>
                <div className="text-lg font-bold text-gray-900">{slpSummary.slpApplicant}</div>
              </div>
              <div className="bg-white/70 p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">SLP Missed Call</div>
                <div className="text-lg font-bold text-gray-900">{slpSummary.slpMissedCall}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="font-semibold text-gray-700">Unique Assemblies:</span>
              <span className="text-gray-900 font-bold">{slpSummary.uniqueAssemblies}</span>
            </div>
          </div>
        )}

        {/* Hint overlay */}
        <div className="absolute right-2 top-2 text-xs text-gray-600">Tap to view detailed list</div>
      </div>

      {/* Call Center Purposes Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* WTM Card */}
        <div
          className="rounded-xl shadow-lg border bg-blue-50 border-blue-200 p-6 cursor-pointer relative hover:shadow-xl transition"
          onClick={() => router.push('/verticals/call-center/purposes/wtm')}
        >
          <h2 className="text-xl font-bold text-blue-900 mb-3">WTM</h2>
          {purposesLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : purposesSummary ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-700">{purposesSummary.wtm}</div>
              <div className="text-sm text-gray-600">Members</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
          <div className="absolute right-2 top-2 text-xs text-gray-500">Tap to view</div>
        </div>

        {/* PRND Card */}
        <div
          className="rounded-xl shadow-lg border bg-green-50 border-green-200 p-6 cursor-pointer relative hover:shadow-xl transition"
          onClick={() => router.push('/verticals/call-center/purposes/prnd')}
        >
          <h2 className="text-xl font-bold text-green-900 mb-3">PRND</h2>
          {purposesLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : purposesSummary ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-700">{purposesSummary.prnd}</div>
              <div className="text-sm text-gray-600">Members</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
          <div className="absolute right-2 top-2 text-xs text-gray-500">Tap to view</div>
        </div>

        {/* DONOR Card */}
        <div
          className="rounded-xl shadow-lg border bg-yellow-50 border-yellow-200 p-6 cursor-pointer relative hover:shadow-xl transition"
          onClick={() => router.push('/verticals/call-center/purposes/donor')}
        >
          <h2 className="text-xl font-bold text-yellow-900 mb-3">Donor</h2>
          {purposesLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
          ) : purposesSummary ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-yellow-700">{purposesSummary.donor}</div>
              <div className="text-sm text-gray-600">Members</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
          <div className="absolute right-2 top-2 text-xs text-gray-500">Tap to view</div>
        </div>

        {/* AGGREGATOR Card */}
        <div
          className="rounded-xl shadow-lg border bg-pink-50 border-pink-200 p-6 cursor-pointer relative hover:shadow-xl transition"
          onClick={() => router.push('/verticals/call-center/purposes/aggregator')}
        >
          <h2 className="text-xl font-bold text-pink-900 mb-3">Aggregator</h2>
          {purposesLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : purposesSummary ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-pink-700">{purposesSummary.aggregator}</div>
              <div className="text-sm text-gray-600">Members</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
          <div className="absolute right-2 top-2 text-xs text-gray-500">Tap to view</div>
        </div>

        {/* DIGITAL MEMBERSHIP 1 Card */}
        <div
          className="rounded-xl shadow-lg border bg-indigo-50 border-indigo-200 p-6 cursor-pointer relative hover:shadow-xl transition"
          onClick={() => router.push('/verticals/call-center/purposes/digital-membership-1')}
        >
          <h2 className="text-xl font-bold text-indigo-900 mb-3">Digital Membership 1</h2>
          {purposesLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : purposesSummary ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-indigo-700">{purposesSummary.digitalMembership1}</div>
              <div className="text-sm text-gray-600">Members</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
          <div className="absolute right-2 top-2 text-xs text-gray-500">Tap to view</div>
        </div>
      </div>

      {/* Modal with per-date report links */}
      <ReportLinksModal
        open={modalOpen}
        items={dates}
        loading={datesLoading}
        hasMore={hasMore}
        onClose={() => setModalOpen(false)}
        onLoadMore={handleLoadMoreDates}
      />
    </div>
  );
}
