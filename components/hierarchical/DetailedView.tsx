// components/hierarchical/DetailedView.tsx
// Bottom panel detailed data with real data integration
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchDetailedData, FetchMetricsOptions } from '../../app/utils/fetchHierarchicalData';
// Optional paged API (implemented incrementally). Import guarded at runtime.
let fetchDetailedDataPaged: any = null;
try {
  // Dynamic require to avoid build errors if not yet implemented in utils
  fetchDetailedDataPaged = require('../../app/utils/fetchHierarchicalData').fetchDetailedDataPaged;
} catch {}
import MeetingsList from './MeetingsList';
import ActivitiesList from './ActivitiesList';
import VideosList from './VideosList';
import FormsList from './FormsList';
import ClubsList from './ClubsList';
import ChaupalsList from './ChaupalsList';
import NukkadMeetingsList from './NukkadMeetingsList';

interface Props {
  selectedCard?: string | null;
  selectedLevel?: string; // 'zone', 'assembly', 'ac', 'slp'
  selectedZoneId?: string | null;
  selectedAssembly?: string | null;
  selectedAcId?: string | null;
  selectedSlpId?: string | null;
  zones?: any[];
  acs?: any[];
  dateRange?: { startDate: string; endDate: string };
  selectedVertical?: string;
}

const DetailedView: React.FC<Props> = ({ 
  selectedCard, 
  selectedLevel,
  selectedZoneId,
  selectedAssembly,
  selectedAcId,
  selectedSlpId,
  zones = [],
  acs = [],
  dateRange,
  selectedVertical
}) => {
  const [detailedData, setDetailedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursorBefore, setCursorBefore] = useState<string | number | undefined>(undefined);

  // Search state (simple debounced input; realtime listeners implemented in utils separately)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // Determine if selected card is AC-level metric that should be hidden at SLP level
  const isAcLevelAtSlp = useMemo(() => {
    if (selectedLevel !== 'slp' || !selectedCard) return false;
    return ['meetings', 'volunteers', 'slps'].includes(selectedCard);
  }, [selectedLevel, selectedCard]);

  // Build common options for fetchers
  const buildOptions = useCallback((): FetchMetricsOptions => {
    const options: FetchMetricsOptions = {
      level: (selectedLevel as any) || 'zone'
    };
    if (selectedSlpId) {
      options.handler_id = selectedSlpId;
    } else if (selectedAcId) {
      const selectedAc = acs.find(ac => ac.uid === selectedAcId);
      options.handler_id = selectedAcId || undefined;
      options.assemblies = selectedAc?.assembly ? [selectedAc.assembly] : (selectedAssembly ? [selectedAssembly] : []);
    } else if (selectedAssembly) {
      options.assemblies = [selectedAssembly];
    } else if (selectedZoneId) {
      const selectedZone = zones.find(z => z.id === selectedZoneId);
      options.assemblies = selectedZone?.assemblies || [];
    }
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      options.dateRange = dateRange;
    }
    if (selectedVertical) {
      options.vertical = (selectedVertical as 'wtm' | 'shakti-abhiyaan');
    }
    return options;
  }, [selectedLevel, selectedSlpId, selectedAcId, acs, selectedAssembly, selectedZoneId, zones, dateRange, selectedVertical]);

  // Reset data when dependencies change
  useEffect(() => {
    setDetailedData([]);
    setCursorBefore(undefined);
    setHasMore(false);
  }, [selectedCard, selectedLevel, selectedZoneId, selectedAssembly, selectedAcId, selectedSlpId, dateRange, selectedVertical, zones, acs]);

  // Load initial page or perform search
  useEffect(() => {
    const run = async () => {
      if (!selectedCard) {
        setDetailedData([]);
        setHasMore(false);
        return;
      }
      if (isAcLevelAtSlp) {
        // AC-level metrics hidden at SLP level per requirements
        setDetailedData([]);
        setHasMore(false);
        return;
      }

      setLoading(true);
      try {
        const options = buildOptions();
        // If search active (debounced), we fallback to non-paged full search fetch for now
        if (debouncedSearch) {
          // Basic client-side search fallback:
          const all = await fetchDetailedData(selectedCard, options);
          const term = debouncedSearch.toLowerCase();
          const filtered = all.filter((row: any) => JSON.stringify(row).toLowerCase().includes(term));
          setDetailedData(filtered);
          setHasMore(false);
          setCursorBefore(undefined);
          return;
        }

        // Try paged fetch if available
        if (typeof fetchDetailedDataPaged === 'function') {
          const res = await fetchDetailedDataPaged(selectedCard, { ...options, pageSize: 25, cursorBefore: undefined });
          setDetailedData(res.items || []);
          setHasMore(!!res.hasMore);
          setCursorBefore(res.nextCursor?.lastOrderValue);
          return;
        }

        // Fallback to legacy full fetch and slice
        const data = await fetchDetailedData(selectedCard, options);
        setDetailedData(data.slice(0, 25));
        setHasMore(data.length > 25);
        // Derive cursor from min date-like field present
        const dateKeyGuess = ['created_at','createdAt','date_submitted','dateFormatted','date','dateOfVisit'];
        const numericDates = data
          .map((d: any) => {
            for (const k of dateKeyGuess) {
              if (typeof d[k] === 'number') return d[k];
              if (typeof d[k] === 'string') {
                const t = Date.parse(d[k]);
                if (!isNaN(t)) return t;
              }
            }
            return undefined;
          })
          .filter(Boolean) as number[];
        setCursorBefore(numericDates.length ? Math.min(...numericDates) : undefined);
      } catch (e) {
        console.error('[DetailedView] Error loading data:', e);
        setDetailedData([]);
        setHasMore(false);
        setCursorBefore(undefined);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedCard, isAcLevelAtSlp, debouncedSearch, buildOptions]);

  const handleLoadMore = async () => {
    if (!selectedCard || loading || !hasMore) return;
    setLoading(true);
    try {
      const options = buildOptions();
      if (typeof fetchDetailedDataPaged === 'function') {
        const res = await fetchDetailedDataPaged(selectedCard, { ...options, pageSize: 25, cursorBefore });
        const next = res.items || [];
        setDetailedData(prev => [...prev, ...next]);
        setHasMore(!!res.hasMore);
        setCursorBefore(res.nextCursor?.lastOrderValue);
        return;
      }
      // Legacy fallback: re-fetch all then take next slice
      const all = await fetchDetailedData(selectedCard, options);
      const nextSlice = all.slice(detailedData.length, detailedData.length + 25);
      setDetailedData(prev => [...prev, ...nextSlice]);
      setHasMore(all.length > detailedData.length + nextSlice.length);
    } catch (e) {
      console.error('[DetailedView] Load more failed:', e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };
  const getCardTitle = (cardId: string) => {
    const titles: Record<string, string> = {
      meetings: 'Meeting Details',
      volunteers: 'Volunteer Information',
      slps: 'Samvidhan Leader Details',
      saathi: 'Saathi Members',
      leaders: 'Leader Information',
      clubs: 'Club Activities',
      forms: 'Form Submissions',
      videos: 'Local Issue Videos',
      acVideos: 'AC Videos',
      waGroups: 'WhatsApp Groups',
      chaupals: 'Chaupal Sessions',
      shaktiBaithaks: 'Shakti Baithaks',
      nukkadAc: 'Nukkad Meetings (AC)',
      nukkadSlp: 'Nukkad Meetings (SLP)'
    };
    return titles[cardId] || 'Details';
  };

  const getLevelContext = (level?: string) => {
    const contexts: Record<string, string> = {
      zone: 'Zone Level',
      assembly: 'Assembly Level',
      ac: 'Assembly Coordinator Level',
      slp: 'SLP Level',
    };
    return contexts[level || ''] || 'Overview';
  };

  const renderDetailedContent = () => {
    if (!selectedCard) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 italic">
            Select a metric card above to view detailed information
          </p>
        </div>
      );
    }

    // Render specific components based on card type
    const footer = !debouncedSearch && hasMore ? (
      <div className="flex justify-center">
        <button
          onClick={handleLoadMore}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          {loading ? 'Loading…' : 'Load More'}
        </button>
      </div>
    ) : undefined;

    if (selectedCard === 'meetings') {
      return <MeetingsList data={detailedData} loading={loading} footer={footer} />;
    }
    
    if (selectedCard === 'videos' || selectedCard === 'acVideos') {
      const videoTitle = selectedCard === 'acVideos' ? 'AC Videos' : 'Local Issue Videos';
      return <VideosList data={detailedData} loading={loading} title={videoTitle} footer={footer} />;
    }
    
    if (selectedCard === 'forms' || selectedCard === 'shaktiForms') {
      return <FormsList data={detailedData} loading={loading} footer={footer} />;
    }

    if (['clubs','shaktiClubs','centralWaGroups','assemblyWaGroups','shaktiAssemblyWaGroups'].includes(selectedCard)) {
      return <ClubsList data={detailedData} loading={loading} activityType={selectedCard} footer={footer} />;
    }

    if (selectedCard === 'chaupals') {
      return <ChaupalsList data={detailedData} loading={loading} footer={footer} />;
    }

    if (selectedCard === 'nukkadAc' || selectedCard === 'nukkadSlp') {
      return <NukkadMeetingsList data={detailedData} loading={loading} footer={footer} />;
    }

    // For all other activity types, use ActivitiesList
    // Enable column filtering only for specific metric cards that support the standard filter columns
    const supportsColumnFilter = ['volunteers', 'slps'].includes(selectedCard);
    
    return (
      <ActivitiesList 
        data={detailedData} 
        loading={loading} 
        activityType={selectedCard}
        showColumnFilter={supportsColumnFilter}
        footer={footer}
      />
    );
  };

  return (
    <div className="w-full p-4 border-t border-gray-200 bg-gray-50">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        {selectedCard && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {getCardTitle(selectedCard)}
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search across results…"
                  className="w-56 pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
                <svg className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {getLevelContext(selectedLevel)}
              </span>
            </div>
          </div>
        )}
        {renderDetailedContent()}
      </div>
    </div>
  );

};

export default DetailedView;
