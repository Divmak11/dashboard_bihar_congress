"use client";

import React from 'react';
import Link from 'next/link';
import { fetchSlpIdentificationRecords, searchSlpIdentificationRecords } from '../../../utils/fetchCallCenterSlp';
import type { SlpIdentificationRecord } from '../../../../models/callCenterSlpTypes';

export default function SlpIdentificationPage() {
  const [records, setRecords] = React.useState<SlpIdentificationRecord[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [filterSource, setFilterSource] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 20;

  // Load all records on mount
  React.useEffect(() => {
    let mounted = true;
    async function loadRecords() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSlpIdentificationRecords();
        if (!mounted) return;
        setRecords(data);
      } catch (e: any) {
        console.error('[SlpIdentification] Load failed', e);
        if (mounted) setError(e?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRecords();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle search
  const handleSearch = React.useCallback(async () => {
    if (!searchTerm.trim()) {
      // Reload all records
      setLoading(true);
      try {
        const data = await fetchSlpIdentificationRecords();
        setRecords(data);
        setCurrentPage(1);
      } catch (e: any) {
        console.error('[SlpIdentification] Reload failed', e);
        setError(e?.message || 'Failed to reload data');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await searchSlpIdentificationRecords(searchTerm);
      setRecords(results);
      setCurrentPage(1);
    } catch (e: any) {
      console.error('[SlpIdentification] Search failed', e);
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Filter records by source
  const filteredRecords = React.useMemo(() => {
    if (filterSource === 'all') return records;
    return records.filter(r => r.sheet_source === filterSource);
  }, [records, filterSource]);

  // Paginate records
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Summary metrics
  const totalRecords = filteredRecords.length;
  const oldApplicant = filteredRecords.filter(r => r.sheet_source === 'old_applicant').length;
  const slpApplicant = filteredRecords.filter(r => r.sheet_source === 'slp_applicant').length;
  const slpMissedCall = filteredRecords.filter(r => r.sheet_source === 'slp_missed_call').length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">SLP Identification</h1>
        <Link href="/verticals/call-center" className="text-blue-600 hover:underline">
          Back to Call Center
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Members</div>
          <div className="text-2xl font-bold text-gray-900">{totalRecords}</div>
        </div>
        <div className="bg-cyan-50 rounded-lg shadow p-4 border border-cyan-200">
          <div className="text-sm text-gray-600 mb-1">Old Applicant</div>
          <div className="text-2xl font-bold text-cyan-700">{oldApplicant}</div>
        </div>
        <div className="bg-emerald-50 rounded-lg shadow p-4 border border-emerald-200">
          <div className="text-sm text-gray-600 mb-1">SLP Applicant</div>
          <div className="text-2xl font-bold text-emerald-700">{slpApplicant}</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
          <div className="text-sm text-gray-600 mb-1">SLP Missed Call</div>
          <div className="text-2xl font-bold text-purple-700">{slpMissedCall}</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
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

          {/* Source Filter */}
          <div className="md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Source
            </label>
            <select
              value={filterSource}
              onChange={(e) => {
                setFilterSource(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="old_applicant">Old Applicant</option>
              <option value="slp_applicant">SLP Applicant</option>
              <option value="slp_missed_call">SLP Missed Call</option>
            </select>
          </div>
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
      ) : filteredRecords.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded">
          No records found. {searchTerm ? 'Try a different search term.' : 'Upload data to Firebase to see records here.'}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calling Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record, idx) => (
                    <tr key={record.id || idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record['Name'] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record['Mobile Number'] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.assembly || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.sheet_source === 'old_applicant'
                              ? 'bg-cyan-100 text-cyan-800'
                              : record.sheet_source === 'slp_applicant'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {record.sheet_source === 'old_applicant'
                            ? 'Old Applicant'
                            : record.sheet_source === 'slp_applicant'
                            ? 'SLP Applicant'
                            : 'SLP Missed Call'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record['Calling Status'] || '-'}
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of{' '}
                {filteredRecords.length} results
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
        </>
      )}
    </div>
  );
}
