'use client';

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/utils/firebase';
import { useRouter } from 'next/navigation';
import WhatsappTabs from '@/components/whatsapp/WhatsappTabs';
import WhatsappGroupsList from '@/components/whatsapp/WhatsappGroupsList';
import { 
  WhatsappFormType, 
  WhatsappPageData, 
  WhatsappTabCounts,
  FORM_TYPE_CONFIG 
} from '@/models/whatsappTypes';
import { 
  fetchAllWhatsappData, 
  fetchWhatsappTabCounts 
} from '@/app/utils/fetchWhatsappData';

export default function WhatsappDataPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WhatsappFormType>('shakti');
  const [whatsappData, setWhatsappData] = useState<WhatsappPageData | null>(null);
  const [tabCounts, setTabCounts] = useState<WhatsappTabCounts>({ shakti: 0, wtm: 0, public: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setDataLoading(true);
      setError(null);
      
      try {
        console.log('[WhatsappDataPage] Loading WhatsApp data...');
        
        // Fetch tab counts and data in parallel
        const [counts, data] = await Promise.all([
          fetchWhatsappTabCounts(),
          fetchAllWhatsappData()
        ]);
        
        setTabCounts(counts);
        setWhatsappData(data);
        
        console.log('[WhatsappDataPage] Data loaded successfully');
      } catch (err) {
        console.error('[WhatsappDataPage] Error loading data:', err);
        setError('Failed to load WhatsApp data. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleTabChange = (tab: WhatsappFormType) => {
    console.log(`[WhatsappDataPage] Switching to tab: ${tab}`);
    setActiveTab(tab);
  };

  const getActiveTabData = () => {
    if (!whatsappData) return [];
    
    switch (activeTab) {
      case 'shakti':
        return whatsappData.shaktiData;
      case 'wtm':
        return whatsappData.wtmData;
      case 'public':
        return whatsappData.publicData;
      default:
        return [];
    }
  };

  // Show loading state during authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const activeTabData = getActiveTabData();
  const activeConfig = FORM_TYPE_CONFIG[activeTab];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">WhatsApp Data</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage and view WhatsApp groups across different team types
                </p>
              </div>
              
              <button
                onClick={() => router.push('/home')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {whatsappData && !dataLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">G</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Groups</dt>
                      <dd className="text-lg font-medium text-gray-900">{whatsappData.summary.totalGroups}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">M</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Members</dt>
                      <dd className="text-lg font-medium text-gray-900">{whatsappData.summary.totalMembers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">A</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Assemblies</dt>
                      <dd className="text-lg font-medium text-gray-900">{whatsappData.summary.totalAssemblies}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 ${activeConfig.color} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-sm font-medium">T</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{activeConfig.label}</dt>
                      <dd className="text-lg font-medium text-gray-900">{tabCounts[activeTab]}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white shadow rounded-lg">
          {/* Tabs */}
          <div className="px-6 pt-6">
            <WhatsappTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              tabCounts={tabCounts}
              loading={dataLoading}
            />
          </div>

          {/* Tab Content */}
          <div className="px-6 py-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!dataLoading && !error && (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">
                    {activeConfig.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {activeConfig.description}
                  </p>
                </div>

                <WhatsappGroupsList
                  data={activeTabData}
                  formType={activeTab}
                  loading={dataLoading}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
