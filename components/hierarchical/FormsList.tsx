// components/hierarchical/FormsList.tsx
// Specialized component for Mai Bahin Yojna form display
import React from 'react';
import DataTable from './DataTable';
import { MaiBahinYojnaActivity } from '../../models/types';
import { exportFormsToXlsx } from '@/app/utils/exporters/formsXlsx';

interface FormsListProps {
  data: MaiBahinYojnaActivity[];
  loading?: boolean;
}

const FormsList: React.FC<FormsListProps> = ({ data, loading = false }) => {
  const columns = [
    {
      key: 'date',
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
      key: 'formsDistributed',
      label: 'Forms Distributed',
      sortable: true,
      render: (value: any) => {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {value || 0}
          </span>
        );
      }
    },
    {
      key: 'formsCollected',
      label: 'Forms Collected',
      sortable: true,
      render: (value: any) => {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {value || 0}
          </span>
        );
      }
    },
    {
      key: 'completion_rate',
      label: 'Completion Rate',
      sortable: true,
      render: (value: any, row: any) => {
        const distributed = row.formsDistributed || 0;
        const collected = row.formsCollected || 0;
        
        if (collected === 0) {
          return <span className="text-gray-400">N/A</span>;
        }
        
        // Completion rate = (distributed / collected) * 100
        // Shows how much of the collection target has been achieved through distribution
        const rate = Math.round((distributed / collected) * 100);
        
        const colorClass = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600';
        
        return (
          <div className="flex items-center">
            <span className={`font-semibold ${colorClass}`}>
              {rate}%
            </span>
            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(rate, 100)}%` }}
              ></div>
            </div>
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
          <span className="font-mono text-xs text-gray-600" title={id}>
            {id.length > 12 ? `${id.substring(0, 12)}...` : id}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        
        let date;
        if (value.seconds) {
          // Firestore timestamp
          date = new Date(value.seconds * 1000);
        } else if (value.toDate) {
          // Firestore timestamp object
          date = value.toDate();
        } else {
          date = new Date(value);
        }
        
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
      }
    }
  ];

  const totalDistributed = data.reduce((sum, item) => sum + (item.formsDistributed || 0), 0);
  const totalCollected = data.reduce((sum, item) => sum + (item.formsCollected || 0), 0);
  const overallRate = totalCollected > 0 ? Math.round((totalDistributed / totalCollected) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Mai Bahin Yojna Forms</h4>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">Total records: {data.length}</div>
          <button
            type="button"
            onClick={() => exportFormsToXlsx(data, { metric: 'Mai_Bahin_Yojna_Forms' })}
            disabled={loading || !data?.length}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
          >
            Export XLSX
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-medium">Total Distributed</div>
          <div className="text-2xl font-bold text-green-900">{totalDistributed.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-medium">Total Collected</div>
          <div className="text-2xl font-bold text-blue-900">{totalCollected.toLocaleString()}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-600 text-sm font-medium">Overall Rate</div>
          <div className="text-2xl font-bold text-purple-900">{overallRate}%</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-gray-600 text-sm font-medium">Pending</div>
          <div className="text-2xl font-bold text-gray-900">{(totalCollected - totalDistributed).toLocaleString()}</div>
        </div>
      </div>
      
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        emptyMessage="No forms found for the selected criteria"
        searchable={true}
        pageSize={10}
      />
    </div>
  );
};

export default FormsList;
