const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc, serverTimestamp } = require('firebase/firestore');
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

async function syncSlpActivityStatus() {
  console.log('🚀 Starting SLP Activity Status Synchronization...\n');
  
  try {
    // Step 1: Read Excel file
    console.log('📊 Reading workbook.xlsx...');
    const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
    const workbook = XLSX.readFile(workbookPath);
    const worksheet = workbook.Sheets['SLP-State'];
    
    if (!worksheet) {
      throw new Error('Sheet "SLP-State" not found in workbook.xlsx');
    }
    
    // Convert sheet to array of arrays (raw data)
    const sheetArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`📋 Found ${sheetArray.length} rows in the sheet\n`);
    
    // Step 2: Extract and clean mobile numbers from sheet
    // Based on inspection: Leader Name is in column 3 (index 2), Contact No. is in column 5 (index 4)
    // Skip first 2 rows (headers)
    console.log('🔍 Sample rows for debugging:');
    sheetArray.slice(2, 7).forEach((row, index) => {
      console.log(`Row ${index + 3}: Name="${row[2]}", Contact="${row[4]}"`);
    });
    
    const sheetSlps = sheetArray.slice(2).map(row => ({
      leaderName: row[2] || 'Unknown',
      contactNo: String(row[4] || '').trim()
    })).filter(slp => slp.contactNo && slp.leaderName && slp.leaderName !== 'Leader Name');
    
    console.log(`📱 Processing ${sheetSlps.length} SLPs with valid contact numbers\n`);
    
    if (sheetSlps.length === 0) {
      console.log('⚠️  No SLPs found - debugging filter criteria:');
      const rawData = sheetArray.slice(2, 7).map(row => ({
        leaderName: row[2] || 'Unknown',
        contactNo: String(row[4] || '').trim(),
        hasContact: !!(row[4]),
        notHeaderRow: row[2] !== 'Leader Name'
      }));
      console.log(rawData);
    }
    
    // Step 3: Get all current "Highly Active" SLPs from Firebase
    console.log('🔍 Fetching current "Highly Active" SLPs from Firebase...');
    const currentHighlyActiveQuery = query(
      collection(db, 'wtm-slp'),
      where('activityStatus', '==', 'Highly Active')
    );
    const currentHighlyActiveSnapshot = await getDocs(currentHighlyActiveQuery);
    
    const currentHighlyActive = [];
    currentHighlyActiveSnapshot.forEach(docRef => {
      currentHighlyActive.push({
        id: docRef.id,
        data: docRef.data(),
        mobileNumber: docRef.data().mobileNumber || ''
      });
    });
    
    console.log(`📊 Found ${currentHighlyActive.length} currently "Highly Active" SLPs\n`);
    
    // Step 4: Find matches and update to "Highly Active"
    console.log('🔄 Searching for matches and updating...');
    let matchesFound = 0;
    let updatesCompleted = 0;
    const nonMatches = [];
    const sheetContactNumbers = sheetSlps.map(slp => slp.contactNo);
    
    // Process each SLP from sheet
    for (const sheetSlp of sheetSlps) {
      try {
        // Search for matching mobile number in wtm-slp collection
        const searchQuery = query(
          collection(db, 'wtm-slp'),
          where('mobileNumber', '==', sheetSlp.contactNo)
        );
        const querySnapshot = await getDocs(searchQuery);
        
        if (!querySnapshot.empty) {
          matchesFound++;
          
          // Update each matching document
          for (const docRef of querySnapshot.docs) {
            await updateDoc(doc(db, 'wtm-slp', docRef.id), {
              activityStatus: 'Highly Active',
              lastUpdated: serverTimestamp()
            });
            updatesCompleted++;
            console.log(`✅ Updated: ${docRef.data().name || 'Unknown'} (${sheetSlp.contactNo})`);
          }
        } else {
          // No match found
          nonMatches.push({
            leaderName: sheetSlp.leaderName,
            contactNo: sheetSlp.contactNo
          });
          console.log(`❌ No match: ${sheetSlp.leaderName} (${sheetSlp.contactNo})`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error processing ${sheetSlp.leaderName}:`, error);
      }
    }
    
    // Step 5: Clean up invalid "Highly Active" records
    console.log('\n🧹 Cleaning up invalid "Highly Active" records...');
    let cleanupCount = 0;
    
    for (const activeSlp of currentHighlyActive) {
      // Check if this SLP's mobile number is in the sheet
      if (!sheetContactNumbers.includes(activeSlp.mobileNumber)) {
        try {
          await updateDoc(doc(db, 'wtm-slp', activeSlp.id), {
            activityStatus: 'Active', // Reset to default status
            lastUpdated: serverTimestamp()
          });
          cleanupCount++;
          console.log(`🧹 Cleaned up: ${activeSlp.data.name || 'Unknown'} (${activeSlp.mobileNumber})`);
        } catch (error) {
          console.error(`Error cleaning up ${activeSlp.id}:`, error);
        }
      }
    }
    
    // Step 6: Get final count of "Highly Active" SLPs
    console.log('\n📊 Getting final count...');
    const finalQuery = query(
      collection(db, 'wtm-slp'),
      where('activityStatus', '==', 'Highly Active')
    );
    const finalHighlyActiveSnapshot = await getDocs(finalQuery);
    
    const finalCount = finalHighlyActiveSnapshot.size;
    
    // Step 7: Generate summary report
    console.log('\n' + '='.repeat(60));
    console.log('📋 SYNCHRONIZATION SUMMARY REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Total SLPs processed from sheet: ${sheetSlps.length}`);
    console.log(`✅ Matches found and updated: ${matchesFound}`);
    console.log(`🔄 Total document updates completed: ${updatesCompleted}`);
    console.log(`🧹 Invalid "Highly Active" records cleaned up: ${cleanupCount}`);
    console.log(`📈 Final count of "Highly Active" SLPs: ${finalCount}`);
    console.log(`❌ Non-matches from sheet: ${nonMatches.length}`);
    
    if (nonMatches.length > 0) {
      console.log('\n📋 SLPs from sheet with no Firebase matches:');
      console.log('='.repeat(50));
      nonMatches.forEach((slp, index) => {
        console.log(`${index + 1}. ${slp.leaderName} - ${slp.contactNo}`);
      });
    }
    
    // Step 8: Name-based matching for remaining non-matches
    console.log('\n🔍 Starting name-based matching for remaining SLPs...');
    await performNameBasedMatching();
    
    console.log('\n✅ Synchronization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during synchronization:', error);
    process.exit(1);
  }
}

async function performNameBasedMatching() {
  try {
    // Read CSV file with non-matching SLPs
    const csvPath = path.join(__dirname, '..', 'non-matching-slps.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('⚠️  non-matching-slps.csv not found. Skipping name-based matching.');
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvLines = csvContent.split('\n').slice(1); // Skip header
    
    const nonMatchingSlps = csvLines
      .filter(line => line.trim()) // Remove empty lines
      .map(line => {
        const matches = line.match(/^(\d+),"(.+?)","(.+?)"$/);
        if (matches) {
          return {
            srNo: matches[1],
            leaderName: matches[2].trim(),
            contactNo: matches[3].trim()
          };
        }
        return null;
      })
      .filter(slp => slp && slp.leaderName !== '-'); // Remove null entries and placeholder entries
    
    console.log(`📋 Found ${nonMatchingSlps.length} SLPs for name-based matching\n`);
    
    let nameMatchesFound = 0;
    let nameUpdatesCompleted = 0;
    const stillUnmatched = [];
    
    // Process each SLP from CSV using name matching
    for (const csvSlp of nonMatchingSlps) {
      try {
        // Search for matching name in wtm-slp collection
        const nameQuery = query(
          collection(db, 'wtm-slp'),
          where('name', '==', csvSlp.leaderName)
        );
        const nameSnapshot = await getDocs(nameQuery);
        
        if (!nameSnapshot.empty) {
          nameMatchesFound++;
          
          // Update each matching document
          for (const docRef of nameSnapshot.docs) {
            await updateDoc(doc(db, 'wtm-slp', docRef.id), {
              activityStatus: 'Highly Active',
              mobileNumber: csvSlp.contactNo,
              lastUpdated: serverTimestamp()
            });
            nameUpdatesCompleted++;
            console.log(`✅ Name match updated: ${csvSlp.leaderName} → Mobile: ${csvSlp.contactNo}`);
          }
        } else {
          // Still no match found
          stillUnmatched.push(csvSlp);
          console.log(`❌ No name match: ${csvSlp.leaderName} (${csvSlp.contactNo})`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error processing name match for ${csvSlp.leaderName}:`, error);
        stillUnmatched.push(csvSlp); // Add to unmatched if error occurs
      }
    }
    
    // Generate updated CSV with only truly unmatched SLPs
    if (stillUnmatched.length > 0) {
      const updatedCsvContent = [
        'Sr. No.,Leader Name,Contact No.',
        ...stillUnmatched.map((slp, index) => `${index + 1},"${slp.leaderName}","${slp.contactNo}"`)
      ].join('\n');
      
      fs.writeFileSync(csvPath, updatedCsvContent);
      console.log(`\n📁 Updated CSV saved with ${stillUnmatched.length} remaining unmatched SLPs`);
    } else {
      // All matched, create empty CSV with just header
      fs.writeFileSync(csvPath, 'Sr. No.,Leader Name,Contact No.\n');
      console.log('\n🎉 All SLPs matched! CSV file updated with header only.');
    }
    
    // Get updated final count
    const updatedFinalQuery = query(
      collection(db, 'wtm-slp'),
      where('activityStatus', '==', 'Highly Active')
    );
    const updatedFinalSnapshot = await getDocs(updatedFinalQuery);
    const updatedFinalCount = updatedFinalSnapshot.size;
    
    // Generate name-based matching summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 NAME-BASED MATCHING SUMMARY REPORT');
    console.log('='.repeat(60));
    console.log(`📊 SLPs processed for name matching: ${nonMatchingSlps.length}`);
    console.log(`✅ Name matches found and updated: ${nameMatchesFound}`);
    console.log(`🔄 Documents updated via name matching: ${nameUpdatesCompleted}`);
    console.log(`❌ Still unmatched after name matching: ${stillUnmatched.length}`);
    console.log(`📈 Updated final count of "Highly Active" SLPs: ${updatedFinalCount}`);
    
    if (stillUnmatched.length > 0) {
      console.log('\n📋 SLPs still unmatched after name-based search:');
      console.log('='.repeat(50));
      stillUnmatched.slice(0, 10).forEach((slp, index) => {
        console.log(`${index + 1}. ${slp.leaderName} - ${slp.contactNo}`);
      });
      if (stillUnmatched.length > 10) {
        console.log(`... and ${stillUnmatched.length - 10} more (see updated CSV file)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during name-based matching:', error);
  }
}

// Run the script
if (require.main === module) {
  syncSlpActivityStatus()
    .then(() => {
      console.log('\n🎉 Script execution completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { syncSlpActivityStatus };
