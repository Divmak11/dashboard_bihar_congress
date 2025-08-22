// components/hierarchical/MeetingsList.tsx
// Meetings list component for detailed view
import React from 'react';
import DataTable from './DataTable';

interface MeetingsListProps {
  data: any[];
  loading?: boolean;
}

import ColumnValueFilter, { ColumnOption } from './ColumnValueFilter';
import { exportMeetingsToXlsx } from '@/app/utils/exporters/meetingsXlsx';

const MeetingsList: React.FC<MeetingsListProps> = ({ data, loading = false }) => {
  // Columns eligible for filtering
  const filterableColumns: ColumnOption[] = [
    { key: 'assembly', label: 'Assembly' },
    { key: 'recommendedPosition', label: 'Position' },
    { key: 'onboardingStatus', label: 'Status' },
    { key: 'levelOfInfluence', label: 'Level Of Influence' },
    { key: 'block', label: 'Block' }
  ];

  const [selectedColumn, setSelectedColumn] = React.useState<string | null>(null);
  const [selectedValue, setSelectedValue] = React.useState<string | null>(null);

  // Compute unique values for the selected column
  const uniqueValues = React.useMemo(() => {
    if (!selectedColumn) return [] as string[];
    const vals = data.map((d: any) => d[selectedColumn] || '').filter(Boolean);
    const set = new Set<string>(vals);
    return Array.from(set).sort();
  }, [selectedColumn, data]);

  // Apply column/value filtering
  const filteredData = React.useMemo(() => {
    if (!selectedColumn || !selectedValue) return data;
    return data.filter((d: any) => String(d[selectedColumn] || '') === selectedValue);
  }, [data, selectedColumn, selectedValue]);
  const columns = [
    {
      key: 'dateOfVisit',
      label: 'Date',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString();
      }
    },
    {
      key: 'coordinatorName',
      label: 'Coordinator Name',
      sortable: true
    },
    {
      key: 'assembly',
      label: 'Assembly',
      sortable: true
    },
    {
      key: 'name',
      label: 'Participant Name',
      sortable: true
    },
    {
      key: 'recommendedPosition',
      label: 'Position',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'SLP' ? 'bg-blue-100 text-blue-800' :
            value === 'Organisation' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'onboardingStatus',
      label: 'Status',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'Onboarded' ? 'bg-green-100 text-green-800' :
            value === 'Dicey' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'village',
      label: 'Village',
      sortable: true
    },
    {
      key: 'block',
      label: 'Block',
      sortable: true
    },
    {
      key: 'profession',
      label: 'Profession',
      sortable: true
    },
    {
      key: 'levelOfInfluence',
      label: 'Level of Influence',
      sortable: true
    },
    {
      key: 'mobileNumber',
      label: 'Mobile',
      sortable: false,
      render: (value: any) => {
        if (!value) return '-';
        // Mask mobile number for privacy
        const mobile = String(value);
        if (mobile.length >= 10) {
          return `${mobile.slice(0, 2)}****${mobile.slice(-4)}`;
        }
        return mobile;
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Meeting Details</h4>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">Total meetings: {data.length}</div>
          <button
            type="button"
            onClick={() => exportMeetingsToXlsx(filteredData)}
            disabled={loading || !data?.length}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
          >
            Export XLSX
          </button>
        </div>
      </div>
      
      {/* Column/Value Filter */}
      <ColumnValueFilter
        columnOptions={filterableColumns}
        selectedColumn={selectedColumn}
        selectedValue={selectedValue}
        uniqueValues={uniqueValues}
        onColumnChange={(col) => {
          setSelectedColumn(col);
          setSelectedValue(null); // reset value
        }}
        onValueChange={(val) => setSelectedValue(val)}
      />

      <DataTable
        data={filteredData}
        columns={columns}
        loading={loading}
        emptyMessage="No meetings found for the selected criteria"
        searchable={true}
        pageSize={10}
      />
    </div>
  );
};

export default MeetingsList;
