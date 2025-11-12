"use client";

import React from 'react';
import Link from 'next/link';
import { fetchCallCenterNewConvertedPaged, CallCenterNewDailyConverted } from '../../../utils/fetchCallCenterNewData';
import ExternalNewConvertedList from '../../../../components/call-center/ExternalNewConvertedList';

export default function CallCenterExternalNewPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [groups, setGroups] = React.useState<CallCenterNewDailyConverted[]>([]);
  const [cursor, setCursor] = React.useState<any>(undefined);
  const [hasMore, setHasMore] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>('');

  const loadPage = React.useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCallCenterNewConvertedPaged({ pageSize: 10, cursor: reset ? undefined : cursor });
      setGroups((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } catch (e: any) {
      console.error('[CallCenter New] fetch converted paged failed', e);
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  React.useEffect(() => {
    loadPage(true);
  }, [loadPage]);

  const handleExportCsv = React.useCallback(() => {
    // Build CSV: date,name,phone,acName
    const header = ['date', 'name', 'phone', 'acName'];
    const rows: string[] = [header.join(',')];
    for (const g of groups) {
      for (const r of g.rows) {
        const cols = [g.date, r.name || '', r.phone || '', r.acName || ''];
        // Escape commas and quotes
        const escaped = cols.map((v) => {
          const needsQuote = /[",\n]/.test(v);
          const vv = v.replace(/"/g, '""');
          return needsQuote ? `"${vv}"` : vv;
        });
        rows.push(escaped.join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-center-new-converted-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [groups]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Call Center New - Converted Users</h1>
        <Link href="/verticals/call-center" className="text-blue-600 hover:underline">Back to Call Center</Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      )}

      <ExternalNewConvertedList
        groups={groups}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={() => loadPage(false)}
        searchTerm={search}
        onSearchChange={setSearch}
        onExportCsv={handleExportCsv}
      />
    </div>
  );
}
