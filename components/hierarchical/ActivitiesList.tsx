// components/hierarchical/ActivitiesList.tsx
// Activities list component for detailed view with optional column/value filtering
//
// FILTERING SYSTEM OVERVIEW:
// - This component supports optional two-stage filtering via showColumnFilter prop
// - When enabled, users can select a column (Assembly, Position, Status, etc.) and then filter by specific values
// - Filtering is applied client-side to the already-fetched data before rendering in DataTable
// - Filter state resets automatically when switching between metric cards
//
// CURRENT IMPLEMENTATION:
// - Standard column filter for Assembly, Position, Status, Level Of Influence, Block
// - Used by Volunteers (activityType='volunteers') and Samvidhan Leaders (activityType='slps')
// - Other metric cards (Shakti*, Samvidhan Chaupals, etc.) don't show filters
//
// TO ADD NEW METRIC-SPECIFIC FILTERS:
// 1. Add new optional props to ActivitiesListProps (e.g., showDateFilter, showLocationFilter)
// 2. Create new filter components similar to ColumnValueFilter
// 3. Add conditional rendering blocks in the JSX return statement
// 4. Update DetailedView.tsx to pass the appropriate filter props for each metric card
// 5. Ensure new filter logic integrates with existing search/sort functionality

import React from 'react';
import ColumnValueFilter, { ColumnOption } from './ColumnValueFilter';
import DataTable from './DataTable';

interface ActivitiesListProps {
  data: any[];
  loading?: boolean;
  activityType: string;
  showColumnFilter?: boolean; // Opt-in flag for column/value filtering
  footer?: React.ReactNode; // External footer (e.g., Load More)
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({ data, loading = false, activityType, showColumnFilter = false, footer }) => {
  // FILTER CONFIGURATION: Only initialize filter state/logic when showColumnFilter is true
  // This prevents unwanted filter UI from appearing on metric cards that don't support these columns
  // 
  // TO ADD METRIC-SPECIFIC FILTERS IN FUTURE:
  // 1. Add new props like `showCustomFilter?: boolean` and `customFilterColumns?: ColumnOption[]`
  // 2. Create conditional blocks similar to the one below for different filter types
  // 3. Pass the appropriate prop when rendering ActivitiesList from DetailedView
  
  const filterableColumns: ColumnOption[] = [
    { key: 'assembly', label: 'Assembly' },
    { key: 'recommendedPosition', label: 'Position' },
    { key: 'onboardingStatus', label: 'Status' },
    { key: 'levelOfInfluence', label: 'Level Of Influence' },
    { key: 'block', label: 'Block' }
  ];

  // Filter state - only used when showColumnFilter is true
  const [selectedColumn, setSelectedColumn] = React.useState<string | null>(null);
  const [selectedValue, setSelectedValue] = React.useState<string | null>(null);

  // Compute unique values for selected column - only when filtering is enabled
  const uniqueValues = React.useMemo(() => {
    if (!showColumnFilter || !selectedColumn) return [] as string[];
    const vals = data.map((d: any) => d[selectedColumn] || '').filter(Boolean);
    return Array.from(new Set<string>(vals)).sort();
  }, [showColumnFilter, selectedColumn, data]);

  // Apply column/value filtering - only when enabled and values selected
  const filteredData = React.useMemo(() => {
    if (!showColumnFilter || !selectedColumn || !selectedValue) return data;
    return data.filter((d: any) => String(d[selectedColumn] || '') === selectedValue);
  }, [showColumnFilter, data, selectedColumn, selectedValue]);
  const getColumns = () => {
    const baseColumns = [
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
        label: 'Name',
        sortable: true
      }
    ];

    // Add activity-specific columns
    switch (activityType) {
      case 'members':
      case 'saathi':
        return [
          ...baseColumns,
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
            key: 'gender',
            label: 'Gender',
            sortable: true
          },
          {
            key: 'mobileNumber',
            label: 'Mobile',
            sortable: false,
            render: (value: any) => {
              if (!value) return '-';
              const mobile = String(value);
              if (mobile.length >= 10) {
                return `${mobile.slice(0, 2)}****${mobile.slice(-4)}`;
              }
              return mobile;
            }
          }
        ];

      case 'videos':
        return [
          ...baseColumns,
          {
            key: 'description',
            label: 'Description',
            sortable: false,
            render: (value: any) => {
              if (!value) return '-';
              const desc = String(value);
              return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;
            }
          },
          {
            key: 'lateEntry',
            label: 'Late Entry',
            sortable: true,
            render: (value: any) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {value ? 'Yes' : 'No'}
              </span>
            )
          },
          {
            key: 'storagePath',
            label: 'Storage',
            sortable: false,
            render: (value: any) => {
              if (!value) return '-';
              return (
                <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                  View File
                </span>
              );
            }
          }
        ];

      case 'volunteers':
        return [
          ...baseColumns,
          {
            key: 'recommendedPosition',
            label: 'Position',
            sortable: true
          },
          {
            key: 'onboardingStatus',
            label: 'Status',
            sortable: true,
            render: (value: any) => {
              const v = String(value || 'Unknown');
              const color = v.toLowerCase() === 'onboarded' ? 'green' : v.toLowerCase() === 'dicey' ? 'yellow' : 'red';
              return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                  {v}
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
              const mobile = String(value);
              return mobile.length >= 10 ? `${mobile.slice(0, 2)}****${mobile.slice(-4)}` : mobile;
            }
          }
        ];

      case 'slps':
        return [
          ...baseColumns,
          {
            key: 'recommendedPosition',
            label: 'Position',
            sortable: true
          },
          {
            key: 'onboardingStatus',
            label: 'Status',
            sortable: true,
            render: (value: any) => {
              const v = String(value || 'Unknown');
              const color = v.toLowerCase() === 'onboarded' ? 'green' : v.toLowerCase() === 'dicey' ? 'yellow' : 'red';
              return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                  {v}
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
              const mobile = String(value);
              return mobile.length >= 10 ? `${mobile.slice(0, 2)}****${mobile.slice(-4)}` : mobile;
            }
          }
        ];

      case 'clubs':
        return [
          ...baseColumns,
          {
            key: 'village',
            label: 'Village',
            sortable: true
          },
          {
            key: 'panchayat',
            label: 'Panchayat',
            sortable: true
          },
          {
            key: 'block',
            label: 'Block',
            sortable: true
          }
        ];

      case 'forms':
        return [
          ...baseColumns,
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
            key: 'beneficiaryName',
            label: 'Beneficiary',
            sortable: true
          },
          {
            key: 'applicationNumber',
            label: 'Application No.',
            sortable: true
          }
        ];

      case 'chaupals':
        return [
          ...baseColumns,
          {
            key: 'village',
            label: 'Village',
            sortable: true
          },
          {
            key: 'topic',
            label: 'Topic',
            sortable: true
          },
          {
            key: 'attendees',
            label: 'Attendees',
            sortable: true
          }
        ];

      case 'shaktiLeaders':
        return [
          ...baseColumns,
          {
            key: 'mobile',
            label: 'Mobile',
            sortable: true,
            render: (value: any) => {
              if (!value) return '-';
              const mobile = String(value);
              return mobile.length >= 10 ? `${mobile.slice(0, 2)}****${mobile.slice(-4)}` : mobile;
            }
          },
          {
            key: 'village',
            label: 'Village',
            sortable: true
          },
          {
            key: 'isShaktiSLP',
            label: 'Type',
            sortable: true,
            render: (value: any) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                value ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {value ? 'Shakti SLP' : 'Regular SLP'}
              </span>
            )
          }
        ];

      default:
        return [
          ...baseColumns,
          {
            key: 'village',
            label: 'Village',
            sortable: true
          },
          {
            key: 'block',
            label: 'Block',
            sortable: true
          }
        ];
    }
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      members: 'Member Activities',
      saathi: 'Saathi Members',
      videos: 'Video Submissions',
      clubs: 'Club Activities',
      forms: 'Form Submissions',
      chaupals: 'Chaupal Sessions',
      shaktiLeaders: 'Shakti Leaders',
      shaktiSaathi: 'Shakti Saathi',
      shaktiClubs: 'Shakti Clubs',
      shaktiForms: 'Shakti Forms',
      shaktiBaithaks: 'Shakti Baithaks',
      centralWaGroups: 'Central WA Groups',
      assemblyWaGroups: 'Assembly WA Groups',
      slps: 'Samvidhan Leader Details'
    };
    return titles[activityType] || 'Activities';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">{getTitle()}</h4>
        <div className="text-sm text-gray-500">
          Total records: {data.length}
        </div>
      </div>
      
      {/* Column/Value Filter - only show when explicitly enabled */}
      {showColumnFilter && (
        <ColumnValueFilter
          columnOptions={filterableColumns}
          selectedColumn={selectedColumn}
          selectedValue={selectedValue}
          uniqueValues={uniqueValues}
          onColumnChange={(col) => {
            setSelectedColumn(col);
            setSelectedValue(null);
          }}
          onValueChange={(val) => setSelectedValue(val)}
        />
      )}

      <DataTable
        data={filteredData}
        columns={getColumns()}
        loading={loading}
        emptyMessage={`No ${activityType} found for the selected criteria`}
        searchable={false}
        clientPaginate={false}
        footer={footer}
      />
    </div>
  );
};

export default ActivitiesList;
