/**
 * API Route to upload check-in data from JSON to Firebase
 * POST /api/checkin-data/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../utils/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload Checkin Data] Starting upload process');
    
    // Parse the JSON data from request body
    const data = await request.json();
    
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected an array of user check-in records.' },
        { status: 400 }
      );
    }
    
    console.log(`[Upload Checkin Data] Received ${data.length} user records`);
    
    // Firestore batch write limit is 500 operations
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = data.slice(i, i + batchSize);
      
      chunk.forEach((userRecord: any) => {
        // Use user_id (phone number) as document ID for easy lookup
        const docRef = doc(collection(db, 'checkin_data'), userRecord.user_id);
        batch.set(docRef, {
          user_id: userRecord.user_id,
          name: userRecord.name,
          totalCount: userRecord.totalCount,
          dailyCounts: userRecord.dailyCounts
        });
      });
      
      batches.push(batch.commit());
      console.log(`[Upload Checkin Data] Prepared batch ${Math.floor(i / batchSize) + 1}`);
    }
    
    // Execute all batches in parallel
    await Promise.all(batches);
    
    console.log(`[Upload Checkin Data] Successfully uploaded ${data.length} user records`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${data.length} user check-in records`,
      recordsUploaded: data.length
    });
    
  } catch (error: any) {
    console.error('[Upload Checkin Data] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload check-in data', details: error.message },
      { status: 500 }
    );
  }
}
