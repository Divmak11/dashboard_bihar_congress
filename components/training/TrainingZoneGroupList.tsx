import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { TrainingZoneGroup, TrainingFormType } from '../../models/trainingTypes';
import { TrainingAssemblyCard } from './TrainingAssemblyCard';

interface TrainingZoneGroupListProps {
  groups: TrainingZoneGroup[];
  variant: TrainingFormType;
  loading?: boolean;
}

export function TrainingZoneGroupList({ groups, variant, loading = false }: TrainingZoneGroupListProps) {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const toggleZone = (zonal: string) => {
    const newExpanded = new Set(expandedZones);
    if (newExpanded.has(zonal)) {
      newExpanded.delete(zonal);
    } else {
      newExpanded.add(zonal);
    }
    setExpandedZones(newExpanded);
  };

  const getVariantColors = (variant: TrainingFormType) => {
    return variant === 'wtm' 
      ? {
          accent: 'border-blue-200 bg-blue-50',
          header: 'bg-blue-100 text-blue-900',
          badge: 'bg-blue-500 text-white'
        }
      : {
          accent: 'border-purple-200 bg-purple-50',
          header: 'bg-purple-100 text-purple-900', 
          badge: 'bg-purple-500 text-white'
        };
  };

  const colors = getVariantColors(variant);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-300 rounded mb-2 w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Training Data</h3>
        <p className="text-gray-500">No {variant === 'wtm' ? 'WTM' : 'Shakti'} training records found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isExpanded = expandedZones.has(group.zonal);
        
        return (
          <div key={group.zonal} className={`border rounded-lg ${colors.accent}`}>
            {/* Zone Header */}
            <button
              onClick={() => toggleZone(group.zonal)}
              className={`w-full px-4 py-3 ${colors.header} rounded-t-lg flex items-center justify-between hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center space-x-3">
                {isExpanded ? (
                  <ChevronDownIcon className="w-5 h-5" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5" />
                )}
                <h3 className="text-lg font-semibold">{group.zonal}</h3>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                    {group.totals.assembliesCount} Assemblies
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                    {group.totals.sessions} Sessions
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                    {group.totals.attendees.toLocaleString()} Attendees
                  </span>
                </div>
              </div>
            </button>

            {/* Zone Content */}
            {isExpanded && (
              <div className="p-4 space-y-3">
                {group.assemblies.map((assembly) => (
                  <TrainingAssemblyCard
                    key={assembly.assembly}
                    assembly={assembly}
                    variant={variant}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
