const fs = require('fs');
const path = require('path');

async function uploadTrainingData() {
  try {
    console.log('🚀 Starting Firebase upload via API...');
    
    // Read the extracted data
    const dataPath = path.join(__dirname, 'wtm-training-data.json');
    const trainingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`📊 Uploading ${trainingData.length} training records...`);
    
    // Resolve base URL (try 3000 then 3001) or use env override
    const baseCandidates = [
      process.env.API_BASE_URL,
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);

    let lastError;
    let response;
    for (const baseUrl of baseCandidates) {
      const url = `${baseUrl.replace(/\/$/, '')}/api/training/upload`;
      console.log(`➡️  Attempting upload to: ${url}`);
      try {
        // Make API call to upload data
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trainingData })
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
      console.log(`📈 ${result.totalRecords} records uploaded to Firebase`);
      console.log('🎉 All training data has been successfully stored in the training collection');
    } else {
      console.error('❌ Upload failed:', result.error);
      console.error('Details:', result.details);
    }
    
  } catch (error) {
    console.error('💥 Error during upload:', error.message);
    console.log('\n📋 Manual Upload Instructions:');
    console.log('1. Start your Next.js development server: npm run dev');
    console.log('2. Ensure API_BASE_URL points to your dev server if not on :3000 or :3001');
    console.log('3. Run this script again: node scripts/upload-to-firebase.js');
    console.log('4. Or manually import the data from: scripts/wtm-training-data.json');
  }
}

// Run the upload
uploadTrainingData();
