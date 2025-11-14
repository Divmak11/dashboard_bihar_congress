import React, { useState } from 'react';
import { 
  CalendarDaysIcon, 
  UserIcon, 
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { TrainingAssemblyItem, TrainingFormType, TrainingRecord } from '../../models/trainingTypes';
import { formatTrainingDate, computeTotalAttendees } from '../../app/utils/fetchTrainingData';

interface TrainingAssemblyCardProps {
  assembly: TrainingAssemblyItem;
  variant: TrainingFormType;
}

export function TrainingAssemblyCard({ assembly, variant }: TrainingAssemblyCardProps) {
  const [showAllSessions, setShowAllSessions] = useState(false);

  const getVariantColors = (variant: TrainingFormType) => {
    return variant === 'wtm' 
      ? {
          border: 'border-blue-200',
          bg: 'bg-white',
          accent: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        }
      : {
          border: 'border-purple-200',
          bg: 'bg-white',
          accent: 'text-purple-600',
          badge: 'bg-purple-100 text-purple-800'
        };
  };

  const colors = getVariantColors(variant);
  const hasMultipleSessions = assembly.items.length > 1;
  const displayedSessions = showAllSessions ? assembly.items : assembly.items.slice(0, 1);
  const hiddenSessionsCount = assembly.items.length - 1;

  return (
    <div className={`${colors.border} ${colors.bg} border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
      {/* Assembly Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {assembly.assembly}
          </h4>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
              {assembly.sessionCount} Session{assembly.sessionCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center space-x-1">
              <UsersIcon className="w-4 h-4" />
              <span className="font-medium">{assembly.totalAttendees.toLocaleString()} Total Attendees</span>
            </span>
          </div>
        </div>
      </div>

      {/* Training Sessions */}
      <div className="space-y-3">
        {displayedSessions.map((session, index) => (
          <TrainingSessionRow 
            key={session.id || index} 
            session={session} 
            colors={colors}
            isLatest={index === 0}
          />
        ))}

        {/* Show More/Less Button */}
        {hasMultipleSessions && (
          <button
            onClick={() => setShowAllSessions(!showAllSessions)}
            className={`w-full py-2 px-3 text-sm font-medium ${colors.accent} bg-gray-50 hover:bg-gray-100 rounded-md flex items-center justify-center space-x-1 transition-colors`}
          >
            {showAllSessions ? (
              <>
                <ChevronUpIcon className="w-4 h-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" />
                <span>Show {hiddenSessionsCount} More Session{hiddenSessionsCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface TrainingSessionRowProps {
  session: TrainingRecord;
  colors: any;
  isLatest: boolean;
}

function TrainingSessionRow({ session, colors, isLatest }: TrainingSessionRowProps) {
  const sessionAttendees = computeTotalAttendees(session);
  
  return (
    <div className={`p-3 rounded-lg border ${isLatest ? 'bg-gray-50 border-gray-200' : 'bg-gray-25 border-gray-100'}`}>
      {/* Date and Latest Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">
            {formatTrainingDate(session.dateOfTraining)}
          </span>
          {isLatest && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
              Latest
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <UsersIcon className="w-4 h-4" />
          <span className="font-medium">{sessionAttendees.toLocaleString()}</span>
        </div>
      </div>

      {/* Session Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <div>
            <span className="text-gray-500">SLP:</span>
            <span className="ml-1 font-medium text-gray-900">{session.slpName}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <div>
            <span className="text-gray-500">Coordinator:</span>
            <span className="ml-1 font-medium text-gray-900">{session.assemblyCoordinator}</span>
          </div>
        </div>
      </div>

      {/* Attendance Breakdown - Always show for consistency */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex space-x-4">
            <span>Members: {session.attendees}</span>
            <span>Others: {session.attendeesOtherThanClub}</span>
          </div>
          <span className="font-medium">Total: {sessionAttendees}</span>
        </div>
      </div>
    </div>
  );
}
