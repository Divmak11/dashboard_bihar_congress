// Client SDK version - works with existing Firebase setup
const fs = require('fs');
const path = require('path');

async function checkDuplicatesViaAPI() {
  console.log('🔍 Checking for duplicate SLP training records via API...\n');
  
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
    
    // Fetch existing records from Firebase via API
    console.log('📡 Fetching existing records from Firebase...');
    
    const baseCandidates = [
      process.env.API_BASE_URL,
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);
    
    let response;
    let lastError;
    
    for (const baseUrl of baseCandidates) {
      const url = `${baseUrl.replace(/\/$/, '')}/api/slp-training/check-duplicates`;
      
      try {
        console.log(`   Trying: ${url}`);
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            mobileNumbers: extractedRecords.map(r => r.mobile_number) 
          })
        });
        
        if (response.ok) {
          break;
        } else {
          const err = await response.text();
          throw new Error(err || `HTTP ${response.status}`);
        }
      } catch (e) {
        console.warn(`   Failed: ${e.message}`);
        lastError = e;
      }
    }
    
    if (!response || !response.ok) {
      console.error('\n❌ Could not reach API endpoint');
      console.log('\n💡 Alternative: Manual duplicate check');
      console.log('   The upload API will handle duplicates automatically using merge: true');
      console.log('   You can proceed directly to upload:\n');
      console.log('   Run: node scripts/upload-new-slp-training.js\n');
      
      // Copy extracted to filtered for upload
      const filteredPath = path.join(__dirname, '../filtered_new_slp_training.json');
      fs.copyFileSync(extractedPath, filteredPath);
      console.log('   ℹ️  Copied extracted records to filtered_new_slp_training.json');
      console.log('   The API will handle deduplication during upload\n');
      process.exit(0);
    }
    
    const result = await response.json();
    const existingMobiles = new Set(result.existingMobiles || []);
    
    console.log(`✅ Found ${existingMobiles.size} existing records in Firebase\n`);
    
    // Check for duplicates
    const duplicates = [];
    const newRecords = [];
    
    for (const record of extractedRecords) {
      if (existingMobiles.has(record.mobile_number)) {
        duplicates.push({
          mobile: record.mobile_number,
          name: record.name,
          assembly: record.assembly
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
        console.log(`  ${d.name} (${d.mobile}) - ${d.assembly}`);
      });
      if (duplicates.length > 10) {
        console.log(`  ... and ${duplicates.length - 10} more duplicates`);
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
    
  } catch (error) {
    console.error('❌ Error during duplicate check:', error.message);
    console.log('\n💡 You can still proceed with upload');
    console.log('   The API handles duplicates automatically using deterministic IDs\n');
    process.exit(1);
  }
}

checkDuplicatesViaAPI();
