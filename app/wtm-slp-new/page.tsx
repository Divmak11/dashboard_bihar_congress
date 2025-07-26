'use client';
// app/wtm-slp-new/page.tsx
// Main page for the hierarchical WTM-SLP dashboard – Basic Page Layout
import React, { useState } from 'react';
import HierarchicalNavigation, { NavigationProps } from '../../components/hierarchical/HierarchicalNavigation';
import CumulativeDataCards from '../../components/hierarchical/CumulativeDataCards';
import DetailedView from '../../components/hierarchical/DetailedView';
import DateRangeFilter from '../../components/DateRangeFilter';
import HierarchicalErrorBoundary from '../../components/hierarchical/HierarchicalErrorBoundary';
import { ToastContainer, useToast } from '../../components/Toast';
import { Zone, AC, SLP } from '../../models/hierarchicalTypes';
import { fetchZones, fetchAssemblies, fetchAssemblyCoordinators, fetchSlpsForAc, fetchCumulativeMetrics } from '../utils/fetchHierarchicalData';
import { CumulativeMetrics } from '../../models/hierarchicalTypes';
import { AppError } from '../utils/errorUtils';

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
  shaktiBaithaks: '-',
  centralWaGroups: '-',
  assemblyWaGroups: '-',
};

const HierarchicalDashboardPage: React.FC = () => {
  // Toast notifications
  const { toasts, removeToast, showError, showSuccess, showWarning } = useToast();
  
  // Global date filter state (zone/assembly level)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateOption, setDateOption] = useState<string>('All Time');

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

  // Load zones on mount
  React.useEffect(() => {
    fetchZones().then(setZones).catch(console.error);
  }, []);

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
    fetchAssemblies(selectedZoneId).then(setAssemblies).catch(console.error);
  }, [selectedZoneId]);

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
    fetchAssemblyCoordinators(selectedAssembly).then(setAcs).catch(console.error);
  }, [selectedAssembly]);

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
      
      // For Shakti SLPs, use shaktiId as handler_id, otherwise use regular logic
      let handlerId;
      if (selectedSlp?.isShaktiSLP && selectedSlp?.shaktiId) {
        handlerId = selectedSlp.shaktiId;
        console.log('[fetchMetrics] Using Shakti SLP ID as handler_id:', handlerId);
      } else {
        handlerId = selectedSlp?.handler_id || selectedSlpId;
        console.log('[fetchMetrics] Using regular SLP handler_id:', handlerId);
      }
      
      options = {
        level: 'slp',
        handler_id: handlerId,
        assemblies: selectedSlp?.assembly ? [selectedSlp.assembly] : (selectedAc?.assembly ? [selectedAc.assembly] : (selectedAssembly ? [selectedAssembly] : [])),
        dateRange: startDate && endDate ? { startDate, endDate } : undefined,
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
          // No selection - show empty metrics
          setMetrics(emptyMetrics);
          setIsLoadingMetrics(false);
          return;
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

  return (
    <>
      <HierarchicalErrorBoundary componentName="Hierarchical Dashboard">
        <div className="flex flex-col h-full">
          {/* Top bar with date filter */}
          <div className="flex justify-end p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <DateRangeFilter
              label="Global"
              startDate={startDate}
              endDate={endDate}
              selectedOption={dateOption}
              onDateChange={handleDateChange}
            />
          </div>

          {/* Main 3-panel layout */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            <HierarchicalErrorBoundary componentName="Navigation Panel">
              <HierarchicalNavigation
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
