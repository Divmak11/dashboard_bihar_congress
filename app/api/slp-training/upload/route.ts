import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/utils/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

// Helper to build a stable deterministic document ID
function normalizePart(value: any): string {
  if (value === null || value === undefined) return 'unknown';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function buildStableId(record: any): string {
  const assembly = normalizePart(record.assembly);
  const name = normalizePart(record.name);
  const mobile = normalizePart(record.mobile_number);
  
  // doc ID pattern: assembly__name__mobile
  return [assembly, name, mobile].join('__');
}

export async function POST(request: NextRequest) {
  try {
    const { slpTrainingData } = await request.json();
    
    if (!slpTrainingData || !Array.isArray(slpTrainingData)) {
      return NextResponse.json(
        { error: 'Invalid SLP training data provided' },
        { status: 400 }
      );
    }

    console.log(`🔥 Starting upload of ${slpTrainingData.length} SLP training records...`);

    // Use batch writes for better performance and atomicity
    const batch = writeBatch(db);
    const slpTrainingCollection = collection(db, 'slp_training');

    slpTrainingData.forEach((record: any, index: number) => {
      // Validate required fields
      if (!record.name || !record.mobile_number || !record.assembly) {
        console.warn(`⚠️ Skipping incomplete record at index ${index}:`, record);
        return;
      }

      const cleanRecord = {
        name: record.name.trim(),
        mobile_number: String(record.mobile_number).replace('.0', ''), // Remove .0 from numbers
        assembly: record.assembly,
        status: 'trained', // Default status for all uploaded records
        trainingDate: new Date().toISOString().split('T')[0], // Current date as YYYY-MM-DD
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const stableId = buildStableId(cleanRecord);
      const docRef = doc(slpTrainingCollection, stableId);
      batch.set(docRef, cleanRecord, { merge: true });
    });

    await batch.commit();
    
    console.log(`✅ Successfully uploaded ${slpTrainingData.length} SLP training records to Firebase`);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${slpTrainingData.length} SLP training records`,
      totalRecords: slpTrainingData.length
    });

  } catch (error) {
    console.error('❌ Error uploading SLP training data:', error);
    return NextResponse.json(
      { error: 'Failed to upload SLP training data', details: error },
      { status: 500 }
    );
  }
}
