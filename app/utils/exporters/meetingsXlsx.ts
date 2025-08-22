// app/utils/exporters/meetingsXlsx.ts
// Helper to export Meetings data to an XLSX file without cluttering UI components

import * as XLSX from 'xlsx';

export type MeetingRow = {
  dateOfVisit?: any;
  coordinatorName?: string;
  assembly?: string;
  name?: string; // participant name
  recommendedPosition?: string;
  onboardingStatus?: string;
  village?: string;
  block?: string;
  profession?: string;
  levelOfInfluence?: string;
  mobileNumber?: string | number;
  // Allow passthrough of additional fields without typing noise
  [key: string]: any;
};

const HEADERS = [
  'Date',
  'Coordinator Name',
  'Assembly',
  'Participant Name',
  'Position',
  'Status',
  'Village',
  'Block',
  'Profession',
  'Level of Influence',
  'Mobile',
] as const;

function formatLocalDateForFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLocalDateCell(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function maskMobile(value: any): string {
  if (!value) return '';
  const mobile = String(value);
  if (mobile.length >= 10) return `${mobile.slice(0, 2)}****${mobile.slice(-4)}`;
  return mobile;
}

export function exportMeetingsToXlsx(rows: MeetingRow[], options?: { filename?: string }): void {
  const filename = options?.filename ?? `Meetings_AllTime_${formatLocalDateForFilename()}.xlsx`;

  const exportRows = rows.map((r) => ({
    [HEADERS[0]]: formatLocalDateCell(r.dateOfVisit),
    [HEADERS[1]]: r.coordinatorName ?? '',
    [HEADERS[2]]: r.assembly ?? '',
    [HEADERS[3]]: r.name ?? '',
    [HEADERS[4]]: r.recommendedPosition ?? '',
    [HEADERS[5]]: r.onboardingStatus ?? '',
    [HEADERS[6]]: r.village ?? '',
    [HEADERS[7]]: r.block ?? '',
    [HEADERS[8]]: r.profession ?? '',
    [HEADERS[9]]: r.levelOfInfluence ?? '',
    // Export full mobile numbers (unmasked) as string
    [HEADERS[10]]: r.mobileNumber != null ? String(r.mobileNumber) : '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: HEADERS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Meetings');
  XLSX.writeFile(wb, filename);
}
