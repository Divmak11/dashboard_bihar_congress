'use client';

import { useState, useEffect } from 'react';
import { getWtmSlpSummary, getWtmSlpStakeholders, getCoordinatorDetails, debugFetchCollection } from '../utils/fetchFirebaseData';
import { WtmSlpSummary, User, CoordinatorDetails } from '../../models/types';

export default function FirebaseTestPage() {
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [summaryData, setSummaryData] = useState<WtmSlpSummary | null>(null);
  const [stakeholders, setStakeholders] = useState<User[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [coordinatorDetails, setCoordinatorDetails] = useState<CoordinatorDetails | null>(null);
  const [loading, setLoading] = useState({
    summary: false,
    stakeholders: false,
    details: false,
    debug: false
  });
  const [error, setError] = useState<string | null>(null);
  
  // Debug collection data
  const [collectionName, setCollectionName] = useState('wtm-slp');
  const [limitCount, setLimitCount] = useState(5);
  const [debugData, setDebugData] = useState<any[]>([]);

  // Test summary data fetching
  async function fetchSummaryData() {
    setLoading(prev => ({ ...prev, summary: true }));
    setError(null);
    try {
      console.log('TEST PAGE: Fetching summary data...');
      const data = await getWtmSlpSummary(startDate, endDate);
      setSummaryData(data);
      console.log('TEST PAGE: Summary data received:', data);
    } catch (err) {
      console.error('TEST PAGE: Error fetching summary:', err);
      setError('Failed to fetch summary data');
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }

  // Test stakeholders fetching
  async function fetchStakeholders() {
    setLoading(prev => ({ ...prev, stakeholders: true }));
    setError(null);
    try {
      console.log('TEST PAGE: Fetching stakeholders...');
      const data = await getWtmSlpStakeholders();
      setStakeholders(data);
      console.log('TEST PAGE: Stakeholders received:', data);
    } catch (err) {
      console.error('TEST PAGE: Error fetching stakeholders:', err);
      setError('Failed to fetch stakeholders');
    } finally {
      setLoading(prev => ({ ...prev, stakeholders: false }));
    }
  }

  // Test coordinator details fetching
  async function fetchCoordinatorDetails() {
    if (!selectedUid) {
      alert('Please select a stakeholder first');
      return;
    }

    setLoading(prev => ({ ...prev, details: true }));
    setError(null);
    try {
      console.log(`TEST PAGE: Fetching coordinator details for ${selectedUid}...`);
      const data = await getCoordinatorDetails(selectedUid, startDate, endDate);
      setCoordinatorDetails(data);
      console.log('TEST PAGE: Coordinator details received:', data);
    } catch (err) {
      console.error('TEST PAGE: Error fetching coordinator details:', err);
      setError('Failed to fetch coordinator details');
    } finally {
      setLoading(prev => ({ ...prev, details: false }));
    }
  }

  // Auto-fetch stakeholders on page load
  useEffect(() => {
    fetchStakeholders();
  }, []);

  // Debug fetch collection
  async function fetchDebugCollection() {
    setLoading(prev => ({ ...prev, debug: true }));
    setError(null);
    try {
      console.log(`TEST PAGE: Debugging collection "${collectionName}"...`);
      const data = await debugFetchCollection(collectionName, limitCount);
      setDebugData(data);
      console.log('TEST PAGE: Debug data received:', data);
    } catch (err) {
      console.error('TEST PAGE: Error fetching debug data:', err);
      setError(`Failed to fetch collection ${collectionName}`);
    } finally {
      setLoading(prev => ({ ...prev, debug: false }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Firebase Integration Test Page</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          {error}
        </div>
      )}

      {/* Date Range Section */}
      <section className="bg-gray-100 p-4 rounded-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Date Range</h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block mb-1">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block mb-1">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>
      </section>

      {/* Summary Data Section */}
      <section className="bg-gray-100 p-4 rounded-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Summary Data</h2>
          <button
            onClick={fetchSummaryData}
            disabled={loading.summary}
            className="bg-blue-500 text-white px-4 py-1 rounded disabled:bg-blue-300"
          >
            {loading.summary ? 'Loading...' : 'Fetch Summary'}
          </button>
        </div>

        {summaryData ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded shadow">
              <div className="text-sm text-gray-500">Total Meetings</div>
              <div className="text-2xl font-bold">{summaryData.totalMeetings}</div>
            </div>
            <div className="bg-white p-3 rounded shadow">
              <div className="text-sm text-gray-500">Total SLPs</div>
              <div className="text-2xl font-bold">{summaryData.totalSlps}</div>
            </div>
            <div className="bg-white p-3 rounded shadow">
              <div className="text-sm text-gray-500">Total Onboarded</div>
              <div className="text-2xl font-bold">{summaryData.totalOnboarded}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic">No summary data fetched yet</div>
        )}
      </section>

      {/* Stakeholders Section */}
      <section className="bg-gray-100 p-4 rounded-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Stakeholders</h2>
          <button
            onClick={fetchStakeholders}
            disabled={loading.stakeholders}
            className="bg-blue-500 text-white px-4 py-1 rounded disabled:bg-blue-300"
          >
            {loading.stakeholders ? 'Loading...' : 'Refresh Stakeholders'}
          </button>
        </div>

        {stakeholders.length > 0 ? (
          <div>
            <div className="mb-2">
              <label className="block mb-1">Select a stakeholder:</label>
              <select
                value={selectedUid || ''}
                onChange={(e) => setSelectedUid(e.target.value || null)}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="">-- Select Stakeholder --</option>
                {stakeholders.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.name} ({user.role}) - {user.assembly || 'No Assembly'}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">{stakeholders.length} stakeholders found</div>
          </div>
        ) : loading.stakeholders ? (
          <div className="text-gray-500">Loading stakeholders...</div>
        ) : (
          <div className="text-gray-500 italic">No stakeholders found</div>
        )}
      </section>

      {/* Coordinator Details Section */}
      <section className="bg-gray-100 p-4 rounded-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Coordinator Details</h2>
          <button
            onClick={fetchCoordinatorDetails}
            disabled={loading.details || !selectedUid}
            className="bg-blue-500 text-white px-4 py-1 rounded disabled:bg-blue-300"
          >
            {loading.details ? 'Loading...' : 'Fetch Details'}
          </button>
        </div>

        {coordinatorDetails ? (
          <div>
            <div className="bg-white p-4 rounded shadow mb-4">
              <h3 className="font-semibold mb-2">Personal Info</h3>
              <div>Name: {coordinatorDetails.personalInfo.name || '--'}</div>
              <div>Role: {coordinatorDetails.personalInfo.role || '--'}</div>
              <div>Assembly: {coordinatorDetails.personalInfo.assembly || '--'}</div>
            </div>
            
            <div className="bg-white p-4 rounded shadow mb-4">
              <h3 className="font-semibold mb-2">Meetings Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Meetings</div>
                  <div className="text-xl font-bold">{coordinatorDetails.meetingsSummary.meetings}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">SLPs Added</div>
                  <div className="text-xl font-bold">{coordinatorDetails.meetingsSummary.slpsAdded}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Onboarded</div>
                  <div className="text-xl font-bold">{coordinatorDetails.meetingsSummary.onboarded}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow mb-4">
              <h3 className="font-semibold mb-2">Activities</h3>
              {coordinatorDetails.activities.length > 0 ? (
                <div className="text-sm">Found {coordinatorDetails.activities.length} activities</div>
              ) : (
                <div className="text-gray-500 italic">No activities found</div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">WhatsApp Groups</h3>
              {coordinatorDetails.whatsappGroups.length > 0 ? (
                <div className="text-sm">Found {coordinatorDetails.whatsappGroups.length} WhatsApp groups</div>
              ) : (
                <div className="text-gray-500 italic">No WhatsApp groups found</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic">No coordinator details fetched yet</div>
        )}
      </section>
      
      {/* Debug Section */}
      <section className="bg-gray-100 p-4 rounded-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Debug Collection Viewer</h2>
          <button
            onClick={fetchDebugCollection}
            disabled={loading.debug}
            className="bg-blue-500 text-white px-4 py-1 rounded disabled:bg-blue-300"
          >
            {loading.debug ? 'Loading...' : 'Fetch Collection'}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block mb-1">Collection Name:</label>
            <select
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="wtm-slp">wtm-slp</option>
              <option value="users">users</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Limit:</label>
            <input
              type="number"
              value={limitCount}
              onChange={(e) => setLimitCount(Number(e.target.value))}
              className="border rounded px-2 py-1 w-20"
            />
          </div>
        </div>

        {debugData.length > 0 ? (
          <div>
            <div className="bg-white p-4 rounded shadow mb-4">
              <h3 className="font-semibold mb-2">Document Fields</h3>
              <div className="text-sm">
                {Object.keys(debugData[0]).map(key => (
                  <span key={key} className="inline-block bg-gray-100 px-2 py-1 rounded mr-2 mb-2">{key}</span>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Documents ({debugData.length})</h3>
              <div className="overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic">No debug data fetched yet</div>
        )}
      </section>
      
      <div className="mt-8">
        <a 
          href="/wtm-slp" 
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Go to WTM-SLP Dashboard
        </a>
      </div>
    </div>
  );
} 