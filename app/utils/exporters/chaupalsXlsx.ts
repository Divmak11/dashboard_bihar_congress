// app/utils/exporters/chaupalsXlsx.ts
// Helper to export Chaupal Sessions and Shakti Baithaks to XLSX

import * as XLSX from 'xlsx';
import { normalizeDate, normalizeLinks, joinLinks, buildExportFilename } from './common';

export type ChaupalRow = {
  dateFormatted?: any;
  date?: any;
  assembly?: string;
  location?: string;
  notes?: string;
  totalMembers?: number;
  trainingId?: string;
  audioUrl?: string;
  videoUrl?: string;
  photoUrls?: any; // string | string[]
  [key: string]: any;
};

const HEADERS = [
  'Date',
  'Assembly',
  'Location',
  'Topic/Notes',
  'Total Members',
  'Training ID',
  'Audio Link',
  'Video Link',
  'Photo Links',
] as const;

export function exportChaupalsToXlsx(
  rows: ChaupalRow[],
  options?: { filename?: string; metric?: string }
): void {
  const filename = options?.filename ?? buildExportFilename(options?.metric || 'Chaupals');

  const exportRows = rows.map((r) => ({
    [HEADERS[0]]: normalizeDate(r, ['dateFormatted', 'date', 'dateOfVisit', 'createdAt']),
    [HEADERS[1]]: r.assembly ?? '',
    [HEADERS[2]]: r.location ?? '',
    [HEADERS[3]]: r.notes ?? '',
    [HEADERS[4]]: r.totalMembers ?? 0,
    [HEADERS[5]]: r.trainingId ?? r.training_id ?? '',
    [HEADERS[6]]: r.audioUrl ?? r.audio_url ?? '',
    [HEADERS[7]]: r.videoUrl ?? r.video_url ?? '',
    // Join multiple photo links with newline
    [HEADERS[8]]: joinLinks(normalizeLinks(r.photoUrls ?? r.photo_urls ?? r.photos)),
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: HEADERS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Chaupals');
  XLSX.writeFile(wb, filename);
}
