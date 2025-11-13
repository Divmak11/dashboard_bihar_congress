"use client";

import React from 'react';
import type { CallCenterNewConvertedRow } from "../../models/callCenterNewTypes";

export interface ExternalNewConvertedListGroup {
  date: string;
  rows: CallCenterNewConvertedRow[];
}

export interface ExternalNewConvertedListProps {
  groups: ExternalNewConvertedListGroup[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onExportCsv?: () => void;
}

export default function ExternalNewConvertedList({ groups, loading, hasMore, onLoadMore, searchTerm, onSearchChange, onExportCsv }: ExternalNewConvertedListProps) {
  // Flatten for export
  const flatRows = React.useMemo(() => {
    const out: Array<{ date: string; name?: string; phone?: string; acName?: string }> = [];
    for (const g of groups) {
      for (const r of g.rows) {
        out.push({ date: g.date, name: r.name, phone: r.phone, acName: r.acName });
      }
    }
    return out;
  }, [groups]);

  const filteredGroups = React.useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        date: g.date,
        rows: g.rows.filter((r) => {
          const name = (r.name || '').toLowerCase();
          const phone = (r.phone || '').toLowerCase();
          const acName = (r.acName || '').toLowerCase();
          return name.includes(q) || phone.includes(q) || acName.includes(q) || g.date.toLowerCase().includes(q);
        })
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, phone, AC name, or date"
          className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
        />
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            Export CSV
          </button>
        )}
      </div>

      {filteredGroups.length === 0 && !loading && (
        <div className="p-4 rounded-md border border-gray-200 text-gray-600">No converted users found.</div>
      )}

      {filteredGroups.map((group) => (
        <div key={group.date} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="font-semibold">{group.date}</div>
            <div className="text-sm text-gray-600">{group.rows.length} converted</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {group.rows.map((r, idx) => (
              <div key={idx} className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Name</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{r.name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{r.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">AC Name</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{r.acName || '-'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{loading ? 'Loading…' : `${flatRows.length} total rows`}</div>
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
  );
}
