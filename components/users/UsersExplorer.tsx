"use client";

import React, { useEffect, useMemo, useState } from "react";
import DateRangeFilter from "../DateRangeFilter";
import { FetchUsersResult, DisplayUser, fetchAllUsersPaged, fetchUserCumulativeMetrics } from "../../app/utils/fetchUsersData";
import type { CumulativeMetrics } from "../../models/hierarchicalTypes";
import UserReportOptionsModal from "../report/UserReportOptionsModal";
import UserDetailsModal from "./UserDetailsModal";
import { generateUserReportPDF } from "../../app/utils/generateUserReportPDF";
import type { AdminUser } from "../../models/types";

interface UsersExplorerProps {
  selectedVertical: "wtm" | "shakti-abhiyaan";
  adminUser: AdminUser | null;
  currentDateOption: string;
  onClose: () => void;
}

type RoleFilter = "All" | "Assembly Coordinator" | "Zonal Incharge";

type SplitType = "cumulative" | "day" | "month";

const UsersExplorer: React.FC<UsersExplorerProps> = ({ selectedVertical, adminUser, currentDateOption, onClose }) => {
  // Separate date filter
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateOption, setDateOption] = useState<string>("All Time");

  // Filters and search
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");

  // Paging
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [nextCursorName, setNextCursorName] = useState<string | undefined>(undefined);

  // Selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [activeUser, setActiveUser] = useState<DisplayUser | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<CumulativeMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  // Report modal
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);

  const handleDateChange = (start: string, end: string, option: string) => {
    setStartDate(start);
    setEndDate(end);
    setDateOption(option);
  };

  const loadUsers = async (reset = false) => {
    setLoadingUsers(true);
    try {
      const role = roleFilter === "All" ? undefined : roleFilter;
      const result: FetchUsersResult = await fetchAllUsersPaged({
        role,
        search,
        pageSize: 100,
        startAfterName: reset ? undefined : nextCursorName,
      });
      if (reset) {
        setUsers(result.users);
      } else {
        setUsers(prev => [...prev, ...result.users]);
      }
      setNextCursorName(result.nextCursorName);
    } catch (e) {
      console.error("[UsersExplorer] Error loading users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Initial load and on filter/search change
  useEffect(() => {
    setNextCursorName(undefined);
    setUsers([]);
    loadUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, search]);

  const toggleSelect = (uid: string) => {
    setSelectedUserIds(prev => {
      const copy = new Set(prev);
      if (copy.has(uid)) copy.delete(uid); else copy.add(uid);
      return copy;
    });
  };

  const allSelected = useMemo(() => users.length > 0 && users.every(u => selectedUserIds.has(u.uid)), [users, selectedUserIds]);
  const toggleSelectAll = () => {
    setSelectedUserIds(prev => {
      const copy = new Set(prev);
      if (!allSelected) {
        users.forEach(u => copy.add(u.uid));
      } else {
        users.forEach(u => copy.delete(u.uid));
      }
      return copy;
    });
  };

  const canViewWork = (user: DisplayUser | null) => {
    if (!user) return false;
    const r = (user.role || '').toLowerCase();
    return r === 'assembly coordinator' || r === 'zonal incharge';
  };

  const handleViewWork = async (user: DisplayUser) => {
    setActiveUser(user);
    setLoadingMetrics(true);
    try {
      const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
      const isLastDay = dateOption === 'Last Day' || currentDateOption === 'Last Day';
      const metrics = await fetchUserCumulativeMetrics(user, dateRange, selectedVertical, adminUser, isLastDay);
      setActiveMetrics(metrics);
    } catch (e) {
      console.error('[UsersExplorer] Error fetching user metrics:', e);
      setActiveMetrics(null);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const openDetails = async (user: DisplayUser) => {
    setShowDetailsModal(true);
    await handleViewWork(user);
  };
  const closeDetails = () => {
    setShowDetailsModal(false);
  };

  const selectedUsers = useMemo(() => users.filter(u => selectedUserIds.has(u.uid)), [users, selectedUserIds]);
  const selectedCount = selectedUsers.length;

  const daysInRange = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const sn = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const en = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    return Math.floor((en.getTime() - sn.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const handleGenerateReport = async (split: SplitType) => {
    try {
      const eligible = selectedUsers.filter(u => canViewWork(u));
      if (eligible.length === 0) return;
      if (!startDate || !endDate) return;
      setReportGenerating(true);
      const blob = await generateUserReportPDF({
        users: eligible,
        dateRange: { startDate, endDate },
        split,
        vertical: selectedVertical,
        adminUser,
        isLastDayFilter: (dateOption === 'Last Day' || currentDateOption === 'Last Day')
      });
      const fileName = `users_report_${startDate}_to_${endDate}_${split}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      setReportModalOpen(false);
    } catch (e) {
      console.error('[UsersExplorer] Error generating user report PDF:', e);
      alert('Failed to generate user report. Please try again.');
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">All Users</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Browse and generate user-specific reports. Vertical: {selectedVertical}</p>
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">Close</button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 flex flex-col gap-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search with icon */}
          <div className="relative w-full sm:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.75 3.75a7.5 7.5 0 0012.9 12.9z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search name, email, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Segmented Role Filter */}
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
            {(['All','Assembly Coordinator','Zonal Incharge'] as RoleFilter[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setRoleFilter(opt)}
                className={`px-3 py-2 text-sm ${roleFilter === opt ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto">
            <DateRangeFilter
              label="Users"
              startDate={startDate}
              endDate={endDate}
              selectedOption={dateOption}
              onDateChange={handleDateChange}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Users Table */}
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">{loadingUsers ? 'Loading users...' : `${users.length} users loaded`}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadUsers(false)}
                  disabled={loadingUsers || !nextCursorName}
                  className={`px-3 py-2 rounded-md ${nextCursorName ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700' : 'bg-gray-100 opacity-60'}`}
                >
                  Load more
                </button>
                <button
                  onClick={() => setReportModalOpen(true)}
                  disabled={selectedCount === 0 || !startDate || !endDate || reportGenerating}
                  className={`px-3 py-2 rounded-md ${selectedCount > 0 && startDate && endDate && !reportGenerating ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-800 opacity-60'}`}
                >
                  {reportGenerating ? 'Generating...' : `Generate Report (${selectedCount})`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 border-b"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
                    <th className="p-2 border-b text-left">Name</th>
                    <th className="p-2 border-b text-left">Role</th>
                    <th className="p-2 border-b text-left">Phone</th>
                    <th className="p-2 border-b text-left">Email</th>
                    <th className="p-2 border-b text-left">Assembly</th>
                    <th className="p-2 border-b text-left">Assemblies</th>
                    <th className="p-2 border-b text-left">District</th>
                    <th className="p-2 border-b text-left">Village</th>
                    <th className="p-2 border-b text-left">Created</th>
                    <th className="p-2 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers && users.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-4">
                        <div className="space-y-2">
                          {Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="h-10 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loadingUsers && users.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-sm text-gray-500">No users found. Adjust filters or search terms.</td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800 odd:bg-gray-50/40 dark:odd:bg-gray-800/40 cursor-pointer" onClick={() => canViewWork(u) && openDetails(u)}>
                      <td className="p-2 border-b text-center">
                        <input type="checkbox" checked={selectedUserIds.has(u.uid)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(u.uid)} />
                      </td>
                      <td className="p-2 border-b">{u.name}</td>
                      <td className="p-2 border-b">{u.role}</td>
                      <td className="p-2 border-b">{u.phone || '-'}</td>
                      <td className="p-2 border-b">{u.email || '-'}</td>
                      <td className="p-2 border-b">{u.assembly || '-'}</td>
                      <td className="p-2 border-b">{(u.assemblies || []).join(', ') || '-'}</td>
                      <td className="p-2 border-b">{u.district || '-'}</td>
                      <td className="p-2 border-b">{u.village || '-'}</td>
                      <td className="p-2 border-b">{u.createdAt ? new Date(u.createdAt).toISOString().slice(0,10) : '-'}</td>
                      <td className="p-2 border-b text-center">
                        <button
                          className={`px-2 py-1 rounded-md ${canViewWork(u) ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 dark:bg-gray-700 opacity-60'}`}
                          disabled={!canViewWork(u)}
                          onClick={(e) => { e.stopPropagation(); openDetails(u); }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Report split modal */}
      <UserReportOptionsModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onConfirm={(split: SplitType) => handleGenerateReport(split)}
        daysInRange={daysInRange}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={showDetailsModal}
        user={activeUser}
        metrics={activeMetrics}
        loading={loadingMetrics}
        onClose={closeDetails}
      />
    </div>
  );
};

export default UsersExplorer;
