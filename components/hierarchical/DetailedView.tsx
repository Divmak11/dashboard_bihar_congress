// components/hierarchical/DetailedView.tsx
// Bottom panel detailed data with real data integration
import React, { useState, useEffect } from 'react';
import { fetchDetailedData, FetchMetricsOptions } from '../../app/utils/fetchHierarchicalData';
import MeetingsList from './MeetingsList';
import ActivitiesList from './ActivitiesList';
import VideosList from './VideosList';
import FormsList from './FormsList';
import ClubsList from './ClubsList';
import ChaupalsList from './ChaupalsList';

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
  dateRange
}) => {
  const [detailedData, setDetailedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch detailed data when card is selected
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCard) {
        setDetailedData([]);
        return;
      }

      setLoading(true);
      try {
        let options: FetchMetricsOptions = {
          level: selectedLevel as any || 'zone'
        };
        
        // Set up filtering options based on selected level
        if (selectedSlpId) {
          options.handler_id = selectedSlpId;
        } else if (selectedAcId) {
          const selectedAc = acs.find(ac => ac.uid === selectedAcId);
          options.handler_id = selectedAcId;
          options.assemblies = selectedAc?.assembly ? [selectedAc.assembly] : (selectedAssembly ? [selectedAssembly] : []);
        } else if (selectedAssembly) {
          options.assemblies = [selectedAssembly];
        } else if (selectedZoneId) {
          const selectedZone = zones.find(z => z.id === selectedZoneId);
          options.assemblies = selectedZone?.assemblies || [];
        }

        // Add date range if provided
        if (dateRange && dateRange.startDate && dateRange.endDate) {
          options.dateRange = dateRange;
        }

        console.log('[DetailedView] Fetching detailed data with options:', options);
        const data = await fetchDetailedData(selectedCard, options);
        setDetailedData(data);
      } catch (error) {
        console.error('[DetailedView] Error fetching detailed data:', error);
        setDetailedData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCard, selectedLevel, selectedZoneId, selectedAssembly, selectedAcId, selectedSlpId, zones, acs, dateRange]);
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
    if (selectedCard === 'meetings') {
      return <MeetingsList data={detailedData} loading={loading} />;
    }
    
    if (selectedCard === 'videos' || selectedCard === 'acVideos') {
      const videoTitle = selectedCard === 'acVideos' ? 'AC Videos' : 'Local Issue Videos';
      return <VideosList data={detailedData} loading={loading} title={videoTitle} />;
    }
    
    if (selectedCard === 'forms' || selectedCard === 'shaktiForms') {
      return <FormsList data={detailedData} loading={loading} />;
    }

    if (['clubs','shaktiClubs','centralWaGroups','assemblyWaGroups'].includes(selectedCard)) {
      return <ClubsList data={detailedData} loading={loading} activityType={selectedCard} />;
    }

    if (selectedCard === 'chaupals') {
      return <ChaupalsList data={detailedData} loading={loading} />;
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
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {getLevelContext(selectedLevel)}
            </span>
          </div>
        )}
        {renderDetailedContent()}
      </div>
    </div>
  );
};

export default DetailedView;
