const fs = require('fs');
const path = require('path');

async function uploadSlpTrainingData() {
  try {
    console.log('🚀 Starting SLP Training data upload to Firebase...');
    
    // Read the extracted data
    const dataPath = path.join(__dirname, '../extracted_assembly_data.json');
    const slpTrainingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`📊 Uploading ${slpTrainingData.length} SLP training records...`);
    
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
          body: JSON.stringify({ slpTrainingData })
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
      console.log('✅ Upload successful!');
      console.log(`📈 ${result.totalRecords} SLP training records uploaded to Firebase`);
      console.log('🎉 All SLP training data has been successfully stored in the slp_training collection');
    } else {
      console.error('❌ Upload failed:', result.error);
      console.error('Details:', result.details);
    }
    
  } catch (error) {
    console.error('💥 Error during upload:', error.message);
    console.log('\n📋 Manual Upload Instructions:');
    console.log('1. Start your Next.js development server: npm run dev');
    console.log('2. Ensure API_BASE_URL points to your dev server if not on :3000 or :3001');
    console.log('3. Run this script again: node scripts/upload-slp-training.js');
    console.log('4. Or manually import the data from: extracted_assembly_data.json');
  }
}

// Run the upload
uploadSlpTrainingData();
