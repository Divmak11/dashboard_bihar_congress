const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  try {
    // Try to use service account from environment or default credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;
    
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Use application default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
    console.log('✅ Firebase Admin initialized\n');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.log('\n💡 Alternative: Use the client SDK version (check-slp-duplicates-client.js)\n');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate SLP training records...\n');
  
  try {
    // Load extracted records
    const extractedPath = path.join(__dirname, '../extracted_new_slp_training.json');
    if (!fs.existsSync(extractedPath)) {
      console.error('❌ Error: extracted_new_slp_training.json not found');
      console.log('💡 Run extract-new-slp-training.js first\n');
      process.exit(1);
    }
    
    const extractedRecords = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
    console.log(`📊 Loaded ${extractedRecords.length} extracted records\n`);
    
    // Fetch all existing mobile numbers from Firebase
    console.log('📡 Fetching existing records from Firebase...');
    const slpTrainingRef = db.collection('slp_training');
    const snapshot = await slpTrainingRef.get();
    
    const existingMobiles = new Set();
    const existingRecords = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.mobile_number) {
        existingMobiles.add(data.mobile_number);
        existingRecords.push({
          id: doc.id,
          name: data.name,
          mobile_number: data.mobile_number,
          assembly: data.assembly
        });
      }
    });
    
    console.log(`✅ Found ${existingMobiles.size} existing records in Firebase\n`);
    
    // Check for duplicates
    const duplicates = [];
    const newRecords = [];
    
    for (const record of extractedRecords) {
      if (existingMobiles.has(record.mobile_number)) {
        // Find the existing record for comparison
        const existing = existingRecords.find(r => r.mobile_number === record.mobile_number);
        duplicates.push({
          mobile: record.mobile_number,
          newName: record.name,
          existingName: existing?.name,
          newAssembly: record.assembly,
          existingAssembly: existing?.assembly,
          existingId: existing?.id
        });
      } else {
        newRecords.push(record);
      }
    }
    
    console.log('📊 DUPLICATE CHECK RESULTS:');
    console.log('═══════════════════════════════════════');
    console.log(`Total extracted records: ${extractedRecords.length}`);
    console.log(`Existing in Firebase: ${existingMobiles.size}`);
    console.log(`Duplicates found: ${duplicates.length}`);
    console.log(`New records to upload: ${newRecords.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  DUPLICATE RECORDS (first 10):');
      console.log('═══════════════════════════════════════');
      duplicates.slice(0, 10).forEach(d => {
        console.log(`\nMobile: ${d.mobile}`);
        console.log(`  New:      ${d.newName} (${d.newAssembly})`);
        console.log(`  Existing: ${d.existingName} (${d.existingAssembly})`);
        console.log(`  ID:       ${d.existingId}`);
      });
      if (duplicates.length > 10) {
        console.log(`\n  ... and ${duplicates.length - 10} more duplicates`);
      }
    }
    
    // Save filtered records (no duplicates)
    const filteredPath = path.join(__dirname, '../filtered_new_slp_training.json');
    fs.writeFileSync(filteredPath, JSON.stringify(newRecords, null, 2), 'utf8');
    
    console.log('\n✅ Duplicate check complete!');
    console.log(`📁 Filtered records saved to: filtered_new_slp_training.json`);
    console.log(`📦 ${newRecords.length} new records ready for upload\n`);
    
    // Save duplicate report
    const reportPath = path.join(__dirname, '../duplicate-check-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalExtracted: extractedRecords.length,
        existingInFirebase: existingMobiles.size,
        duplicatesFound: duplicates.length,
        newRecords: newRecords.length
      },
      duplicates,
      recommendation: newRecords.length > 0 
        ? `Upload ${newRecords.length} new records using: node scripts/upload-new-slp-training.js`
        : 'No new records to upload - all records already exist in Firebase'
    }, null, 2), 'utf8');
    
    console.log(`📋 Duplicate check report saved to: duplicate-check-report.json\n`);
    
    if (newRecords.length === 0) {
      console.log('ℹ️  All extracted records already exist in Firebase');
      console.log('   No upload needed!\n');
    } else {
      console.log('✨ Next step: Upload the filtered records');
      console.log('   Run: node scripts/upload-new-slp-training.js\n');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during duplicate check:', error);
    process.exit(1);
  }
}

// Run check
checkDuplicates();
