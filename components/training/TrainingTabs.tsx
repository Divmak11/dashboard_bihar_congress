import React from 'react';
import { TrainingFormType, TrainingTabCounts } from '../../models/trainingTypes';

interface TrainingTabsProps {
  activeTab: TrainingFormType;
  onTabChange: (tab: TrainingFormType) => void;
  counts: TrainingTabCounts;
  loading?: boolean;
}

export function TrainingTabs({ activeTab, onTabChange, counts, loading = false }: TrainingTabsProps) {
  const tabs = [
    {
      id: 'wtm' as TrainingFormType,
      label: 'WTM',
      count: counts.wtm,
      color: 'bg-blue-500'
    },
    {
      id: 'shakti-data' as TrainingFormType,
      label: 'Shakti',
      count: counts.shakti,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2
            ${activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <span>{tab.label}</span>
          {!loading && (
            <span
              className={`
                px-2 py-0.5 rounded-full text-xs font-semibold text-white
                ${activeTab === tab.id ? tab.color : 'bg-gray-400'}
              `}
            >
              {tab.count}
            </span>
          )}
          {loading && (
            <div className="w-6 h-4 bg-gray-300 rounded animate-pulse"></div>
          )}
        </button>
      ))}
    </div>
  );
}
