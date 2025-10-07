// Excel Report Generator for YouTube Channel Videos
// Generates downloadable Excel reports with video data

import * as XLSX from 'xlsx';
import { InfluencerVideosData, ChannelVideoData } from '../../models/youtubeTypes';
import { formatDuration } from './youtubeChannelApi';

// Format date to YYYY-MM-DD
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toISOString().split('T')[0];
}

// Generate and download Excel report
export function generateChannelVideosReport(
  influencersData: InfluencerVideosData[],
  dateRange: { startDate: string; endDate: string }
): void {
  console.log('[generateChannelVideosReport] Starting report generation');

  // Prepare data rows
  const rows: any[] = [];

  // Add all videos from all influencers
  influencersData.forEach((influencerData) => {
    if (influencerData.videos.length === 0) return;

    influencerData.videos.forEach((video) => {
      rows.push({
        'Influencer Name': influencerData.influencerName,
        'Channel Name': influencerData.channelName,
        'Channel Link': influencerData.channelLink,
        'Video URL': video.videoUrl,
        'Video Title': video.title,
        'Video Type': video.videoType,
        'Views': video.views,
        'Likes': video.likes,
        'Duration': formatDuration(video.durationSeconds),
        'Date Uploaded': formatDate(video.publishedAt)
      });
    });
  });

  if (rows.length === 0) {
    console.warn('[generateChannelVideosReport] No data to export');
    alert('No videos to export. Please fetch videos first.');
    return;
  }

  console.log(`[generateChannelVideosReport] Exporting ${rows.length} rows`);

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 20 }, // Influencer Name
    { wch: 25 }, // Channel Name
    { wch: 40 }, // Channel Link
    { wch: 50 }, // Video URL
    { wch: 50 }, // Video Title
    { wch: 12 }, // Video Type
    { wch: 12 }, // Views
    { wch: 10 }, // Likes
    { wch: 10 }, // Duration
    { wch: 15 }  // Date Uploaded
  ];
  worksheet['!cols'] = columnWidths;

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Channel Videos');

  // Generate filename with date range
  const filename = `Youtube_Channel_Videos_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);

  console.log(`[generateChannelVideosReport] Report downloaded: ${filename}`);
}

// Generate summary statistics for display
export function generateReportSummary(influencersData: InfluencerVideosData[]): {
  totalInfluencers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  shortVideos: number;
  longVideos: number;
} {
  let totalVideos = 0;
  let totalViews = 0;
  let totalLikes = 0;
  let shortVideos = 0;
  let longVideos = 0;

  influencersData.forEach((influencerData) => {
    influencerData.videos.forEach((video) => {
      totalVideos++;
      totalViews += video.views;
      totalLikes += video.likes;
      if (video.videoType === 'Short') {
        shortVideos++;
      } else {
        longVideos++;
      }
    });
  });

  return {
    totalInfluencers: influencersData.filter(d => d.videos.length > 0).length,
    totalVideos,
    totalViews,
    totalLikes,
    shortVideos,
    longVideos
  };
}
