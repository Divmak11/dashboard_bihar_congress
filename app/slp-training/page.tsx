"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebase";
import { getCurrentAdminUser } from "../utils/fetchFirebaseData";
import { fetchSlpTrainingPageData } from "../utils/fetchSlpTrainingData";
import { SlpTrainingPageData, SlpTrainingAssemblyGroup } from "../../models/slpTrainingTypes";

export default function SlpTrainingPage() {
  const [user, authLoading, authError] = useAuthState(auth);
  const router = useRouter();
  const [data, setData] = useState<SlpTrainingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Authentication and role check
  useEffect(() => {
    async function checkAuth() {
      if (authLoading) return;
      
      if (!user) {
        router.push('/auth');
        return;
      }

      try {
        const adminUser = await getCurrentAdminUser(user.uid);
        if (adminUser && adminUser.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push('/wtm-slp-new');
          return;
        }
      } catch (error) {
        console.error('[SlpTrainingPage] Auth error:', error);
        setIsAdmin(false);
        router.push('/auth');
      }
    }

    checkAuth();
  }, [user, authLoading, router]);

  // Fetch SLP training data
  useEffect(() => {
    async function loadData() {
      if (!user || isAdmin !== true) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const slpTrainingData = await fetchSlpTrainingPageData();
        setData(slpTrainingData);
        
        // Auto-expand first few assemblies for better UX
        const firstThreeAssemblies = slpTrainingData.assemblies.slice(0, 3).map(a => a.assembly);
        setExpandedAssemblies(new Set(firstThreeAssemblies));
        
      } catch (err) {
        console.error('[SlpTrainingPage] Error loading data:', err);
        setError('Failed to load SLP training data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, isAdmin]);

  // Filter assemblies based on search term
  const filteredAssemblies = data?.assemblies.filter(assembly =>
    assembly.assembly.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.slps.some(slp => slp.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const toggleAssemblyExpansion = (assembly: string) => {
    const newExpanded = new Set(expandedAssemblies);
    if (newExpanded.has(assembly)) {
      newExpanded.delete(assembly);
    } else {
      newExpanded.add(assembly);
    }
    setExpandedAssemblies(newExpanded);
  };

  const expandAll = () => {
    setExpandedAssemblies(new Set(filteredAssemblies.map(a => a.assembly)));
  };

  const collapseAll = () => {
    setExpandedAssemblies(new Set());
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">Loading SLP Training Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SLP Training Records</h1>
              <p className="text-gray-600 mt-1">Trained Samvidhan Leaders by Assembly</p>
            </div>
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total SLPs</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.totalSlps.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Trained</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.trainedCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Assemblies</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.totalAssemblies}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg per Assembly</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.totalAssemblies > 0 
                    ? Math.round(data.summary.totalSlps / data.summary.totalAssemblies) 
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search assemblies or SLP names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-600">
              Found {filteredAssemblies.length} assemblies matching {searchTerm}
            </div>
          )}
        </div>

        {/* Assembly Groups */}
        <div className="space-y-4">
          {filteredAssemblies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="text-gray-400 text-lg mb-2">🔍</div>
              <p className="text-gray-600">No results found</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredAssemblies.map((assemblyGroup) => (
              <div key={assemblyGroup.assembly} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Assembly Header */}
                <div
                  onClick={() => toggleAssemblyExpansion(assemblyGroup.assembly)}
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{assemblyGroup.assembly} Assembly</h3>
                        <p className="text-sm text-gray-600">
                          {assemblyGroup.slpCount} trained SLP{assemblyGroup.slpCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        {assemblyGroup.slpCount}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedAssemblies.has(assemblyGroup.assembly) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* SLP List */}
                {expandedAssemblies.has(assemblyGroup.assembly) && (
                  <div className="p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assemblyGroup.slps.map((slp) => (
                        <div key={slp.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{slp.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">📱 {slp.mobile_number}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  slp.status === 'trained' 
                                    ? 'bg-green-100 text-green-800' 
                                    : slp.status === 'in-progress'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {slp.status === 'trained' ? '✅ Trained' : slp.status === 'in-progress' ? '🔄 In Progress' : '⏳ Pending'}
                                </span>
                              </div>
                              {slp.trainingDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Training: {new Date(slp.trainingDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
