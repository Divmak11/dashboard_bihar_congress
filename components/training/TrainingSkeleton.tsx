import React from 'react';

export function TrainingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Zone Skeleton */}
      {[1, 2, 3].map((zoneIndex) => (
        <div key={zoneIndex} className="border rounded-lg animate-pulse">
          {/* Zone Header Skeleton */}
          <div className="px-4 py-3 bg-gray-100 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
              <div className="h-6 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-6 bg-gray-300 rounded-full w-20"></div>
              <div className="h-6 bg-gray-300 rounded-full w-20"></div>
              <div className="h-6 bg-gray-300 rounded-full w-24"></div>
            </div>
          </div>
          
          {/* Zone Content Skeleton */}
          <div className="p-4 space-y-3">
            {[1, 2].map((assemblyIndex) => (
              <div key={assemblyIndex} className="border border-gray-200 rounded-lg p-4">
                {/* Assembly Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="h-6 bg-gray-300 rounded w-40 mb-2"></div>
                    <div className="flex items-center space-x-4">
                      <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-5 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                </div>
                
                {/* Session Skeleton */}
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
                      <div className="h-5 bg-gray-300 rounded w-24"></div>
                    </div>
                    <div className="h-5 bg-gray-300 rounded w-16"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrainingTabsSkeleton() {
  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
      {[1, 2].map((i) => (
        <div key={i} className="px-4 py-2 rounded-md flex items-center space-x-2 animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-12"></div>
          <div className="w-6 h-4 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
  );
}
