// components/hierarchical/CumulativeDataCards.tsx
// Right panel metric cards – initial scaffold
import React from 'react';
import { CumulativeMetrics } from '../../models/hierarchicalTypes';

interface Props {
  metrics: CumulativeMetrics;
  onCardSelect?: (cardId: string) => void;
  isLoading?: boolean;
}

const CumulativeDataCards: React.FC<Props> = ({ metrics, onCardSelect, isLoading }) => {
  const handleCardClick = (cardId: string) => {
    if (onCardSelect) {
      onCardSelect(cardId);
    }
  };

  const cardData = [
    { id: 'meetings', label: 'Meetings', value: metrics.meetings, color: 'blue' },
    { id: 'volunteers', label: 'Volunteers', value: metrics.volunteers, color: 'green' },
    { id: 'slps', label: 'SLPs', value: metrics.slps, color: 'purple' },
    { id: 'saathi', label: 'Samvidhan Saathi', value: metrics.saathi, color: 'orange' },
    { id: 'shaktiLeaders', label: 'Shakti Leaders', value: metrics.shaktiLeaders, color: 'red' },
    { id: 'shaktiSaathi', label: 'Shakti Saathi', value: metrics.shaktiSaathi, color: 'pink' },
    { id: 'clubs', label: 'Samvidhan Clubs', value: metrics.clubs, color: 'indigo' },
    { id: 'shaktiClubs', label: 'Shakti Clubs', value: metrics.shaktiClubs, color: 'violet' },
    { id: 'forms', label: 'Mai-Bahin Forms', value: metrics.forms, color: 'cyan' },
    { id: 'shaktiForms', label: 'Shakti Mai-Bahin', value: metrics.shaktiForms, color: 'lime' },
    { id: 'videos', label: 'Local Issue Videos', value: metrics.videos, color: 'yellow' },
    { id: 'chaupals', label: 'Samvidhan Chaupals', value: metrics.chaupals, color: 'gray' },
    { id: 'centralWaGroups', label: 'Central WA Groups', value: metrics.centralWaGroups, color: 'teal' },
    { id: 'assemblyWaGroups', label: 'Assembly WA Groups', value: metrics.assemblyWaGroups, color: 'emerald' },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      pink: 'bg-pink-50 border-pink-200 text-pink-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      teal: 'bg-teal-50 border-teal-200 text-teal-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800',
      violet: 'bg-violet-50 border-violet-200 text-violet-800',
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      lime: 'bg-lime-50 border-lime-200 text-lime-800',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <section className="w-full md:w-3/4 p-4">
      {isLoading && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading metrics...
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cardData.map((card) => (
          <div
            key={card.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              getColorClasses(card.color)
            }`}
            onClick={() => handleCardClick(card.id)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              <div className="text-sm font-medium">{card.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CumulativeDataCards;
