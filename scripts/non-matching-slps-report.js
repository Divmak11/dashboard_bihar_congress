const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDD9RZZM8u5_Q6I24SJk1_jACFeZTGgSpw",
  authDomain: "congressdashboard-e521d.firebaseapp.com",
  projectId: "congressdashboard-e521d",
  storageBucket: "congressdashboard-e521d.firebasestorage.app",
  messagingSenderId: "561776205072",
  appId: "1:561776205072:web:003a31ab2a9def84915995"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function generateNonMatchingReport() {
  console.log('📋 Generating Non-Matching SLPs Report...\n');
  
  try {
    // Read Excel file
    const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
    const workbook = XLSX.readFile(workbookPath);
    const worksheet = workbook.Sheets['SLP-State'];
    
    // Convert sheet to array
    const sheetArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Extract SLP data (Leader Name in column 3, Contact No. in column 5)
    const sheetSlps = sheetArray.slice(2).map(row => ({
      leaderName: row[2] || 'Unknown',
      contactNo: String(row[4] || '').trim()
    })).filter(slp => slp.contactNo && slp.leaderName && slp.leaderName !== 'Leader Name');
    
    console.log(`📊 Processing ${sheetSlps.length} SLPs from sheet...\n`);
    
    // Find non-matching SLPs
    const nonMatches = [];
    
    for (const sheetSlp of sheetSlps) {
      try {
        // Search for matching mobile number in wtm-slp collection
        const searchQuery = query(
          collection(db, 'wtm-slp'),
          where('mobileNumber', '==', sheetSlp.contactNo)
        );
        const querySnapshot = await getDocs(searchQuery);
        
        if (querySnapshot.empty) {
          nonMatches.push({
            leaderName: sheetSlp.leaderName,
            contactNo: sheetSlp.contactNo
          });
        }
        
        // Progress indicator
        if (nonMatches.length % 50 === 0) {
          console.log(`Processed... Non-matches found so far: ${nonMatches.length}`);
        }
        
      } catch (error) {
        console.error(`Error checking ${sheetSlp.leaderName}:`, error);
      }
    }
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📋 NON-MATCHING SLPs REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Total SLPs in sheet: ${sheetSlps.length}`);
    console.log(`❌ SLPs with no Firebase matches: ${nonMatches.length}`);
    console.log(`✅ SLPs with Firebase matches: ${sheetSlps.length - nonMatches.length}`);
    
    if (nonMatches.length > 0) {
      console.log('\n📋 Complete list of non-matching SLPs:');
      console.log('='.repeat(50));
      nonMatches.forEach((slp, index) => {
        console.log(`${index + 1}. ${slp.leaderName} - ${slp.contactNo}`);
      });
      
      // Save to CSV file
      const csvContent = [
        'Sr. No.,Leader Name,Contact No.',
        ...nonMatches.map((slp, index) => `${index + 1},"${slp.leaderName}","${slp.contactNo}"`)
      ].join('\n');
      
      const csvPath = path.join(__dirname, '..', 'non-matching-slps.csv');
      fs.writeFileSync(csvPath, csvContent);
      console.log(`\n📁 Report saved to: ${csvPath}`);
    }
    
    console.log('\n✅ Report generation completed!');
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run the report
if (require.main === module) {
  generateNonMatchingReport()
    .then(() => {
      console.log('\n🎉 Report generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Report generation failed:', error);
      process.exit(1);
    });
}

module.exports = { generateNonMatchingReport };
