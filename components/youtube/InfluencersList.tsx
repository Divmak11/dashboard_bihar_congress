import React, { useState } from 'react';
import { YoutubeInfluencerDoc, YoutubeCampaignDoc } from '../../models/youtubeTypes';
import { aggregateInfluencer } from '../../app/utils/fetchYoutubeData';

interface InfluencersListProps {
  influencers: YoutubeInfluencerDoc[];
  themes: YoutubeCampaignDoc[];
  videoStats: Map<string, { views: number; likes: number }>;
  isLoading?: boolean;
}

const InfluencersList: React.FC<InfluencersListProps> = ({ 
  influencers, 
  themes, 
  videoStats, 
  isLoading = false 
}) => {
  const [selectedInfluencer, setSelectedInfluencer] = useState<YoutubeInfluencerDoc | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workingStatusFilter, setWorkingStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter influencers
  const filteredInfluencers = influencers.filter(influencer => {
    // Status filter
    if (statusFilter !== 'all' && influencer.status !== statusFilter) {
      return false;
    }
    
    // Working status filter
    if (workingStatusFilter !== 'all' && influencer.workingStatus !== workingStatusFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        influencer.name?.toLowerCase().includes(query) ||
        influencer.channelName?.toLowerCase().includes(query) ||
        influencer.phoneNumber?.includes(query)
      );
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name, channel, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={workingStatusFilter}
            onChange={(e) => setWorkingStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Working Status</option>
            <option value="Working">Working</option>
            <option value="Busy">Busy</option>
            <option value="Not Working For Us">Not Working For Us</option>
          </select>
        </div>
      </div>

      {/* Influencers Table */}
      {filteredInfluencers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500">No influencers found matching your criteria</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscribers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assembly
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Videos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInfluencers.map((influencer) => {
                const metrics = aggregateInfluencer(influencer.id, themes, videoStats);
                return (
                  <tr key={influencer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{influencer.name}</div>
                        <div className="text-sm text-gray-500">{influencer.phoneNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {influencer.channelLink ? (
                        <a
                          href={influencer.channelLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-900"
                        >
                          {influencer.channelName}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-900">{influencer.channelName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {influencer.subscribers?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          influencer.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {influencer.status}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          influencer.workingStatus === 'Working' 
                            ? 'bg-blue-100 text-blue-800' 
                            : influencer.workingStatus === 'Busy'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {influencer.workingStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {influencer.assembly || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.videos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedInfluencer(influencer)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Influencer Profile Modal */}
      {selectedInfluencer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedInfluencer.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <a
                      href={selectedInfluencer.channelLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      {selectedInfluencer.channelName}
                    </a>
                    <span className="text-gray-600">
                      {selectedInfluencer.subscribers?.toLocaleString() || 0} subscribers
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInfluencer(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Details */}
              {(() => {
                const metrics = aggregateInfluencer(selectedInfluencer.id, themes, videoStats);
                return (
                  <div className="space-y-6">
                    {/* Contact & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Phone Number</p>
                        <p className="text-lg font-medium text-gray-900">{selectedInfluencer.phoneNumber}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Assembly</p>
                        <p className="text-lg font-medium text-gray-900">{selectedInfluencer.assembly || '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Status</p>
                        <div className="flex gap-2 mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedInfluencer.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedInfluencer.status}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedInfluencer.workingStatus === 'Working' 
                              ? 'bg-blue-100 text-blue-800' 
                              : selectedInfluencer.workingStatus === 'Busy'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedInfluencer.workingStatus}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Last Active</p>
                        <p className="text-lg font-medium text-gray-900">{formatDate(selectedInfluencer.createdAt)}</p>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-indigo-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Themes</p>
                          <p className="text-2xl font-bold text-indigo-900">{metrics.themes}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Videos</p>
                          <p className="text-2xl font-bold text-blue-900">{metrics.videos}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Views</p>
                          <p className="text-2xl font-bold text-green-900">{metrics.views.toLocaleString()}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Avg Views/Video</p>
                          <p className="text-2xl font-bold text-purple-900">{metrics.avgViewsPerVideo.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Theme Contributions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme Contributions</h3>
                      {metrics.perTheme.length > 0 ? (
                        <div className="space-y-3">
                          {metrics.perTheme.map((theme) => (
                            <div key={theme.themeId} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-900">{theme.themeName}</p>
                                  <p className="text-sm text-gray-600">{theme.videos} videos</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">{theme.views.toLocaleString()} views</p>
                                  <p className="text-sm text-gray-600">{theme.likes.toLocaleString()} likes</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No theme contributions yet</p>
                      )}
                    </div>

                    {/* Remarks */}
                    {selectedInfluencer.remark && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Remarks</h3>
                        <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedInfluencer.remark}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluencersList;
