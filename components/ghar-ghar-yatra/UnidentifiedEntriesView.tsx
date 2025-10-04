'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchOtherDataPaginated, searchOtherData } from '../../app/utils/fetchGharGharYatraData';
import { OtherDataDocument, PaginationState } from '../../models/gharGharYatraTypes';

const UnidentifiedEntriesView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [entries, setEntries] = useState<OtherDataDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'unmatched' | 'incorrect'>('all');
  const [pagination, setPagination] = useState<PaginationState>({
    hasMore: false,
    lastVisible: null,
    currentPage: 1,
    totalFetched: 0
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Set default date to today on mount
  useEffect(() => {
    const today = new Date();
    const formatted = formatDateForInput(today);
    setSelectedDate(formatted);
  }, []);

  // Fetch data when date or filter changes
  useEffect(() => {
    if (selectedDate && !isSearching) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filterType]);

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const fetchData = async (lastDoc?: any) => {
    console.log(`[UnidentifiedEntriesView] Fetching data for ${selectedDate}, filter: ${filterType}`);
    setLoading(true);
    setError(null);

    try {
      const result = await fetchOtherDataPaginated(selectedDate, lastDoc, 25, filterType);
      
      if (lastDoc) {
        // Append to existing entries (pagination)
        setEntries(prev => [...prev, ...result.entries]);
      } else {
        // Replace entries (new fetch)
        setEntries(result.entries);
      }
      
      setPagination({
        ...result.pagination,
        currentPage: lastDoc ? pagination.currentPage + 1 : 1,
        totalFetched: lastDoc ? pagination.totalFetched + result.entries.length : result.entries.length
      });
      
      if (result.entries.length === 0 && !lastDoc) {
        setError(`No unidentified entries found for ${formatDateForDisplay(selectedDate)}`);
      }
      
      console.log(`[UnidentifiedEntriesView] Fetched ${result.entries.length} entries`);
    } catch (err) {
      console.error('[UnidentifiedEntriesView] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch unidentified entries');
      setEntries([]);
      setPagination({
        hasMore: false,
        lastVisible: null,
        currentPage: 1,
        totalFetched: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If search is empty, reset to paginated view
      setIsSearching(false);
      fetchData();
      return;
    }

    console.log(`[UnidentifiedEntriesView] Searching for: ${searchTerm}`);
    setLoading(true);
    setError(null);
    setIsSearching(true);

    try {
      const results = await searchOtherData(selectedDate, searchTerm, filterType);
      setEntries(results);
      setPagination({
        hasMore: false,
        lastVisible: null,
        currentPage: 1,
        totalFetched: results.length
      });
      
      if (results.length === 0) {
        setError(`No entries found matching "${searchTerm}"`);
      }
      
      console.log(`[UnidentifiedEntriesView] Found ${results.length} matching entries`);
    } catch (err) {
      console.error('[UnidentifiedEntriesView] Error searching:', err);
      setError(err instanceof Error ? err.message : 'Failed to search entries');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loading && !isSearching) {
      fetchData(pagination.lastVisible);
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'unmatched' | 'incorrect') => {
    setFilterType(newFilter);
    setSearchTerm('');
    setIsSearching(false);
    setPagination({
      hasMore: false,
      lastVisible: null,
      currentPage: 1,
      totalFetched: 0
    });
  };

  const getEntryTypeBadge = (type?: 'unmatched' | 'incorrect') => {
    if (type === 'unmatched') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Unmatched</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Incorrect</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Unidentified Entries</h2>
        
        {/* Date Picker & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSearchTerm('');
                setIsSearching(false);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter Type</label>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value as 'all' | 'unmatched' | 'incorrect')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Entries</option>
              <option value="unmatched">Unmatched Only</option>
              <option value="incorrect">Incorrect Only</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search by Phone</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter phone digits..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔍
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {entries.length} {isSearching ? 'matching' : ''} entries</span>
          {isSearching && (
            <button
              onClick={() => {
                setSearchTerm('');
                setIsSearching(false);
                fetchData();
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && entries.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading unidentified entries...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Punches</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Double</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Triple+</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEntryTypeBadge(entry.entryType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.slpPhoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.totalPunches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.uniquePunches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.doubleEntries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.tripleEntries}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isSearching && pagination.hasMore && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
              <p className="text-center text-sm text-gray-600 mt-2">
                Page {pagination.currentPage} • {pagination.totalFetched} entries loaded
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State (when no data and no error) */}
      {!loading && !error && entries.length === 0 && selectedDate && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No unidentified entries found</p>
            <p className="text-sm mt-1">Try selecting a different date or changing the filter.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnidentifiedEntriesView;
