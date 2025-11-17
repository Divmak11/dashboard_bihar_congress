"use client";

/**
 * Check-In Data Vertical Page
 * Displays user check-in data with summary cards and detailed daily views
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../utils/firebase';
import { fetchAllCheckinData } from '../../utils/fetchCheckinData';
import { UserCheckin } from '../../../models/checkinTypes';
import CheckinUserCard from '../../../components/checkin/CheckinUserCard';
import CheckinDailyDetails from '../../../components/checkin/CheckinDailyDetails';

export default function CheckinDataPage() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [checkinData, setCheckinData] = useState<UserCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserCheckin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'totalCount' | 'name' | 'days'>('totalCount');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Fetch check-in data
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchAllCheckinData();
        setCheckinData(data);
      } catch (error) {
        console.error('[CheckinDataPage] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = checkinData;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_id.includes(searchQuery)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'totalCount':
          return b.totalCount - a.totalCount;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'days':
          return b.dailyCounts.length - a.dailyCounts.length;
        default:
          return 0;
      }
    });

    return sorted;
  }, [checkinData, searchQuery, sortBy]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    const totalUsers = checkinData.length;
    const totalCheckins = checkinData.reduce((sum, user) => sum + user.totalCount, 0);
    const avgCheckinsPerUser = totalUsers > 0 ? (totalCheckins / totalUsers).toFixed(1) : '0';
    
    // Users with activity in last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    const activeLastWeek = checkinData.filter(user => 
      user.dailyCounts.some(daily => daily.date >= oneWeekAgoStr)
    ).length;

    return { totalUsers, totalCheckins, avgCheckinsPerUser, activeLastWeek };
  }, [checkinData]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/home')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Check-In Data</h1>
          <p className="text-gray-600">User check-in tracking and analytics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-semibold">Total Users</span>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-800">{summaryStats.totalUsers}</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-semibold">Total Check-ins</span>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-800">{summaryStats.totalCheckins}</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-semibold">Avg per User</span>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-800">{summaryStats.avgCheckinsPerUser}</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-semibold">Active (7 days)</span>
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-800">{summaryStats.activeLastWeek}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search Users</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone number..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort By */}
            <div className="md:w-64">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'totalCount' | 'name' | 'days')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="totalCount">Total Check-ins (High to Low)</option>
                <option value="name">Name (A-Z)</option>
                <option value="days">Days Tracked (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* User Cards Grid */}
        {!loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Users ({filteredAndSortedData.length})
              </h2>
            </div>

            {filteredAndSortedData.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No users found</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Try adjusting your search query' : 'No check-in data available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedData.map((user) => (
                  <CheckinUserCard
                    key={user.user_id}
                    user={user}
                    onClick={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Daily Details Modal */}
        {selectedUser && (
          <CheckinDailyDetails
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </div>
    </div>
  );
}
