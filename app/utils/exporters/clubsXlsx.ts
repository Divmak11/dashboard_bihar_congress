// app/utils/exporters/clubsXlsx.ts
// Helper to export Clubs and WA Groups (Central, Assembly, Shakti) to XLSX

import * as XLSX from 'xlsx';
import { normalizeDate, buildExportFilename } from './common';

export type ClubRow = {
  createdAt?: any;
  assembly?: string;
  panchayat?: string;
  groupName?: string;
  members?: number;
  membersCount?: number;
  status?: string;
  link?: string;
  [key: string]: any;
};

const HEADERS = [
  'Created',
  'Assembly',
  'Panchayat',
  'Group Name',
  'Members',
  'Status',
  'Link',
] as const;

export function exportClubsToXlsx(
  rows: ClubRow[],
  options?: { filename?: string; metric?: string }
): void {
  const filename = options?.filename ?? buildExportFilename(options?.metric || 'Clubs');

  const exportRows = rows.map((r) => ({
    [HEADERS[0]]: normalizeDate(r, ['createdAt', 'created_at', 'dateCreated']),
    [HEADERS[1]]: r.assembly ?? '',
    [HEADERS[2]]: r.panchayat ?? '',
    [HEADERS[3]]: r.groupName ?? r.group_name ?? '',
    // Prefer members field, fallback to membersCount
    [HEADERS[4]]: r.members ?? r.membersCount ?? 0,
    [HEADERS[5]]: r.status ?? 'Unknown',
    [HEADERS[6]]: r.link ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: HEADERS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clubs');
  XLSX.writeFile(wb, filename);
}
