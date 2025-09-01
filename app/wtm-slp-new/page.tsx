'use client';
// app/wtm-slp-new/page.tsx
// Main page for the hierarchical WTM-SLP dashboard – Basic Page Layout
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HierarchicalNavigation, { NavigationProps } from '../../components/hierarchical/HierarchicalNavigation';
import CumulativeDataCards from '../../components/hierarchical/CumulativeDataCards';
import DetailedView from '../../components/hierarchical/DetailedView';
import DateRangeFilter from '../../components/DateRangeFilter';
import HierarchicalErrorBoundary from '../../components/hierarchical/HierarchicalErrorBoundary';
import { ToastContainer, useToast } from '../../components/Toast';
import { Zone, AC, SLP } from '../../models/hierarchicalTypes';
import ReportGenerator from '../../components/ReportGenerator';
import { fetchZones, fetchAssemblies, fetchAssemblyCoordinatorsForWTM, fetchAssemblyCoordinatorsForShakti, fetchSlpsForAc, fetchCumulativeMetrics } from '../utils/fetchHierarchicalData';
import { CumulativeMetrics } from '../../models/hierarchicalTypes';
import { AppError } from '../utils/errorUtils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/firebase';
import { signOut } from 'firebase/auth';
import { getCurrentAdminUser } from '../utils/fetchFirebaseData';
import { AdminUser } from '../../models/types';

// Placeholder metrics; real data will be fetched in Phase 2
const emptyMetrics: CumulativeMetrics = {
  meetings: '-',
  volunteers: '-',
  slps: '-',
  saathi: '-',
  shaktiLeaders: '-',
  shaktiSaathi: '-',
  clubs: '-',
  shaktiClubs: '-',
  forms: '-',
  shaktiForms: '-',
  videos: '-',
  acVideos: '-',
  chaupals: '-',
  shaktiVideos: '-',
  shaktiBaithaks: '-',
  centralWaGroups: '-',
  assemblyWaGroups: '-',
};

const HierarchicalDashboardPage: React.FC = () => {
  // Toast notifications
  const { toasts, removeToast, showError, showSuccess, showWarning } = useToast();
  
  // Authentication state
  const router = useRouter();
  const [user, authLoading, authError] = useAuthState(auth);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  
  // Global date filter state (zone/assembly level)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateOption, setDateOption] = useState<string>('All Time');

  // Vertical selection state ('wtm' | 'shakti-abhiyaan')
  const [selectedVertical, setSelectedVertical] = useState<string>('wtm');
  // Determine role-based vertical behavior
  const isZonalIncharge = adminUser?.role === 'zonal-incharge';
  const isDeptHead = adminUser?.role === 'dept-head';
  const shouldLockVertical = isZonalIncharge || isDeptHead;
  const lockedVertical = shouldLockVertical ? (adminUser?.parentVertical || 'wtm') : undefined;

  // Navigation state
  const [zones, setZones] = useState<Zone[]>([]);
  const [assemblies, setAssemblies] = useState<string[]>([]);
  const [acs, setAcs] = useState<AC[]>([]);
  const [slps, setSlps] = useState<SLP[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null);
  const [selectedAcId, setSelectedAcId] = useState<string | null>(null);
  const [selectedSlpId, setSelectedSlpId] = useState<string | null>(null);

  // Card selection state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Metrics state
  const [metrics, setMetrics] = useState<CumulativeMetrics>(emptyMetrics);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);

  // Fetch user data when authenticated
  React.useEffect(() => {
    if (user) {
      getCurrentAdminUser(user.uid).then(setAdminUser).catch(console.error);
    }
  }, [user]);

  // Load zones when vertical changes
  React.useEffect(() => {
    if (selectedVertical && adminUser) {
      const loadZonesWithVirtual = async () => {
        try {
          // Fetch regular zones and filter by vertical
          const allZones = await fetchZones();
          const filteredZones = allZones.filter(zone => zone.parentVertical === selectedVertical);
          
          console.log(`[Virtual Zone Debug] Loading zones for user:`, {
            role: adminUser.role,
            selectedVertical,
            parentVertical: adminUser.parentVertical,
            hasAssemblies: !!adminUser.assemblies,
            assembliesCount: adminUser.assemblies?.length || 0
          });

          let virtualZones: Zone[] = [];

          if (adminUser.role === 'admin') {
            // Admin sees virtual zones for ALL dept-head users
            console.log(`[Virtual Zone] Admin user - fetching all dept-head users`);
            
            // Import Firebase functions we need
            const { collection, query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../utils/firebase');
            
            // Fetch all dept-head users for this vertical
            const adminUsersRef = collection(db, 'admin-users');
            const deptHeadQuery = firestoreQuery(
              adminUsersRef, 
              where('role', '==', 'dept-head'),
              where('parentVertical', '==', selectedVertical)
            );
            
            const deptHeadSnapshot = await getDocs(deptHeadQuery);
            
            deptHeadSnapshot.forEach((doc) => {
              const deptHeadUser = { id: doc.id, ...doc.data() } as AdminUser;
              
              if (deptHeadUser.assemblies && deptHeadUser.assemblies.length > 0) {
                const userName = deptHeadUser.name || 'Unknown';
                const userRole = deptHeadUser.role || 'dept-head';
                
                const virtualZone: Zone = {
                  id: `dept-${deptHeadUser.id}`,
                  name: `Zone - ${userName}_${userRole}`,
                  assemblies: Array.from(new Set(deptHeadUser.assemblies.map(a => (a || '').trim()).filter(Boolean))),
                  parentVertical: selectedVertical,
                };
                
                virtualZones.push(virtualZone);
                
                console.log(`[Virtual Zone] Created virtual zone for dept-head ${userName}:`, {
                  id: virtualZone.id,
                  assembliesCount: virtualZone.assemblies.length
                });
              }
            });
            
          } else if (adminUser.role === 'dept-head' && 
                     !adminUser.role.includes('zonal-incharge') && 
                     adminUser.assemblies && 
                     adminUser.assemblies.length > 0) {
            // Dept-head sees only their own virtual zone
            console.log(`[Virtual Zone] Dept-head user - creating own virtual zone`);
            
            const userName = adminUser.name || 'Unknown';
            const userRole = adminUser.role || 'dept-head';
            
            const virtualZone: Zone = {
              id: `dept-${adminUser.id}`,
              name: `Zone - ${userName}_${userRole}`,
              assemblies: Array.from(new Set(adminUser.assemblies.map(a => (a || '').trim()).filter(Boolean))),
              parentVertical: adminUser.parentVertical || selectedVertical,
            };
            
            virtualZones.push(virtualZone);
            
            console.log(`[Virtual Zone] Created virtual zone for current dept-head:`, {
              id: virtualZone.id,
              assembliesCount: virtualZone.assemblies.length
            });
          }

          // Combine virtual zones with regular zones (virtual zones first)
          const allZonesWithVirtual = [...virtualZones, ...filteredZones];
          setZones(allZonesWithVirtual);
          
          console.log(`[Virtual Zone] Final zones count:`, {
            virtualZones: virtualZones.length,
            regularZones: filteredZones.length,
            total: allZonesWithVirtual.length
          });
          
        } catch (error) {
          console.error('[Virtual Zone] Error loading zones:', error);
          setZones([]);
        }
      };

      loadZonesWithVirtual();
    }
  }, [selectedVertical, adminUser]);

  // Lock vertical based on role (zonal-incharge and dept-head)
  React.useEffect(() => {
    if (shouldLockVertical && lockedVertical && selectedVertical !== lockedVertical) {
      setSelectedVertical(lockedVertical);
      // reset hierarchy selections when vertical changes
      setSelectedZoneId(null);
      setSelectedAssembly(null);
      setSelectedAcId(null);
      setSelectedSlpId(null);
    }
  }, [shouldLockVertical, lockedVertical, selectedVertical]);

  // Load assemblies when zone changes
  React.useEffect(() => {
    if (!selectedZoneId) {
      setAssemblies([]);
      setSelectedAssembly(null);
      setSelectedAcId(null);
      setSelectedSlpId(null);
      return;
    }
    // Reset child selections when zone changes
    setSelectedAssembly(null);
    setSelectedAcId(null);
    setSelectedSlpId(null);

    // Handle virtual dept-head/admin zone selection by using assemblies from the selected zone object
    if (selectedZoneId.startsWith('dept-')) {
      const selectedZone = zones.find(z => z.id === selectedZoneId);
      const assembliesFromZone = Array.from(new Set((selectedZone?.assemblies || []).map(a => (a || '').trim()).filter(Boolean)));
      setAssemblies(assembliesFromZone);
      return;
    }

    fetchAssemblies(selectedZoneId).then(setAssemblies).catch(console.error);
  }, [selectedZoneId, zones]);

  // Load ACs when assembly changes
  React.useEffect(() => {
    if (!selectedAssembly) {
      setAcs([]);
      setSelectedAcId(null);
      setSelectedSlpId(null);
      return;
    }
    // Reset child selections when assembly changes
    setSelectedAcId(null);
    setSelectedSlpId(null);
    
    // Use vertical-specific AC fetching
    if (selectedVertical === 'wtm') {
      fetchAssemblyCoordinatorsForWTM(selectedAssembly).then(setAcs).catch(console.error);
    } else if (selectedVertical === 'shakti-abhiyaan') {
      fetchAssemblyCoordinatorsForShakti(selectedAssembly).then(setAcs).catch(console.error);
    }
  }, [selectedAssembly, selectedVertical]);

  // Load SLPs when AC changes
  React.useEffect(() => {
    if (!selectedAcId) {
      setSlps([]);
      setSelectedSlpId(null);
      return;
    }
    fetchSlpsForAc(selectedAcId).then(setSlps).catch(console.error);
  }, [selectedAcId]);

  // Fetch metrics when hierarchy changes
  React.useEffect(() => {
    const fetchMetrics = async () => {
      console.log('[Metrics] Fetching with state:', {
        selectedZoneId,
        selectedAssembly,
        selectedAcId,
        selectedSlpId,
        startDate,
        endDate
      });
      setIsLoadingMetrics(true);
      try {
        let options: any = {};
        
        if (selectedSlpId) {
      // SLP level - filter by SLP's handler_id
      const selectedSlp = slps.find(s => s.uid === selectedSlpId);
      const selectedAc = acs.find(ac => ac.uid === selectedAcId);
      
      // For Shakti SLPs, use shaktiId as handler_id, for regular SLPs use document ID only
      let handlerId;
      if (selectedSlp?.isShaktiSLP && selectedSlp?.shaktiId) {
        handlerId = selectedSlp.shaktiId;
        console.log('[fetchMetrics] Using Shakti SLP ID as handler_id:', handlerId);
      } else {
        handlerId = selectedSlpId; // Use document ID only for regular SLPs
        console.log('[fetchMetrics] Using regular SLP document ID as handler_id:', handlerId);
      }
      
      options = {
        level: 'slp',
        handler_id: handlerId,
        assemblies: selectedSlp?.assembly ? [selectedSlp.assembly] : (selectedAc?.assembly ? [selectedAc.assembly] : (selectedAssembly ? [selectedAssembly] : [])),
        dateRange: startDate && endDate ? { startDate, endDate } : undefined,
        slp: selectedSlp ? {
          uid: selectedSlp.uid,
          handler_id: selectedSlp.handler_id,
          isShaktiSLP: selectedSlp.isShaktiSLP,
          shaktiId: selectedSlp.shaktiId
        } : undefined,
      };
    } else if (selectedAcId) {
          // AC level - include both handler_id and assembly filter
          const selectedAc = acs.find(ac => ac.uid === selectedAcId);
          options = {
            level: 'ac',
            handler_id: selectedAcId,
            assemblies: selectedAc?.assembly ? [selectedAc.assembly] : (selectedAssembly ? [selectedAssembly] : []),
            dateRange: startDate && endDate ? { startDate, endDate } : undefined,
          };
        } else if (selectedAssembly) {
          // Assembly level
          options = {
            level: 'assembly',
            assemblies: [selectedAssembly],
            dateRange: startDate && endDate ? { startDate, endDate } : undefined,
          };
        } else if (selectedZoneId) {
          // Zone level
          const selectedZone = zones.find(z => z.id === selectedZoneId);
          options = {
            level: 'zone',
            assemblies: selectedZone?.assemblies || [],
            dateRange: startDate && endDate ? { startDate, endDate } : undefined,
          };
        } else {
          // Vertical level - show global metrics across all zones and assemblies
          options = {
            level: 'vertical',
            dateRange: startDate && endDate ? { startDate, endDate } : undefined,
          };
        }
        
        const fetchedMetrics = await fetchCumulativeMetrics(options);
        setMetrics(fetchedMetrics);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        
        // Handle AppError with user-friendly messages
        if (error && typeof error === 'object' && 'userMessage' in error) {
          const appError = error as AppError;
          showError('Data Loading Error', appError.userMessage);
        } else {
          showError('Data Loading Error', 'Failed to load dashboard data. Please try again.');
        }
        
        setMetrics(emptyMetrics);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchMetrics();
  // Note: showError is intentionally excluded from dependency list to avoid function reference changes triggering infinite re-fetch loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId, selectedAssembly, selectedAcId, selectedSlpId, startDate, endDate, zones, acs]);

  const handleDateChange = (start: string, end: string, option: string) => {
    console.log('[HierarchicalDashboard] Date filter changed:', { start, end, option });
    setStartDate(start);
    setEndDate(end);
    setDateOption(option);
    // Data refetch is automatically triggered by useEffect dependency on startDate/endDate
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCard(cardId);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear the auth token cookie to avoid middleware redirecting back to '/'
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      router.push('/auth');
    } catch (e) {
      console.error('Logout error:', e);
      showError('Logout Failed', 'Could not log out. Please try again.');
    }
  };

  // Custom navigation handlers to ensure proper state reset
  const handleZoneChange = (zoneId: string) => {
    console.log('[Navigation] Zone changed to:', zoneId);
    setSelectedZoneId(zoneId);
    // Child selections will be reset by useEffect
  };

  const handleAssemblyChange = (assembly: string) => {
    console.log('[Navigation] Assembly changed to:', assembly);
    setSelectedAssembly(assembly);
    // Child selections will be reset by useEffect
  };

  const handleAcChange = (acId: string) => {
    console.log('[Navigation] AC changed to:', acId);
    setSelectedAcId(acId);
    // Child selections will be reset by useEffect
  };

  const handleSlpChange = (slpId: string) => {
    console.log('[Navigation] SLP changed to:', slpId);
    setSelectedSlpId(slpId);
  };

  // Vertical change handler
  const handleVerticalChange = (vertical: string) => {
    if (shouldLockVertical) return; // no-op when locked by role
    console.log('[Navigation] Vertical changed to:', vertical);
    setSelectedVertical(vertical);
    // reset hierarchy selections
    setSelectedZoneId(null);
    setSelectedAssembly(null);
    setSelectedAcId(null);
    setSelectedSlpId(null);
  };

  return (
    <>
      <HierarchicalErrorBoundary componentName="Hierarchical Dashboard">
        <div className="flex flex-col h-full">
          {/* Top bar with date filter and logout */}
          <div className="flex items-center justify-end gap-3 p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <DateRangeFilter
              label="Global"
              startDate={startDate}
              endDate={endDate}
              selectedOption={dateOption}
              onDateChange={handleDateChange}
            />
            <ReportGenerator
              currentDateFilter={{
                startDate,
                endDate,
                dateOption
              }}
              selectedVertical={selectedVertical}
            />
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Logout
            </button>
          </div>

          {/* Main 3-panel layout */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            <HierarchicalErrorBoundary componentName="Navigation Panel">
              <HierarchicalNavigation
                selectedVertical={selectedVertical}
                onVerticalChange={handleVerticalChange}
                hideVerticalSelector={!!isZonalIncharge}
                disableVerticalSelector={!!isDeptHead}
                zones={zones}
                assemblies={assemblies}
                acs={acs}
                slps={slps}
                selectedZoneId={selectedZoneId}
                selectedAssembly={selectedAssembly}
                selectedAcId={selectedAcId}
                selectedSlpId={selectedSlpId}
                onZoneChange={handleZoneChange}
                onAssemblyChange={handleAssemblyChange}
                onAcChange={handleAcChange}
                onSlpChange={handleSlpChange}
              />
            </HierarchicalErrorBoundary>
            
            <HierarchicalErrorBoundary componentName="Data Cards Panel">
              <CumulativeDataCards 
                metrics={isLoadingMetrics ? emptyMetrics : metrics} 
                onCardSelect={handleCardSelect}
                isLoading={isLoadingMetrics}
                selectedVertical={selectedVertical}
                selectedAssembly={selectedAssembly}
                acs={acs}
                selectedAcId={selectedAcId}
              />
            </HierarchicalErrorBoundary>
          </div>

          {/* Bottom detailed panel */}
          <HierarchicalErrorBoundary componentName="Detailed View Panel">
            <DetailedView 
              selectedCard={selectedCard}
              selectedLevel={selectedSlpId ? 'slp' : selectedAcId ? 'ac' : selectedAssembly ? 'assembly' : selectedZoneId ? 'zone' : undefined}
              selectedZoneId={selectedZoneId}
              selectedAssembly={selectedAssembly}
              selectedAcId={selectedAcId}
              selectedSlpId={selectedSlpId}
              zones={zones}
              acs={acs}
              dateRange={startDate && endDate ? { startDate, endDate } : undefined}
            />
          </HierarchicalErrorBoundary>
        </div>
      </HierarchicalErrorBoundary>
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

export default HierarchicalDashboardPage;
