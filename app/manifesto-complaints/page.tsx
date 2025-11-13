"use client";

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/utils/firebase';
import type { 
  ManifestoComplaintFirebaseRecord, 
  ManifestoComplaintsFetchResponse, 
  ManifestoComplaintsImportResponse 
} from '@/models/manifestoComplaintsTypes';
import { 
  fetchManifestoComplaintsFromFirebase, 
  hasManifestoComplaintsData, 
  getManifestoComplaintsCount 
} from '@/app/utils/fetchManifestoComplaintsData';

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ManifestoComplaintsPage() {
  const [user] = useAuthState(auth);
  const [selectedTab, setSelectedTab] = useState<'ac' | 'panchayat'>('ac');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acData, setAcData] = useState<ManifestoComplaintFirebaseRecord[]>([]);
  const [panchayatData, setPanchayatData] = useState<ManifestoComplaintFirebaseRecord[]>([]);
  const [hasAcData, setHasAcData] = useState(false);
  const [hasPanchayatData, setHasPanchayatData] = useState(false);
  const [acCount, setAcCount] = useState(0);
  const [panchayatCount, setPanchayatCount] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const acColumns = useMemo(() => [
    { key: 'ac_name', label: 'AC Name' },
    { key: 'district', label: 'District' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'village', label: 'Village' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'all_encompassing_demands_over_development', label: 'Development demands' },
    { key: 'grievances_arising_out_of_land_disputes_and_ownership_deficiancy', label: 'Land disputes grievances' },
    { key: 'explicit_inexplicit_struggles_caused_due_to_caste_discrimination', label: 'Caste discrimination struggles' },
    { key: 'demands_and_grievances_related_to_educational_apparatus', label: 'Education grievances' },
    { key: 'grievances_due_to_criminal_activities', label: 'Criminal activity grievances' },
    { key: 'grievances_related_to_the_situation_of_agriculture_agriculturists_and_peasents', label: 'Agriculture grievances' },
    { key: 'specific_demands_to_tackle_grievances_arisen_due_to_lack_of_infrastructure', label: 'Infrastructure demands' },
    { key: 'complaints_and_grievances_related_to_inaccessibility_of_welfare_services', label: 'Welfare access grievances' },
  ] as const, []);

  const panchayatColumns = useMemo(() => [
    { key: 'panchayat_name', label: 'Panchayat Name' },
    { key: 'vard', label: 'Vard' },
    { key: 'district', label: 'District' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'village', label: 'Village' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'health_service_oriented_grievances', label: 'Health service grievances' },
    { key: 'water_linked_grievances', label: 'Water grievances' },
    { key: 'grievances_resultant_of_prohibition', label: 'Prohibition grievances' },
    { key: 'demands_around_tackling_unemployement', label: 'Unemployment demands' },
    { key: 'all_encompassing_demands_over_development', label: 'Development demands' },
    { key: 'grievances_arising_out_of_land_disputes_and_ownership_deficiancy', label: 'Land disputes grievances' },
    { key: 'explicit_inexplicit_struggles_caused_due_to_caste_discrimination', label: 'Caste discrimination struggles' },
    { key: 'demands_and_grievances_related_to_educational_apparatus', label: 'Education grievances' },
    { key: 'grievances_due_to_criminal_activities', label: 'Criminal activity grievances' },
    { key: 'grievances_related_to_the_situation_of_agriculture_agriculturists_and_peasents', label: 'Agriculture grievances' },
    { key: 'specific_demands_to_tackle_grievances_arisen_due_to_lack_of_infrastructure', label: 'Infrastructure demands' },
    { key: 'complaints_and_grievances_related_to_inaccessibility_of_welfare_services', label: 'Welfare access grievances' },
  ] as const, []);

  async function fetchAcFirebaseData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/manifesto-complaints/fetch?limit=100&formType=ac-manifesto');
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: ManifestoComplaintsFetchResponse = await res.json();
      
      if (json.success) {
        setAcData(json.entries || []);
        setAcCount(json.total);
      } else {
        throw new Error('Failed to fetch AC data from Firebase');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load AC data from Firebase');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPanchayatFirebaseData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/manifesto-complaints/fetch?limit=100&formType=panchayat-manifesto');
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: ManifestoComplaintsFetchResponse = await res.json();
      
      if (json.success) {
        setPanchayatData(json.entries || []);
        setPanchayatCount(json.total);
      } else {
        throw new Error('Failed to fetch Panchayat data from Firebase');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load Panchayat data from Firebase');
    } finally {
      setLoading(false);
    }
  }

  async function checkDataStatus() {
    try {
      // Check AC data
      const acRes = await fetch('/api/manifesto-complaints/fetch?limit=1&formType=ac-manifesto');
      if (acRes.ok) {
        const acJson: ManifestoComplaintsFetchResponse = await acRes.json();
        setHasAcData(acJson.success && acJson.total > 0);
        setAcCount(acJson.total || 0);
      }

      // Check Panchayat data
      const panchayatRes = await fetch('/api/manifesto-complaints/fetch?limit=1&formType=panchayat-manifesto');
      if (panchayatRes.ok) {
        const panchayatJson: ManifestoComplaintsFetchResponse = await panchayatRes.json();
        setHasPanchayatData(panchayatJson.success && panchayatJson.total > 0);
        setPanchayatCount(panchayatJson.total || 0);
      }
    } catch (e) {
      console.warn('Failed to check data status:', e);
    }
  }

  async function handleAcImport() {
    setImporting(true);
    setError(null);
    setImportStatus(null);
    try {
      const res = await fetch('/api/manifesto-complaints/import', { method: 'POST' });
      if (!res.ok) throw new Error(`AC Import failed ${res.status}`);
      
      const json: ManifestoComplaintsImportResponse = await res.json();
      if (json.success) {
        setImportStatus(json.message);
        await checkDataStatus();
        if (json.imported > 0) {
          await fetchAcFirebaseData();
        }
      } else {
        throw new Error(json.message || 'AC Import failed');
      }
    } catch (e: any) {
      setError(e?.message || 'AC Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handlePanchayatImport() {
    setImporting(true);
    setError(null);
    setImportStatus(null);
    try {
      const res = await fetch('/api/manifesto-complaints/import-panchayat', { method: 'POST' });
      if (!res.ok) throw new Error(`Panchayat Import failed ${res.status}`);
      
      const json: ManifestoComplaintsImportResponse = await res.json();
      if (json.success) {
        setImportStatus(json.message);
        await checkDataStatus();
        if (json.imported > 0) {
          await fetchPanchayatFirebaseData();
        }
      } else {
        throw new Error(json.message || 'Panchayat Import failed');
      }
    } catch (e: any) {
      setError(e?.message || 'Panchayat Import failed');
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    checkDataStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedTab === 'ac' && hasAcData) {
      fetchAcFirebaseData();
    }
  }, [selectedTab, hasAcData]);

  useEffect(() => {
    if (selectedTab === 'panchayat' && hasPanchayatData) {
      fetchPanchayatFirebaseData();
    }
  }, [selectedTab, hasPanchayatData]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manifesto Complaints</h1>
          <p className="text-sm text-gray-600 mt-1">Excel import based complaints listing</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/home" className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm">Back to Home</Link>
          {selectedTab === 'ac' && !hasAcData && (
            <button
              onClick={handleAcImport}
              disabled={importing}
              className={classNames(
                'px-4 py-2 rounded-lg text-white text-sm',
                importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              )}
            >
              {importing ? 'Importing...' : 'Import AC Excel'}
            </button>
          )}
          {selectedTab === 'panchayat' && !hasPanchayatData && (
            <button
              onClick={handlePanchayatImport}
              disabled={importing}
              className={classNames(
                'px-4 py-2 rounded-lg text-white text-sm',
                importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              )}
            >
              {importing ? 'Importing...' : 'Import Panchayat Excel'}
            </button>
          )}
          {selectedTab === 'ac' && hasAcData && (
            <button
              onClick={fetchAcFirebaseData}
              disabled={loading}
              className={classNames(
                'px-4 py-2 rounded-lg text-white text-sm',
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {loading ? 'Refreshing...' : 'Refresh AC Data'}
            </button>
          )}
          {selectedTab === 'panchayat' && hasPanchayatData && (
            <button
              onClick={fetchPanchayatFirebaseData}
              disabled={loading}
              className={classNames(
                'px-4 py-2 rounded-lg text-white text-sm',
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {loading ? 'Refreshing...' : 'Refresh Panchayat Data'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setSelectedTab('ac')}
            className={classNames(
              selectedTab === 'ac'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
            )}
          >
            AC-Manifesto
          </button>
          <button
            onClick={() => setSelectedTab('panchayat')}
            className={classNames(
              selectedTab === 'panchayat'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
            )}
          >
            Panchayat-Manifesto
          </button>
        </nav>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">{error}</div>
      )}

      {importStatus && (
        <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded">{importStatus}</div>
      )}

      {selectedTab === 'ac' && !hasAcData && !importing && (
        <div className="p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">
          <div className="font-medium">No AC data found in Firebase</div>
          <div className="text-sm mt-1">Click &quot;Import AC Excel&quot; to load AC manifesto data from the Excel file into Firebase.</div>
        </div>
      )}
      
      {selectedTab === 'panchayat' && !hasPanchayatData && !importing && (
        <div className="p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">
          <div className="font-medium">No Panchayat data found in Firebase</div>
          <div className="text-sm mt-1">Click &quot;Import Panchayat Excel&quot; to load Panchayat manifesto data from the Excel file into Firebase.</div>
        </div>
      )}

      {selectedTab === 'ac' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">AC-Manifesto Entries</h2>
            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold">{loading ? '-' : acCount}</span>
              {hasAcData && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">From Firebase</span>}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    {acColumns.map((col) => (
                      <th key={col.key as string} className="px-3 py-2 text-left whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {acColumns.map((col) => (
                        <td key={String(col.key)} className="px-3 py-2 align-top text-gray-800">
                          {(() => {
                            const v = (row as any)[col.key];
                            return v === undefined || v === null || String(v).trim() === '' ? '-' : String(v);
                          })()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'panchayat' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Panchayat-Manifesto Entries</h2>
            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold">{loading ? '-' : panchayatCount}</span>
              {hasPanchayatData && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">From Firebase</span>}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    {panchayatColumns.map((col) => (
                      <th key={col.key as string} className="px-3 py-2 text-left whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {panchayatData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {panchayatColumns.map((col) => (
                        <td key={String(col.key)} className="px-3 py-2 align-top text-gray-800">
                          {(() => {
                            const v = (row as any)[col.key];
                            return v === undefined || v === null || String(v).trim() === '' ? '-' : String(v);
                          })()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
