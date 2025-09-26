// components/hierarchical/ClubsList.tsx
// Specialized component for Samvidhan (Panchayat WA) Clubs
import React from 'react';
import DataTable from './DataTable';

interface Club {
  id: string;
  createdAt?: any;
  assembly?: string;
  panchayat?: string;
  groupName?: string;
  members?: number;
  status?: string;
  link?: string;
  handler_id?: string;
}

interface ClubsListProps {
  data: Club[];
  loading?: boolean;
  activityType?: string;
}

const ClubsList: React.FC<ClubsListProps> = ({ data, loading = false, activityType = 'clubs' }) => {
  const columns = [
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        let date: Date;
        if (value?.seconds) {
          date = new Date(value.seconds * 1000);
        } else if (typeof value === 'string') {
          date = new Date(value);
        } else if (value?.toDate) {
          date = value.toDate();
        } else {
          date = new Date();
        }
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
      }
    },
    {
      key: 'assembly',
      label: 'Assembly',
      sortable: true
    },
    {
      key: 'panchayat',
      label: 'Panchayat',
      sortable: true
    },
    {
      key: 'groupName',
      label: 'Group Name',
      sortable: true,
      render: (value: any) => value || '-'
    },
    {
      key: 'members',
      label: 'Members',
      sortable: true,
      render: (value: any, row: any) => {
        const v = value ?? (row?.membersCount ?? '-');
        return v;
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any) => {
        const v = String(value || 'Unknown');
        const color = v.toLowerCase() === 'active' ? 'green' : 'red';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
            {v}
          </span>
        );
      }
    },
    {
      key: 'link',
      label: 'Chat Link',
      sortable: false,
      render: (value: any) => {
        if (!value) return '-';
        return (
          <button
            onClick={() => window.open(value, '_blank')}
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            Open Chat
          </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">
          {activityType === 'assemblyWaGroups'
            ? 'Assembly WA Groups'
            : activityType === 'shaktiAssemblyWaGroups'
            ? 'Shakti Assembly WA Groups'
            : activityType === 'centralWaGroups'
            ? 'Central WA Groups'
            : activityType === 'shaktiClubs'
            ? 'Shakti Clubs'
            : 'Samvidhan Clubs'}
        </h4>
        <div className="text-sm text-gray-500">Total clubs: {data.length}</div>
      </div>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        emptyMessage="No clubs found for the selected criteria"
        searchable={true}
        pageSize={10}
      />
    </div>
  );
};

export default ClubsList;
