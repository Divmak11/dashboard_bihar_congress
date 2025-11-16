import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { mobileNumbers } = await request.json();
    
    if (!mobileNumbers || !Array.isArray(mobileNumbers)) {
      return NextResponse.json(
        { error: 'Invalid mobile numbers array provided' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking ${mobileNumbers.length} mobile numbers for duplicates...`);

    const slpTrainingCollection = collection(db, 'slp_training');
    const existingMobiles = new Set<string>();
    
    // Firestore 'in' operator supports max 10 items, so we need to batch
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < mobileNumbers.length; i += batchSize) {
      const batch = mobileNumbers.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    console.log(`📦 Processing ${batches.length} batches...`);
    
    // Query each batch
    for (const batch of batches) {
      const q = query(slpTrainingCollection, where('mobile_number', 'in', batch));
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.mobile_number) {
          existingMobiles.add(data.mobile_number);
        }
      });
    }
    
    console.log(`✅ Found ${existingMobiles.size} existing mobile numbers`);

    return NextResponse.json({
      success: true,
      totalChecked: mobileNumbers.length,
      existingCount: existingMobiles.size,
      existingMobiles: Array.from(existingMobiles)
    });

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicates', details: error },
      { status: 500 }
    );
  }
}
