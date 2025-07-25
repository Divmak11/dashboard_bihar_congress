// components/hierarchical/ActivitiesList.tsx
// Activities list component for detailed view
import React from 'react';
import DataTable from './DataTable';

interface ActivitiesListProps {
  data: any[];
  loading?: boolean;
  activityType: string;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({ data, loading = false, activityType }) => {
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
      
      <DataTable
        data={data}
        columns={getColumns()}
        loading={loading}
        emptyMessage={`No ${activityType} found for the selected criteria`}
        searchable={true}
        pageSize={10}
      />
    </div>
  );
};

export default ActivitiesList;
