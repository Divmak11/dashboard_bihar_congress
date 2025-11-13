import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { ManifestoComplaintPanchayatRecord, ManifestoComplaintsImportResponse } from '@/models/manifestoComplaintsTypes';

// Normalize header text: lowercase, remove punctuation, collapse spaces
function normalizeHeader(h: any): string {
  return String(h || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Mapping from normalized sheet headers to our canonical keys for Panchayat
const panchayatHeaderMap: Record<string, keyof ManifestoComplaintPanchayatRecord> = {
  // Panchayat-specific columns
  'vard': 'vard',
  'panchayat name': 'panchayat_name',

  // Common grievance columns (same as AC)
  'health service oriented grievances': 'health_service_oriented_grievances',
  'water linked grievances': 'water_linked_grievances',
  'grievances resultant of prohibition': 'grievances_resultant_of_prohibition',

  // Unemployment spelling variants
  'demands around tackling unemployement': 'demands_around_tackling_unemployement',
  'demands around tackling unemployment': 'demands_around_tackling_unemployement',

  'all encompassing demands over development': 'all_encompassing_demands_over_development',

  // Ownership deficiency spelling variants
  'grievances arising out of land disputes and ownership deficiancy': 'grievances_arising_out_of_land_disputes_and_ownership_deficiancy',
  'grievances arising out of land disputes and ownership deficiency': 'grievances_arising_out_of_land_disputes_and_ownership_deficiancy',

  // Explicit/Implicit variants
  'explicit inexplicit struggles caused due to caste discrimination': 'explicit_inexplicit_struggles_caused_due_to_caste_discrimination',
  'explicit implicit struggles caused due to caste discrimination': 'explicit_inexplicit_struggles_caused_due_to_caste_discrimination',

  'demands and grievances related to educational apparatus': 'demands_and_grievances_related_to_educational_apparatus',
  'grievances due to criminal activities': 'grievances_due_to_criminal_activities',

  // Peasants spelling variant and agriculturalists variant
  'grievances related to the situation of agriculture agriculturists and peasents': 'grievances_related_to_the_situation_of_agriculture_agriculturists_and_peasents',
  'grievances related to the situation of agriculture agriculturists and peasants': 'grievances_related_to_the_situation_of_agriculture_agriculturists_and_peasents',
  'grievances related to the situation of agriculture agriculturalists and peasants': 'grievances_related_to_the_situation_of_agriculture_agriculturists_and_peasents',

  'specific demands to tackle grievances arisen due to lack of infrastructure': 'specific_demands_to_tackle_grievances_arisen_due_to_lack_of_infrastructure',
  'complaints and grievances related to inaccessibility of welfare services': 'complaints_and_grievances_related_to_inaccessibility_of_welfare_services',
};

function parseSheet(
  sheet: XLSX.WorkSheet,
  headerRowIndexZeroBased: number,
  sheetName: string,
  sourceFile: string
): ManifestoComplaintPanchayatRecord[] {
  // Read sheet as rows of arrays
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (!rows || rows.length <= headerRowIndexZeroBased) return [];

  const headerRow = rows[headerRowIndexZeroBased] || [];
  const headerNorms = headerRow.map((h) => normalizeHeader(h));

  // Map column index -> canonical key (if recognized)
  const colToKey: Array<keyof ManifestoComplaintPanchayatRecord | null> = headerNorms.map((hn) => panchayatHeaderMap[hn] || null);

  const results: ManifestoComplaintPanchayatRecord[] = [];
  for (let i = headerRowIndexZeroBased + 1; i < rows.length; i++) {
    const row = rows[i] || [];

    // Skip empty rows
    const isEmpty = row.every((cell: any) => String(cell || '').trim() === '');
    if (isEmpty) continue;

    const rec: ManifestoComplaintPanchayatRecord = {
      form_type: 'panchayat-manifesto',
      panchayat_name: '',
      _source: { file: path.basename(sourceFile), sheet: sheetName, row: i + 1 },
    } as ManifestoComplaintPanchayatRecord;

    for (let c = 0; c < row.length; c++) {
      const key = colToKey[c];
      if (!key) continue;
      // @ts-ignore - dynamic assignment for complaint keys
      rec[key] = row[c];
    }

    results.push(rec);
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    // This is a one-time batch import operation for Panchayat manifesto that ALWAYS saves to Firebase

    const filePath = path.join(process.cwd(), 'panchayat_manifesto.xlsx');
    
    // Enhanced file validation
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File not found at ${filePath}` }, { status: 404 });
    }

    // Check file permissions and accessibility
    try {
      const stats = fs.statSync(filePath);
      console.log(`[panchayat-manifesto] File stats:`, {
        size: stats.size,
        isFile: stats.isFile(),
        mode: stats.mode,
        path: filePath
      });
    } catch (e: any) {
      console.error(`[panchayat-manifesto] Failed to stat file:`, e);
      return NextResponse.json({ 
        error: `Cannot access file: ${e.message}`,
        filePath 
      }, { status: 500 });
    }

    // Read file with enhanced error handling and multiple approaches
    let wb: XLSX.WorkBook;
    try {
      console.log(`[panchayat-manifesto] Attempting to read file at: ${filePath}`);
      
      // First try: Read as buffer (recommended approach)
      let buffer: Buffer;
      try {
        buffer = fs.readFileSync(filePath);
        console.log(`[panchayat-manifesto] Successfully read ${buffer.length} bytes from file`);
      } catch (bufferError: any) {
        console.error(`[panchayat-manifesto] Buffer read error:`, bufferError);
        throw new Error(`Cannot read file as buffer: ${bufferError.message}`);
      }

      // Second try: Parse with XLSX
      try {
        wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, cellText: false });
        console.log(`[panchayat-manifesto] Successfully parsed workbook:`, {
          sheetCount: wb.SheetNames.length,
          sheets: wb.SheetNames
        });
      } catch (xlsxError: any) {
        console.error(`[panchayat-manifesto] XLSX parsing error:`, xlsxError);
        
        // Fallback: Try direct file read
        try {
          console.log(`[panchayat-manifesto] Fallback: Trying XLSX.readFile directly`);
          wb = XLSX.readFile(filePath, { cellDates: true });
          console.log(`[panchayat-manifesto] Fallback successful with ${wb.SheetNames.length} sheets`);
        } catch (fallbackError: any) {
          console.error(`[panchayat-manifesto] Fallback also failed:`, fallbackError);
          throw new Error(`XLSX parsing failed: ${xlsxError.message}. Fallback error: ${fallbackError.message}`);
        }
      }
    } catch (e: any) {
      console.error(`[panchayat-manifesto] Complete read failure:`, e);
      return NextResponse.json({ 
        error: `Failed to read Excel file: ${e.message}`,
        filePath,
        fileExists: fs.existsSync(filePath),
        suggestion: 'File may be corrupted, in use by another application, or not a valid Excel format'
      }, { status: 500 });
    }

    const entries: ManifestoComplaintPanchayatRecord[] = [];

    // Parse first sheet (single sheet for panchayat) with headers starting from row 1 (index 0)
    if (wb.SheetNames.length > 0) {
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const parsed = parseSheet(sheet, 0, firstSheetName, filePath); // row 1 => index 0
      entries.push(...parsed);
      console.log(`[panchayat-manifesto] Parsed ${parsed.length} entries from sheet: ${firstSheetName}`);
    }

    // Always save to Firestore - this is a batch import operation
    const errors: string[] = [];
    let imported = 0;

    try {
      // Lazy import to avoid bundling in edge runtimes
      const { getFirestore, doc, setDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/app/utils/firebase');

      const collRef = collection(db, 'manifesto-complaints');
      const now = Date.now();

      // Batch import with error handling per record
      for (const rec of entries) {
        try {
          const segments = [
            'panchayat',
            String(rec._source?.file || 'file'),
            String(rec._source?.sheet || 'sheet'),
            String(rec.panchayat_name || 'no-name').toLowerCase(),
            String(rec._source?.row || 'row')
          ];
          const idBase = segments.join('-')
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          const docRef = doc(collRef, idBase);
          await setDoc(docRef, {
            ...rec,
            importedAt: now,
          }, { merge: true });
          imported++;
        } catch (e: any) {
          errors.push(`Failed to save Panchayat ${rec.panchayat_name}: ${e?.message || 'Unknown error'}`);
        }
      }
    } catch (e: any) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to connect to Firebase', 
        imported: 0,
        errors: [e?.message || 'Firebase connection error']
      } as ManifestoComplaintsImportResponse, { status: 500 });
    }

    const resp: ManifestoComplaintsImportResponse = {
      success: imported > 0,
      message: `Successfully imported ${imported} of ${entries.length} Panchayat records to Firebase`,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(resp);
  } catch (e: any) {
    console.error('[panchayat-manifesto] import error', e);
    return NextResponse.json({ error: e?.message || 'Failed to parse Excel' }, { status: 500 });
  }
}
