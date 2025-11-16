"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchCallCenterPurposeRecords, searchCallCenterPurposeRecords } from '../../../../utils/fetchCallCenterPurposes';
import type { CallCenterPurposeRecord, CallCenterPurposeFormType } from '../../../../../models/callCenterPurposesTypes';
import { FORM_TYPE_DISPLAY_NAMES, FORM_TYPE_COLORS } from '../../../../../models/callCenterPurposesTypes';

// Map URL slugs to form types
const SLUG_TO_FORM_TYPE: Record<string, CallCenterPurposeFormType> = {
  'wtm': 'wtm',
  'prnd': 'prnd',
  'donor': 'donor',
  'aggregator': 'aggregator',
  'digital-membership-1': 'digital membership 1',
};

export default function CallCenterPurposePage() {
  const params = useParams();
  const formTypeSlug = params?.formType as string;
  const formType = SLUG_TO_FORM_TYPE[formTypeSlug];

  const [records, setRecords] = React.useState<CallCenterPurposeRecord[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 20;

  // Get display name and colors
  const displayName = formType ? FORM_TYPE_DISPLAY_NAMES[formType] : 'Unknown';
  const colors = formType ? FORM_TYPE_COLORS[formType] : FORM_TYPE_COLORS.wtm;

  // Load records on mount
  React.useEffect(() => {
    if (!formType) {
      setError('Invalid form type');
      setLoading(false);
      return;
    }

    let mounted = true;
    async function loadRecords() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCallCenterPurposeRecords(formType);
        if (!mounted) return;
        setRecords(data);
      } catch (e: any) {
        console.error('[CallCenterPurpose] Load failed', e);
        if (mounted) setError(e?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRecords();
    return () => {
      mounted = false;
    };
  }, [formType]);

  // Handle search
  const handleSearch = React.useCallback(async () => {
    if (!formType) return;

    if (!searchTerm.trim()) {
      // Reload all records
      setLoading(true);
      try {
        const data = await fetchCallCenterPurposeRecords(formType);
        setRecords(data);
        setCurrentPage(1);
      } catch (e: any) {
        console.error('[CallCenterPurpose] Reload failed', e);
        setError(e?.message || 'Failed to reload data');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await searchCallCenterPurposeRecords(searchTerm, formType);
      setRecords(results);
      setCurrentPage(1);
    } catch (e: any) {
      console.error('[CallCenterPurpose] Search failed', e);
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, formType]);

  // Paginate records
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = records.slice(startIndex, endIndex);

  // Count by assembly
  const assemblyCountMap: Record<string, number> = {};
  records.forEach(r => {
    if (r.assembly) {
      assemblyCountMap[r.assembly] = (assemblyCountMap[r.assembly] || 0) + 1;
    }
  });
  const topAssemblies = Object.entries(assemblyCountMap)
    .map(([assembly, count]) => ({ assembly, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (!formType) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Invalid form type: {formTypeSlug}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <Link href="/verticals/call-center" className="text-blue-600 hover:underline">
          Back to Call Center
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${colors.bg} rounded-lg shadow p-4 border ${colors.border}`}>
          <div className="text-sm text-gray-600 mb-1">Total Members</div>
          <div className={`text-2xl font-bold ${colors.text}`}>{records.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Unique Assemblies</div>
          <div className="text-2xl font-bold text-gray-900">{Object.keys(assemblyCountMap).length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Top Assembly</div>
          <div className="text-lg font-bold text-gray-900">
            {topAssemblies[0] ? `${topAssemblies[0].assembly} (${topAssemblies[0].count})` : '-'}
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search by Name or Phone
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter name or phone number..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded">
          No records found. {searchTerm ? 'Try a different search term.' : 'No data available.'}
        </div>
      ) : (
        <>
          {/* Records List */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobile Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assembly
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record, idx) => (
                    <tr key={record.id || idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.Name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record['Mobile Number'] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.assembly || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, records.length)} of{' '}
                {records.length} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 border rounded-md text-sm ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Top Assemblies */}
          {topAssemblies.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Top 5 Assemblies</h3>
              <div className="space-y-2">
                {topAssemblies.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.assembly}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.count} members</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
