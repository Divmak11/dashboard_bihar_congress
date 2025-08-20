// components/hierarchical/ChaupalsList.tsx
// Dedicated component for Chaupal Sessions detailed view
import React from 'react';
import DataTable from './DataTable';
import { ChaupalActivity } from '../../models/types';

interface ChaupalsListProps {
  data: ChaupalActivity[];
  loading?: boolean;
}

const ChaupalsList: React.FC<ChaupalsListProps> = ({ data, loading = false }) => {
  const columns = [
    {
      key: 'dateFormatted',
      label: 'Date',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString();
      }
    },
    {
      key: 'assembly',
      label: 'Assembly',
      sortable: true
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true
    },
    {
      key: 'notes',
      label: 'Topic/Notes',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        const notes = String(value);
        return notes.length > 100 ? `${notes.substring(0, 100)}...` : notes;
      }
    },
    {
      key: 'totalMembers',
      label: 'Total Members',
      sortable: true,
      render: (value: any) => value || 0
    },
    {
      key: 'trainingId',
      label: 'Training ID',
      sortable: true
    },
    {
      key: 'audioUrl',
      label: 'Audio',
      sortable: false,
      render: (value: any) => {
        if (!value) return '-';
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
          >
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.846 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.846l3.537-2.816z" clipRule="evenodd" />
              <path d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" />
            </svg>
            Listen
          </a>
        );
      }
    },
    {
      key: 'videoUrl',
      label: 'Video',
      sortable: false,
      render: (value: any) => {
        if (!value) return '-';
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
          >
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Watch
          </a>
        );
      }
    },
    {
      key: 'photoUrls',
      label: 'Photos',
      sortable: false,
      render: (value: any) => {
        if (!value || !Array.isArray(value) || value.length === 0) return '-';
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            {value.length} photo{value.length !== 1 ? 's' : ''}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Chaupal Sessions</h4>
        <div className="text-sm text-gray-500">
          Total sessions: {data.length}
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        emptyMessage="No chaupal sessions found for the selected criteria"
        searchable={true}
        pageSize={10}
      />
    </div>
  );
};

export default ChaupalsList;
