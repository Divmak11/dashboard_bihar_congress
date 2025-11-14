'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrainingFormType, 
  TrainingZoneGroup, 
  TrainingTabCounts 
} from '../../../models/trainingTypes';
import { 
  fetchTrainingRecords, 
  fetchTrainingTabCounts,
  groupTrainingByZonal 
} from '../../utils/fetchTrainingData';
import { TrainingTabs } from '../../../components/training/TrainingTabs';
import { TrainingZoneGroupList } from '../../../components/training/TrainingZoneGroupList';
import { TrainingSkeleton, TrainingTabsSkeleton } from '../../../components/training/TrainingSkeleton';

export default function TrainingDataPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TrainingFormType>('wtm');
  const [wtmGroups, setWtmGroups] = useState<TrainingZoneGroup[]>([]);
  const [shaktiGroups, setShaktiGroups] = useState<TrainingZoneGroup[]>([]);
  const [tabCounts, setTabCounts] = useState<TrainingTabCounts>({ wtm: 0, shakti: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both datasets in parallel
      const [wtmRecords, shaktiRecords, counts] = await Promise.all([
        fetchTrainingRecords('wtm'),
        fetchTrainingRecords('shakti-data'),
        fetchTrainingTabCounts()
      ]);

      // Group the records
      const wtmGrouped = groupTrainingByZonal(wtmRecords);
      const shaktiGrouped = groupTrainingByZonal(shaktiRecords);

      setWtmGroups(wtmGrouped);
      setShaktiGroups(shaktiGrouped);
      setTabCounts(counts);
    } catch (err) {
      console.error('Error loading training data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentGroups = () => {
    return activeTab === 'wtm' ? wtmGroups : shaktiGroups;
  };

  const getTotalStats = () => {
    const groups = getCurrentGroups();
    const totalZones = groups.length;
    const totalAssemblies = groups.reduce((sum, group) => sum + group.totals.assembliesCount, 0);
    const totalSessions = groups.reduce((sum, group) => sum + group.totals.sessions, 0);
    const totalAttendees = groups.reduce((sum, group) => sum + group.totals.attendees, 0);

    return {
      zones: totalZones,
      assemblies: totalAssemblies,
      sessions: totalSessions,
      attendees: totalAttendees
    };
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Training Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadTrainingData}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = !loading ? getTotalStats() : { zones: 0, assemblies: 0, sessions: 0, attendees: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Training Data</h1>
              <p className="mt-2 text-gray-600">
                WTM and Shakti training sessions organized by zones and assemblies
              </p>
            </div>
            
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          {loading ? (
            <TrainingTabsSkeleton />
          ) : (
            <TrainingTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
              loading={loading}
            />
          )}
        </div>

        {/* Stats Overview */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.zones}</div>
              <div className="text-sm text-gray-600">Zones</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.assemblies}</div>
              <div className="text-sm text-gray-600">Assemblies</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.sessions}</div>
              <div className="text-sm text-gray-600">Training Sessions</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.attendees.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Attendees</div>
            </div>
          </div>
        )}

        {/* Training Data */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {loading ? (
            <TrainingSkeleton />
          ) : (
            <TrainingZoneGroupList
              groups={getCurrentGroups()}
              variant={activeTab}
              loading={false}
            />
          )}
        </div>

        {/* Footer Info */}
        {!loading && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Showing {activeTab === 'wtm' ? 'WTM' : 'Shakti'} training data • 
              Last updated: {new Date().toLocaleDateString('en-IN')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
