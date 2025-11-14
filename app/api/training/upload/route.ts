import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/utils/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

// Helpers to build a stable deterministic document ID so re-uploads overwrite instead of duplicating
function normalizePart(value: any): string {
  if (value === null || value === undefined) return 'unknown';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function buildStableId(record: any): string {
  const formType = normalizePart(record.form_type);
  const zonal = normalizePart(record.zonal);
  const assembly = normalizePart(record.assembly);
  const date = normalizePart(record.dateOfTraining);
  const slp = normalizePart(record.slpName);
  const base = [formType, zonal, assembly, date, slp];
  // If date or slp is unknown, append rowNumber to avoid collisions and ensure idempotency
  const needsRow = !date || date === 'unknown' || !slp || slp === 'unknown';
  if (needsRow) {
    const row = Number.isFinite(Number(record.rowNumber)) ? `row-${Number(record.rowNumber)}` : 'row-unknown';
    base.push(row);
  }
  // doc ID pattern: formtype__zonal__assembly__date__slp[__row-N]
  return base.join('__');
}

export async function POST(request: NextRequest) {
  try {
    const { trainingData } = await request.json();
    
    if (!trainingData || !Array.isArray(trainingData)) {
      return NextResponse.json(
        { error: 'Invalid training data provided' },
        { status: 400 }
      );
    }

    console.log(`🔥 Starting upload of ${trainingData.length} training records...`);

    // Use batch writes for better performance and atomicity
    const batch = writeBatch(db);
    const trainingCollection = collection(db, 'training');

    trainingData.forEach((record: any) => {
      // Only accept completed sessions as a guard
      const status = (record.trainingStatus || '').toString().trim().toLowerCase();
      if (status !== 'completed') {
        return; // skip non-completed rows defensively
      }

      // Validate and normalize form_type
      const rawFormType = (record.form_type || '').toString().trim();
      const formType: 'wtm' | 'shakti-data' = rawFormType === 'shakti-data' ? 'shakti-data' : 'wtm';

      // Parse numeric fields safely
      const attendees = Number(record.attendees);
      const attendeesOther = Number(record.attendeesOtherThanClub);

      const cleanRecord = {
        zonal: record.zonal ?? '',
        assembly: record.assembly ?? '',
        assemblyCoordinator: record.assemblyCoordinator ?? '',
        trainingStatus: record.trainingStatus ?? 'completed',
        dateOfTraining: record.dateOfTraining ?? '',
        slpName: record.slpName ?? '',
        attendees: Number.isFinite(attendees) ? attendees : 0,
        attendeesOtherThanClub: Number.isFinite(attendeesOther) ? attendeesOther : 0,
        form_type: formType,
        rowNumber: typeof record.rowNumber === 'number' ? record.rowNumber : (Number(record.rowNumber) || undefined),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const stableId = buildStableId({ ...cleanRecord });
      const docRef = doc(trainingCollection, stableId);
      batch.set(docRef, cleanRecord, { merge: true });
    });

    await batch.commit();
    
    console.log(`✅ Successfully uploaded ${trainingData.length} training records to Firebase`);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${trainingData.length} training records`,
      totalRecords: trainingData.length
    });

  } catch (error) {
    console.error('❌ Error uploading training data:', error);
    return NextResponse.json(
      { error: 'Failed to upload training data', details: error },
      { status: 500 }
    );
  }
}
