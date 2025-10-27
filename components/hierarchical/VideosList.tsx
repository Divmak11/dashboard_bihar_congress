// components/hierarchical/VideosList.tsx
// Specialized component for local issue video display
import React from 'react';
import DataTable from './DataTable';
import { LocalIssueVideoActivity } from '../../models/types';
import { exportVideosToXlsx } from '@/app/utils/exporters/videosXlsx';

interface VideosListProps {
  data: LocalIssueVideoActivity[];
  loading?: boolean;
  title?: string;
}

const VideosList: React.FC<VideosListProps> = ({ data, loading = false, title = "Local Issue Videos" }) => {
  const columns = [
    {
      key: 'date_submitted',
      label: 'Date Submitted',
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
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (value: any) => {
        if (!value) return '-';
        const desc = String(value);
        return (
          <div className="max-w-xs">
            <div className="truncate" title={desc}>
              {desc.length > 60 ? `${desc.substring(0, 60)}...` : desc}
            </div>
          </div>
        );
      }
    },
    {
      key: 'video_link',
      label: 'Video',
      sortable: false,
      render: (value: any, row: any) => {
        if (!value) return '-';
        return (
          <button
            onClick={() => window.open(value, '_blank')}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12l-2-2m0 0l2-2m-2 2h8m-8 0H2m16 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch Video
          </button>
        );
      }
    },
    {
      key: 'image_links',
      label: 'Images',
      sortable: false,
      render: (value: any, row: any) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return <span className="text-gray-400">No images</span>;
        }
        
        const images = Array.isArray(value) ? value : [value];
        const imageCount = images.length;
        
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{imageCount} image{imageCount > 1 ? 's' : ''}</span>
            <button
              onClick={() => {
                // Create a modal or new window to show images
                const imageWindow = window.open('', '_blank', 'width=800,height=600');
                if (imageWindow) {
                  imageWindow.document.write(`
                    <html>
                      <head><title>Images - ${row.description || 'Video Images'}</title></head>
                      <body style="margin: 20px; font-family: Arial, sans-serif;">
                        <h2>Images for: ${row.description || 'Video'}</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                          ${images.map((img: string, idx: number) => `
                            <div style="border: 1px solid #ddd; padding: 10px; border-radius: 8px;">
                              <img src="${img}" alt="Image ${idx + 1}" style="width: 100%; height: auto; border-radius: 4px;" />
                              <p style="margin-top: 10px; text-align: center; color: #666;">Image ${idx + 1}</p>
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
              View Images
            </button>
          </div>
        );
      }
    },
    {
      key: 'late_entry',
      label: 'Late Entry',
      sortable: true,
      render: (value: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      key: 'handler_id',
      label: 'Handler ID',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        const id = String(value);
        return (
          <span className="font-mono text-xs text-gray-600">
            {id.length > 10 ? `${id.substring(0, 10)}...` : id}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">{title}</h4>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">Total videos: {data.length}</div>
          <button
            type="button"
            onClick={() => exportVideosToXlsx(data, { metric: title })}
            disabled={loading || !data?.length}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
          >
            Export XLSX
          </button>
        </div>
      </div>
      
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        emptyMessage="No videos found for the selected criteria"
        searchable={true}
        pageSize={10}
      />
    </div>
  );
};

export default VideosList;
