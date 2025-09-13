import React, { useState } from 'react';
import { YoutubeCampaignDoc } from '../../models/youtubeTypes';
import { aggregateTheme } from '../../app/utils/fetchYoutubeData';

interface ThemesListProps {
  themes: YoutubeCampaignDoc[];
  videoStats: Map<string, { views: number; likes: number }>;
  isLoading?: boolean;
}

const ThemesList: React.FC<ThemesListProps> = ({ themes, videoStats, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [selectedTheme, setSelectedTheme] = useState<YoutubeCampaignDoc | null>(null);
  
  const now = Date.now();
  const activeThemes = themes.filter(t => t.to >= now);
  const pastThemes = themes.filter(t => t.to < now);
  const displayThemes = activeTab === 'active' ? activeThemes : pastThemes;

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
      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-2 px-1 border-b-2 font-medium transition ${
              activeTab === 'active'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Active ({activeThemes.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-2 px-1 border-b-2 font-medium transition ${
              activeTab === 'past'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Past ({pastThemes.length})
          </button>
        </div>
      </div>

      {/* Themes Table */}
      {displayThemes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500">No {activeTab} themes found</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Theme Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Influencers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Videos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Likes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayThemes.map((theme) => {
                const metrics = aggregateTheme(theme, videoStats);
                return (
                  <tr key={theme.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{theme.weeklyTheme}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(theme.from)} - {formatDate(theme.to)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {metrics.totals.activeInfluencers}
                        </span>
                        <span className="text-xs text-gray-500">
                          / {metrics.totals.assignedInfluencers}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.totals.videos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.totals.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.totals.likes.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedTheme(theme)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Theme Detail Modal */}
      {selectedTheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTheme.weeklyTheme}</h2>
                  <p className="text-gray-600 mt-1">
                    {formatDate(selectedTheme.from)} - {formatDate(selectedTheme.to)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTheme(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Theme Metrics */}
              {(() => {
                const metrics = aggregateTheme(selectedTheme, videoStats);
                return (
                  <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total Videos</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.totals.videos}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total Views</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.totals.views.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total Likes</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.totals.likes.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Fill Rate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {metrics.totals.assignedInfluencers > 0
                            ? Math.round((metrics.totals.activeInfluencers / metrics.totals.assignedInfluencers) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>

                    {/* Videos List */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Videos</h3>
                      {selectedTheme.influencerEntries && selectedTheme.influencerEntries.length > 0 ? (
                        <div className="space-y-3">
                          {selectedTheme.influencerEntries.map((entry) => {
                            const stats = videoStats.get(entry.videoLink) || entry.metrics || { views: 0, likes: 0 };
                            return (
                              <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                                        {entry.videoType}
                                      </span>
                                    </div>
                                    <a
                                      href={entry.videoLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium break-all"
                                    >
                                      {entry.videoLink}
                                    </a>
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="text-sm text-gray-600">{(stats.views || 0).toLocaleString()} views</p>
                                    <p className="text-sm text-gray-600">{(stats.likes || 0).toLocaleString()} likes</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No videos posted for this theme</p>
                      )}
                    </div>
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

export default ThemesList;
