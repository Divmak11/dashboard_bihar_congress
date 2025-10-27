// components/hierarchical/NukkadMeetingsList.tsx
// Detailed list for Nukkad Meetings (AC and SLP)
import React from 'react';
import DataTable from './DataTable';

interface Props {
  data: any[];
  loading?: boolean;
  footer?: React.ReactNode;
}

const NukkadMeetingsList: React.FC<Props> = ({ data, loading = false, footer }) => {
  const columns = [
    {
      key: 'dateOfVisit',
      label: 'Date',
      sortable: true,
      render: (value: any, row: any) => {
        // Prefer normalized dateOfVisit (set by detailed fetchers)
        if (value) return value;
        const ms = typeof row.createdAt === 'number' ? row.createdAt : (typeof row.created_at === 'number' ? row.created_at : undefined);
        if (ms) {
          const d = new Date(ms);
          return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
        }
        return '-';
      }
    },
    {
      key: 'coordinatorName',
      label: 'Coordinator Name',
      sortable: true,
      render: (value: any, row: any) => value || row.handler_id || 'Unknown'
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
      key: 'village',
      label: 'Village',
      sortable: true
    },
    {
      key: 'totalMembers',
      label: 'Total Members',
      sortable: true,
      render: (value: any, row: any) => {
        if (typeof value === 'number') return value;
        if (Array.isArray(row.members)) return row.members.length;
        if (typeof row.membersCount === 'number') return row.membersCount;
        return 0;
      }
    },
    {
      key: 'notes',
      label: 'Notes',
      sortable: false,
      render: (value: any) => {
        const v = String(value || '').trim();
        if (!v) return '-';
        return v.length > 80 ? `${v.slice(0, 80)}…` : v;
      }
    },
    {
      key: 'videoUrl',
      label: 'Video',
      sortable: false,
      render: (value: any) => {
        const url = String(value || '').trim();
        if (!url) return '-';
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Watch
          </a>
        );
      }
    },
    {
      key: 'photoUrls',
      label: 'Photos',
      sortable: false,
      render: (value: any, row: any) => {
        // Support various possible image fields from backend
        const raw = row?.image_links ?? row?.photoUrls ?? row?.photo_urls ?? row?.photos ?? row?.imageLinks ?? row?.images ?? value;
        const images = Array.isArray(raw) ? raw.filter((u: any) => typeof u === 'string' && u.trim()) : (raw ? [raw] : []);
        const imageCount = images.length;

        if (imageCount === 0) {
          return <span className="text-gray-400">No photos</span>;
        }

        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{imageCount} photo{imageCount > 1 ? 's' : ''}</span>
            <button
              onClick={() => {
                const photoWindow = window.open('', '_blank', 'width=900,height=700');
                if (photoWindow) {
                  photoWindow.document.write(`
                    <html>
                      <head><title>Photos - ${row.notes || row.village || row.assembly || 'Nukkad Sabha'}</title></head>
                      <body style="margin: 20px; font-family: Arial, sans-serif;">
                        <h2>Photos</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
                          ${images.map((img: string, idx: number) => `
                            <div style="border: 1px solid #e5e7eb; padding: 10px; border-radius: 8px;">
                              <img src="${img}" alt="Photo ${idx + 1}" style="width: 100%; height: auto; border-radius: 6px;" />
                              <p style="margin-top: 8px; text-align: center; color: #6b7280;">Photo ${idx + 1}</p>
                            </div>
                          `).join('')}
                        </div>
                      </body>
                    </html>
                  `);
                }
              }}
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              View Photos
            </button>
          </div>
        );
      }
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns as any}
      loading={loading}
      emptyMessage="No Nukkad Meetings found for the selected criteria"
      searchable={false}
      clientPaginate={false}
      footer={footer}
    />
  );
};

export default NukkadMeetingsList;
