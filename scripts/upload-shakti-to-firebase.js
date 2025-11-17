const fs = require('fs');
const path = require('path');

async function uploadShaktiDataToFirebase() {
  try {
    console.log('🚀 Starting Shakti Firebase upload via API...');
    
    // Read the extracted data
    const dataPath = path.join(__dirname, 'shakti-training-data.json');
    const trainingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`📊 Uploading ${trainingData.length} Shakti training records...`);
    
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
      console.log(`📈 ${result.totalRecords} Shakti records uploaded to Firebase`);
      console.log('🎉 All Shakti training data has been successfully stored in the training collection');
    } else {
      console.error('❌ Upload failed:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
    
  } catch (error) {
    console.error('💥 Error uploading Shakti data:', error.message);
    console.log('\n📝 Manual upload instructions:');
    console.log('1. Make sure the development server is running: npm run dev');
    console.log('2. Check the API endpoint is accessible: http://localhost:3000/api/training/upload');
    console.log('3. Retry the upload script');
  }
}

// Run the upload
uploadShaktiDataToFirebase();
