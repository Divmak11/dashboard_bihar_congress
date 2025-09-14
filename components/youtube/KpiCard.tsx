import React from 'react';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
  compact?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'bg-white',
  loading = false,
  compact = false
}) => {
  if (loading) {
    return (
      <div className={`${color} rounded-lg shadow-sm border border-gray-200 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${color} rounded-lg shadow-sm border border-gray-200 ${compact ? 'p-3' : 'p-4'} transition hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} font-medium`}>{title}</p>
          <p className={`text-gray-900 ${compact ? 'text-lg' : 'text-2xl'} font-bold mt-1`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {icon && (
          <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center rounded-lg bg-indigo-100 text-indigo-600`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
