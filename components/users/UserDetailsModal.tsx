"use client";

import React from "react";
import type { DisplayUser } from "../../app/utils/fetchUsersData";
import type { CumulativeMetrics } from "../../models/hierarchicalTypes";

interface UserDetailsModalProps {
  isOpen: boolean;
  user: DisplayUser | null;
  metrics: CumulativeMetrics | null;
  loading: boolean;
  onClose: () => void;
}

const LabelVal: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value || '-'}</div>
  </div>
);

const MetricCard: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{Number(value) || 0}</div>
  </div>
);

const SkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
    ))}
  </div>
);

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, user, metrics, loading, onClose }) => {
  if (!isOpen || !user) return null;

  const canViewWork = (role?: string) => {
    const r = (role || '').toLowerCase();
    return r === 'assembly coordinator' || r === 'zonal incharge';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 sm:p-6">
      <div className="w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">{user.name}</h2>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {user.role || 'User'}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">User profile and work summary</div>
            </div>
            <button onClick={onClose} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">Close</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-6">
          {/* Profile */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Profile</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <LabelVal label="Phone" value={user.phone} />
              <LabelVal label="Email" value={user.email} />
              <LabelVal label="Role" value={user.role} />
              <LabelVal label="Assembly" value={user.assembly} />
              <LabelVal label="Assemblies" value={(user.assemblies || []).join(', ') || '-'} />
              <LabelVal label="District" value={user.district} />
              {user.block && <LabelVal label="Block" value={user.block} />}
              <LabelVal label="Village" value={user.village} />
              <LabelVal label="State" value={user.state} />
              <LabelVal label="Vertical" value={user.vertical} />
              <LabelVal label="Created" value={user.createdAt ? new Date(user.createdAt).toISOString().slice(0,10) : '-'} />
              <LabelVal label="Updated" value={user.updatedAt ? new Date(user.updatedAt).toISOString().slice(0,10) : '-'} />
            </div>
          </div>

          {/* Work Summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Work Summary</h3>
              {!canViewWork(user.role) && (
                <span className="text-xs text-gray-500">Work summary is available only for Assembly Coordinator and Zonal Incharge</span>
              )}
            </div>
            {loading ? (
              <SkeletonGrid />
            ) : metrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(metrics).map(([k, v]) => (
                  <MetricCard key={k} label={k} value={v} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No data to display.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
