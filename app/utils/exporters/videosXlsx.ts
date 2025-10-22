// app/utils/exporters/videosXlsx.ts
// Helper to export Local Issue Videos and AC Videos to XLSX

import * as XLSX from 'xlsx';
import { normalizeDate, normalizeLinks, joinLinks, buildExportFilename } from './common';

export type VideoRow = {
  date_submitted?: any;
  assembly?: string;
  description?: string;
  video_link?: string;
  image_links?: any; // string | string[]
  late_entry?: boolean;
  handler_id?: string;
  [key: string]: any;
};

const HEADERS = [
  'Date Submitted',
  'Assembly',
  'Description',
  'Video Link',
  'Image Links',
  'Late Entry',
  'Handler ID',
] as const;

export function exportVideosToXlsx(
  rows: VideoRow[],
  options?: { filename?: string; metric?: string }
): void {
  const filename = options?.filename ?? buildExportFilename(options?.metric || 'Videos');

  const exportRows = rows.map((r) => ({
    [HEADERS[0]]: normalizeDate(r, ['date_submitted', 'dateSubmitted', 'createdAt', 'created_at']),
    [HEADERS[1]]: r.assembly ?? '',
    [HEADERS[2]]: r.description ?? '',
    [HEADERS[3]]: r.video_link ?? r.videoLink ?? '',
    // Join multiple image links with newline so each appears on its own line in Excel
    [HEADERS[4]]: joinLinks(normalizeLinks(r.image_links ?? r.imageLinks)),
    [HEADERS[5]]: r.late_entry ? 'Yes' : 'No',
    [HEADERS[6]]: r.handler_id ?? r.handlerId ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: HEADERS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Videos');
  XLSX.writeFile(wb, filename);
}
