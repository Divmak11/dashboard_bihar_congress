'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DateRangeFilter from '../DateRangeFilter';
import { DateRange } from '../../models/gharGharYatraTypes';
import { D2DMemberWithMetrics } from '../../models/d2dTypes';
import { fetchAllD2DMembers, attachGgyMetricsToMembers, roleWeight } from '../../app/utils/fetchD2DMembers';

// In 'show all' mode we do not paginate; full dataset is loaded once per date range

type SortKey = keyof Pick<D2DMemberWithMetrics, 'name' | 'phoneNumber' | 'assembly' | 'role' | 'status'> | 'totalPunches' | 'uniquePunches' | 'doubleEntries' | 'tripleEntries';

const D2DMembersList: React.FC = () => {
  // Date range state (defaults to lastWeek similar to overview)
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const [dateOption, setDateOption] = useState<string>('lastWeek');
  const [startDate, setStartDate] = useState<string>(toStr(sevenDaysAgo));
  const [endDate, setEndDate] = useState<string>(toStr(yesterday));

  const [members, setMembers] = useState<D2DMemberWithMetrics[]>([]);
  const [allMembers, setAllMembers] = useState<D2DMemberWithMetrics[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  // Pagination removed in 'show all' mode

  // Default sorting: show highest work first (Total Punches DESC)
  const [sortKey, setSortKey] = useState<SortKey>('totalPunches');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const dateRange: DateRange = { startDate, endDate };

  const handleDateRangeChange = (start: string, end: string, option: string) => {
    setDateOption(option);
    setStartDate(start);
    setEndDate(end);
    // Reset current view and fetch fresh
    setMembers([]);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ALL members (no date filtering), then attach metrics for the selected range
      console.time('[D2DMembersList] Fetch all members (no date filter)');
      const d2dAll = await fetchAllD2DMembers();
      console.timeEnd('[D2DMembersList] Fetch all members (no date filter)');

      console.time('[D2DMembersList] Attach metrics');
      const withMetrics = await attachGgyMetricsToMembers(d2dAll, dateRange);
      console.timeEnd('[D2DMembersList] Attach metrics');

      setAllMembers(withMetrics);
      setMembers(withMetrics); // initial display equals full set; search filters in-memory
    } catch (err) {
      console.error('[D2DMembersList] Error loading members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
      setAllMembers([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch all on initial mount and whenever date range changes
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, dateOption]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Apply in-memory search over the full loaded dataset
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allMembers;
    const digits = term.replace(/\D/g, '');
    return allMembers.filter((m) => {
      const name = m.name?.toLowerCase() || '';
      const assembly = m.assembly?.toLowerCase() || '';
      const phone = (m.phoneNumber || '').toLowerCase();
      const phoneDigits = (m.phoneNumber || '').replace(/\D/g, '');
      return (
        name.includes(term) ||
        assembly.includes(term) ||
        phone.includes(term) ||
        (digits && phoneDigits.includes(digits))
      );
    });
  }, [allMembers, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      // Default precedence: role weight first, then name (unless user sorted by a specific key)
      if (sortKey === 'name') {
        const base = roleWeight(a.role) - roleWeight(b.role);
        if (base !== 0) return base;
      }

      let aVal: any;
      let bVal: any;
      if (sortKey === 'totalPunches' || sortKey === 'uniquePunches' || sortKey === 'doubleEntries' || sortKey === 'tripleEntries') {
        aVal = a.metrics[sortKey];
        bVal = b.metrics[sortKey];
      } else {
        aVal = (a as any)[sortKey];
        bVal = (b as any)[sortKey];
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc' ? String(aVal ?? '').localeCompare(String(bVal ?? '')) : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  const paged = sorted; // Full table with virtual pagination (we load server pages as needed)

  const exportCSV = () => {
    if (paged.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = ['Name', 'Phone Number', 'Assembly', 'Role', 'Status', 'Total Punches', 'Unique Calls', 'Double Entries', 'Triple Entries'];
    const rows = paged.map(r => [
      JSON.stringify(r.name ?? ''),
      r.phoneNumber ?? '',
      JSON.stringify(r.assembly ?? ''),
      r.role ?? '',
      r.status ?? '',
      r.metrics.totalPunches,
      r.metrics.uniquePunches,
      r.metrics.doubleEntries,
      r.metrics.tripleEntries,
    ]);
    const csv = [headers.join(','), ...rows.map(x => x.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `d2d_members_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon: React.FC<{ column: SortKey }> = ({ column }) => {
    if (sortKey !== column) {
      return <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    }
    return sortDir === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <DateRangeFilter
              label="Date Range"
              startDate={startDate}
              endDate={endDate}
              selectedOption={dateOption}
              onDateChange={handleDateRangeChange}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, phone, or assembly..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                className="w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={exportCSV}
              disabled={loading || sorted.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>Showing {sorted.length} members</span>
            {search && <span>Filtered by search</span>}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && members.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading members...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <p className="text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && paged.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">Name <SortIcon column="name" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('assembly')}>
                    <div className="flex items-center gap-2">Assembly <SortIcon column="assembly" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('role')}>
                    <div className="flex items-center gap-2">Role <SortIcon column="role" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">Status <SortIcon column="status" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalPunches')}>
                    <div className="flex items-center gap-2">Total Punches <SortIcon column="totalPunches" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('uniquePunches')}>
                    <div className="flex items-center gap-2">Unique Calls <SortIcon column="uniquePunches" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('doubleEntries')}>
                    <div className="flex items-center gap-2">Double Entries <SortIcon column="doubleEntries" /></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tripleEntries')}>
                    <div className="flex items-center gap-2">Triple Entries <SortIcon column="tripleEntries" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paged.map((row, idx) => (
                  <tr key={`${row.phoneNumber}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.phoneNumber || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.assembly || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.status || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{row.metrics.totalPunches.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.metrics.uniquePunches.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.metrics.doubleEntries.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.metrics.tripleEntries.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination removed in 'show all' mode */}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sorted.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 9.414V19a2 2 0 01-2 2z" /></svg>
            <p className="text-lg font-medium">No members found</p>
            <p className="text-sm mt-1">Try adjusting the date range or search.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default D2DMembersList;
