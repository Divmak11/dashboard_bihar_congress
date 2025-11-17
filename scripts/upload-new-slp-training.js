const fs = require('fs');
const path = require('path');

async function uploadNewSlpTrainingData() {
  try {
    console.log('🚀 Starting upload of new SLP Training records to Firebase...\n');
    
    // Check which file to use (filtered or extracted)
    const filteredPath = path.join(__dirname, '../filtered_new_slp_training.json');
    const extractedPath = path.join(__dirname, '../extracted_new_slp_training.json');
    
    let dataPath;
    let dataSource;
    
    if (fs.existsSync(filteredPath)) {
      dataPath = filteredPath;
      dataSource = 'filtered (duplicates removed)';
      console.log('✅ Using filtered_new_slp_training.json (duplicates already removed)\n');
    } else if (fs.existsSync(extractedPath)) {
      dataPath = extractedPath;
      dataSource = 'extracted (may contain duplicates)';
      console.log('⚠️  Using extracted_new_slp_training.json');
      console.log('💡 For best results, run check-slp-duplicates.js first\n');
    } else {
      console.error('❌ Error: No data file found');
      console.log('💡 Run extract-new-slp-training.js first\n');
      process.exit(1);
    }
    
    // Read the data
    const slpTrainingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Remove metadata fields before upload
    const cleanedData = slpTrainingData.map(record => ({
      name: record.name,
      mobile_number: record.mobile_number,
      assembly: record.assembly
    }));
    
    console.log(`📊 Uploading ${cleanedData.length} SLP training records...`);
    console.log(`   Source: ${dataSource}\n`);
    
    // Resolve base URL (try 3000 then 3001) or use env override
    const baseCandidates = [
      process.env.API_BASE_URL,
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);

    let lastError;
    let response;
    
    for (const baseUrl of baseCandidates) {
      const url = `${baseUrl.replace(/\/$/, '')}/api/slp-training/upload`;
      console.log(`➡️  Attempting upload to: ${url}`);
      
      try {
        // Make API call to upload data
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slpTrainingData: cleanedData })
        });
        
        if (response.ok) {
          break; // success
        } else {
          const err = await response.text();
          throw new Error(err || `HTTP ${response.status}`);
        }
      } catch (e) {
        console.warn(`⚠️  Upload attempt failed for ${url}:`, e.message);
        lastError = e;
      }
    }
    
    if (!response) throw lastError || new Error('No response from any base URL');

    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Upload successful!');
      console.log(`📈 ${result.totalRecords} SLP training records uploaded to Firebase`);
      console.log('🎉 All new SLP training data has been successfully stored in the slp_training collection\n');
      
      // Create upload success marker
      const successPath = path.join(__dirname, '../upload-success.json');
      fs.writeFileSync(successPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        recordsUploaded: result.totalRecords,
        sourceFile: dataPath,
        apiResponse: result
      }, null, 2), 'utf8');
      
      console.log('📋 Upload report saved to: upload-success.json\n');
      
    } else {
      console.error('\n❌ Upload failed:', result.error);
      console.error('Details:', result.details);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Error during upload:', error.message);
    console.log('\n📋 Troubleshooting Steps:');
    console.log('1. Ensure your Next.js dev server is running: npm run dev');
    console.log('2. Check that the API is accessible at :3000 or :3001');
    console.log('3. If using a different port, set API_BASE_URL environment variable');
    console.log('4. Verify Firebase configuration is correct\n');
    process.exit(1);
  }
}

// Run the upload
uploadNewSlpTrainingData();
