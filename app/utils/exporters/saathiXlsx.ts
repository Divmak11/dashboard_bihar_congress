// app/utils/exporters/saathiXlsx.ts
// Helper to export Samvidhan Saathi (member activities) to an XLSX file

import * as XLSX from 'xlsx';

export type SaathiRow = {
  dateOfVisit?: any;
  createdAt?: any; // epoch ms or ISO string (fallback for date)
  coordinatorName?: string;
  assembly?: string;
  name?: string;
  village?: string;
  block?: string;
  profession?: string;
  levelOfInfluence?: string;
  gender?: string;
  mobileNumber?: string | number;
  [key: string]: any;
};

const HEADERS = [
  'Date',
  'Coordinator Name',
  'Assembly',
  'Member Name',
  'Village',
  'Block',
  'Profession',
  'Level of Influence',
  'Gender',
  'Mobile',
] as const;

function formatLocalDateForFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateCell(row: SaathiRow): string {
  // Prefer dateOfVisit if present; otherwise derive from createdAt
  const value = row?.dateOfVisit ?? row?.createdAt;
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export function exportSaathiToXlsx(rows: SaathiRow[], options?: { filename?: string }): void {
  const filename = options?.filename ?? `Samvidhan_Saathi_AllTime_${formatLocalDateForFilename()}.xlsx`;

  const exportRows = rows.map((r) => ({
    [HEADERS[0]]: formatDateCell(r),
    [HEADERS[1]]: r.coordinatorName ?? '',
    [HEADERS[2]]: r.assembly ?? '',
    [HEADERS[3]]: r.name ?? '',
    [HEADERS[4]]: r.village ?? '',
    [HEADERS[5]]: r.block ?? '',
    [HEADERS[6]]: r.profession ?? '',
    [HEADERS[7]]: r.levelOfInfluence ?? '',
    [HEADERS[8]]: r.gender ?? '',
    // Export full mobile numbers (unmasked) as string
    [HEADERS[9]]: r.mobileNumber != null ? String(r.mobileNumber) : '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: HEADERS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Saathi');
  XLSX.writeFile(wb, filename);
}
