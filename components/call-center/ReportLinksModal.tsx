"use client";

import React from 'react';
import type { CallCenterListItem } from "../../models/callCenterTypes";

export interface ReportLinksModalProps {
  open: boolean;
  items: CallCenterListItem[];
  loading?: boolean;
  hasMore?: boolean;
  onClose: () => void;
  onLoadMore?: () => void;
}

export default function ReportLinksModal({ open, items, loading, hasMore, onClose, onLoadMore }: ReportLinksModalProps) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((it) => (it.date || it.id).toLowerCase().includes(q));
  }, [items, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl shadow-lg p-5 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Reports by Date</h2>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Search date (YYYY-MM-DD)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800">
          {filtered.length === 0 && !loading && (
            <div className="py-8 text-center text-sm text-gray-600">No results</div>
          )}
          {filtered.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-gray-100">{item.date || item.id}</span>
                {item.created_at && (
                  <span className="text-xs text-gray-500">created_at present</span>
                )}
              </div>
              {item.report_url ? (
                <a
                  href={item.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  View PDF
                </a>
              ) : (
                <span className="text-xs text-gray-500">No report</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {loading ? 'Loading…' : `${filtered.length} item(s)`}
          </div>
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
      </div>
    </div>
  );
}
