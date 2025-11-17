/**
 * Script to upload check-in data to Firebase via API route
 * Run with: node upload-checkin-data.js
 */

const fs = require('fs');
const path = require('path');

async function uploadCheckinData() {
  try {
    console.log('Reading check-in data from JSON file...');
    const jsonPath = path.join(__dirname, 'all_checkins_bihar.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const checkinData = JSON.parse(rawData);
    
    console.log(`Found ${checkinData.length} user records`);
    console.log('Uploading to Firebase via API...');
    
    const response = await fetch('http://localhost:3000/api/checkin-data/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkinData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS:', result.message);
      console.log(`📊 Records uploaded: ${result.recordsUploaded}`);
    } else {
      console.error('❌ ERROR:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to upload check-in data:', error.message);
  }
}

uploadCheckinData();
