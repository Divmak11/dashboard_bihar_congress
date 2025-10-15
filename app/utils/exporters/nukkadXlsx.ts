// app/utils/exporters/nukkadXlsx.ts
// Helper to export Nukkad Meetings (AC and SLP) to XLSX

import * as XLSX from 'xlsx';
import { normalizeDate, normalizeLinks, joinLinks, buildExportFilename } from './common';

export type NukkadRow = {
  dateOfVisit?: any;
  createdAt?: any;
  created_at?: any;
  coordinatorName?: string;
  handler_id?: string;
  assembly?: string;
  panchayat?: string;
  village?: string;
  totalMembers?: number;
  members?: any[];
  membersCount?: number;
  notes?: string;
  videoUrl?: string;
  video_url?: string;
  photoUrls?: any;
  photo_urls?: any;
  image_links?: any;
  imageLinks?: any;
  photos?: any;
  images?: any;
  [key: string]: any;
};

const HEADERS = [
  'Date',
  'Coordinator Name',
  'Assembly',
  'Panchayat',
  'Village',
  'Total Members',
  'Notes',
  'Video Link',
  'Photo Links',
] as const;

export function exportNukkadToXlsx(
  rows: NukkadRow[],
  options?: { filename?: string; metric?: string }
): void {
  const filename = options?.filename ?? buildExportFilename(options?.metric || 'Nukkad_Meetings');

  const exportRows = rows.map((r) => {
    // Normalize total members from various possible fields
    let totalMembers = 0;
    if (typeof r.totalMembers === 'number') {
      totalMembers = r.totalMembers;
    } else if (Array.isArray(r.members)) {
      totalMembers = r.members.length;
    } else if (typeof r.membersCount === 'number') {
      totalMembers = r.membersCount;
    }

    // Normalize photo links from multiple possible field names
    const photoFields = [
      r.image_links,
      r.photoUrls,
      r.photo_urls,
      r.photos,
      r.imageLinks,
      r.images,
    ];
    let allPhotoLinks: string[] = [];
    for (const field of photoFields) {
      if (field) {
        allPhotoLinks = normalizeLinks(field);
        if (allPhotoLinks.length > 0) break;
      }
    }

    return {
      [HEADERS[0]]: normalizeDate(r, ['dateOfVisit', 'createdAt', 'created_at']),
      [HEADERS[1]]: r.coordinatorName ?? r.handler_id ?? 'Unknown',
      [HEADERS[2]]: r.assembly ?? '',
      [HEADERS[3]]: r.panchayat ?? '',
      [HEADERS[4]]: r.village ?? '',
      [HEADERS[5]]: totalMembers,
      [HEADERS[6]]: r.notes ?? '',
      [HEADERS[7]]: r.videoUrl ?? r.video_url ?? '',
      // Join multiple photo links with newline
      [HEADERS[8]]: joinLinks(allPhotoLinks),
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: HEADERS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nukkad_Meetings');
  XLSX.writeFile(wb, filename);
}
