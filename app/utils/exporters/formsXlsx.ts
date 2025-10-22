// app/utils/exporters/formsXlsx.ts
// Helper to export Mai-Bahin Yojna Forms to XLSX

import * as XLSX from 'xlsx';
import { normalizeDate, buildExportFilename } from './common';

export type FormRow = {
  date?: any;
  assembly?: string;
  formsDistributed?: number;
  formsCollected?: number;
  late_entry?: boolean;
  handler_id?: string;
  createdAt?: any;
  [key: string]: any;
};

const HEADERS = [
  'Date',
  'Assembly',
  'Forms Distributed',
  'Forms Collected',
  'Completion Rate',
  'Late Entry',
  'Handler ID',
  'Created',
] as const;

export function exportFormsToXlsx(
  rows: FormRow[],
  options?: { filename?: string; metric?: string }
): void {
  const filename = options?.filename ?? buildExportFilename(options?.metric || 'Forms');

  const exportRows = rows.map((r) => {
    const distributed = r.formsDistributed ?? 0;
    const collected = r.formsCollected ?? 0;
    // Calculate completion rate: (distributed / collected) * 100
    const completionRate = collected > 0 ? Math.round((distributed / collected) * 100) : 0;

    return {
      [HEADERS[0]]: normalizeDate(r, ['date', 'dateOfVisit', 'date_submitted']),
      [HEADERS[1]]: r.assembly ?? '',
      [HEADERS[2]]: distributed,
      [HEADERS[3]]: collected,
      [HEADERS[4]]: `${completionRate}%`,
      [HEADERS[5]]: r.late_entry ? 'Yes' : 'No',
      [HEADERS[6]]: r.handler_id ?? r.handlerId ?? '',
      [HEADERS[7]]: normalizeDate(r, ['createdAt', 'created_at']),
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: HEADERS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Forms');
  XLSX.writeFile(wb, filename);
}
