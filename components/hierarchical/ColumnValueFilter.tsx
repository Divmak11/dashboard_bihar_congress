// components/hierarchical/ColumnValueFilter.tsx
// Reusable two-stage column/value filter selector
import React from 'react';

export interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnValueFilterProps {
  columnOptions: ColumnOption[];
  selectedColumn: string | null;
  selectedValue: string | null;
  uniqueValues: string[];
  onColumnChange: (colKey: string | null) => void;
  onValueChange: (val: string | null) => void;
}

const ColumnValueFilter: React.FC<ColumnValueFilterProps> = ({
  columnOptions,
  selectedColumn,
  selectedValue,
  uniqueValues,
  onColumnChange,
  onValueChange
}) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-sm font-medium text-gray-700">Filter by:</label>
      {/* Column selector */}
      <select
        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={selectedColumn || ''}
        onChange={(e) => {
          const val = e.target.value || null;
          onColumnChange(val);
        }}
      >
        <option value="">Select column</option>
        {columnOptions.map((col) => (
          <option key={col.key} value={col.key}>
            {col.label}
          </option>
        ))}
      </select>

      {/* Value selector */}
      <select
        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={selectedValue || ''}
        onChange={(e) => onValueChange(e.target.value || null)}
        disabled={!selectedColumn}
      >
        <option value="">{selectedColumn ? 'Select value' : 'Select column first'}</option>
        {uniqueValues.map((val) => (
          <option key={val} value={val}>
            {val || '—'}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ColumnValueFilter;
