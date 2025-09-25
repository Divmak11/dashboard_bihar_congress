const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc, serverTimestamp } = require('firebase/firestore');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

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

async function fixNameMatchingSlpOnly() {
  console.log('🔧 Starting SLP-only name matching fix...\n');
  
  try {
    // Step 1: Read CSV file with remaining unmatched SLPs
    const csvPath = path.join(__dirname, '..', 'non-matching-slps.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('⚠️  non-matching-slps.csv not found.');
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
      .filter(slp => slp && slp.leaderName !== '-');
    
    console.log(`📋 Found ${nonMatchingSlps.length} SLPs still unmatched\n`);
    
    // Step 2: Read original Excel data to get mobile numbers for previously matched names
    console.log('📊 Reading original Excel data for mobile numbers...');
    const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
    const workbook = XLSX.readFile(workbookPath);
    const worksheet = workbook.Sheets['SLP-State'];
    const sheetArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const originalSlps = sheetArray.slice(2).map(row => ({
      leaderName: row[2] || 'Unknown',
      contactNo: String(row[4] || '').trim()
    })).filter(slp => slp.contactNo && slp.leaderName && slp.leaderName !== 'Leader Name');
    
    // Create a lookup map for mobile numbers
    const nameMobileMap = {};
    originalSlps.forEach(slp => {
      nameMobileMap[slp.leaderName] = slp.contactNo;
    });
    
    // Step 3: Identify names that were previously matched multiple times
    const namesWithMultipleMatches = [
      'Vikas Kumar',
      'Rahul Kumar', 
      'Subodh Kumar',
      'Aftab Alam',
      'Nitish Kumar',
      'Manju Devi',
      'Nitesh Kumar',
      'Manish Kumar'
    ];
    
    console.log('🔍 Checking names that had multiple Firebase entries:');
    console.log(namesWithMultipleMatches.join(', '), '\n');
    
    // Step 3: Reset incorrect updates and fix SLP-only matching
    let resetCount = 0;
    let correctUpdates = 0;
    const processedNames = new Set();
    
    // Process each name that had multiple matches
    for (const nameToCheck of namesWithMultipleMatches) {
      try {
        // Find all documents with this name
        const nameQuery = query(
          collection(db, 'wtm-slp'),
          where('name', '==', nameToCheck)
        );
        const nameSnapshot = await getDocs(nameQuery);
        
        if (!nameSnapshot.empty && nameSnapshot.docs.length > 1) {
          console.log(`\n📊 Found ${nameSnapshot.docs.length} entries for "${nameToCheck}"`);
          
          let slpFound = false;
          let slpDocument = null;
          
          // Check each document for recommendedPosition
          for (const docRef of nameSnapshot.docs) {
            const docData = docRef.data();
            const isSlp = docData.recommendedPosition === 'SLP';
            const isHighlyActive = docData.activityStatus === 'Highly Active';
            
            console.log(`  - ID: ${docRef.id}, Position: ${docData.recommendedPosition || 'undefined'}, Status: ${docData.activityStatus || 'undefined'}`);
            
            if (isSlp) {
              slpFound = true;
              slpDocument = { id: docRef.id, data: docData };
            }
            
            // Reset all "Highly Active" status first
            if (isHighlyActive) {
              await updateDoc(doc(db, 'wtm-slp', docRef.id), {
                activityStatus: 'Active',
                lastUpdated: serverTimestamp()
              });
              resetCount++;
              console.log(`    🧹 Reset: ${docRef.id} to Active`);
            }
          }
          
          // Update only the SLP document if found
          if (slpFound && slpDocument) {
            // Get mobile number from original Excel data
            const mobileNumber = nameMobileMap[nameToCheck];
            if (mobileNumber) {
              await updateDoc(doc(db, 'wtm-slp', slpDocument.id), {
                activityStatus: 'Highly Active',
                mobileNumber: mobileNumber,
                lastUpdated: serverTimestamp()
              });
              correctUpdates++;
              processedNames.add(nameToCheck);
              console.log(`    ✅ Updated SLP only: ${slpDocument.id} → Mobile: ${mobileNumber}`);
              
              // Remove from unmatched list since we successfully matched it
              const indexToRemove = nonMatchingSlps.findIndex(slp => slp.leaderName === nameToCheck);
              if (indexToRemove !== -1) {
                nonMatchingSlps.splice(indexToRemove, 1);
                console.log(`    📝 Removed "${nameToCheck}" from unmatched list`);
              }
            } else {
              console.log(`    ❌ No mobile number found for "${nameToCheck}" in original data`);
            }
          } else {
            console.log(`    ❌ No SLP position found for "${nameToCheck}"`);
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing ${nameToCheck}:`, error);
      }
    }
    
    // Step 4: Process remaining unmatched SLPs (single matches)
    console.log('\n🔍 Processing remaining SLPs for single name matches...');
    let additionalMatches = 0;
    const finalUnmatched = [];
    
    for (const csvSlp of nonMatchingSlps) {
      try {
        // Skip names already processed above
        if (processedNames.has(csvSlp.leaderName)) {
          continue;
        }
        
        // Search for single name match with SLP position
        const nameQuery = query(
          collection(db, 'wtm-slp'),
          where('name', '==', csvSlp.leaderName)
        );
        const nameSnapshot = await getDocs(nameQuery);
        
        let matchedSlp = false;
        
        if (!nameSnapshot.empty) {
          // Check if any of the matches has recommendedPosition = 'SLP'
          for (const docRef of nameSnapshot.docs) {
            const docData = docRef.data();
            if (docData.recommendedPosition === 'SLP') {
              await updateDoc(doc(db, 'wtm-slp', docRef.id), {
                activityStatus: 'Highly Active',
                mobileNumber: csvSlp.contactNo,
                lastUpdated: serverTimestamp()
              });
              additionalMatches++;
              matchedSlp = true;
              console.log(`✅ Single SLP match: ${csvSlp.leaderName} → Mobile: ${csvSlp.contactNo}`);
              break; // Only update the first SLP match
            }
          }
        }
        
        if (!matchedSlp) {
          finalUnmatched.push(csvSlp);
          console.log(`❌ No SLP match: ${csvSlp.leaderName}`);
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error processing ${csvSlp.leaderName}:`, error);
        finalUnmatched.push(csvSlp);
      }
    }
    
    // Step 5: Update CSV with final unmatched list
    if (finalUnmatched.length > 0) {
      const updatedCsvContent = [
        'Sr. No.,Leader Name,Contact No.',
        ...finalUnmatched.map((slp, index) => `${index + 1},"${slp.leaderName}","${slp.contactNo}"`)
      ].join('\n');
      
      fs.writeFileSync(csvPath, updatedCsvContent);
      console.log(`\n📁 Updated CSV saved with ${finalUnmatched.length} remaining unmatched SLPs`);
    } else {
      fs.writeFileSync(csvPath, 'Sr. No.,Leader Name,Contact No.\n');
      console.log('\n🎉 All SLPs matched! CSV file updated with header only.');
    }
    
    // Step 6: Get final count of "Highly Active" SLPs
    const finalQuery = query(
      collection(db, 'wtm-slp'),
      where('activityStatus', '==', 'Highly Active')
    );
    const finalSnapshot = await getDocs(finalQuery);
    const finalCount = finalSnapshot.size;
    
    // Step 7: Generate corrected summary report
    console.log('\n' + '='.repeat(60));
    console.log('📋 CORRECTED SLP-ONLY MATCHING SUMMARY REPORT');
    console.log('='.repeat(60));
    console.log(`🧹 Documents reset from "Highly Active": ${resetCount}`);
    console.log(`✅ Correct SLP-only updates (multiple entries): ${correctUpdates}`);
    console.log(`✅ Additional single SLP matches: ${additionalMatches}`);
    console.log(`📊 Total correct SLP matches: ${correctUpdates + additionalMatches}`);
    console.log(`❌ Final unmatched SLPs: ${finalUnmatched.length}`);
    console.log(`📈 Final count of "Highly Active" SLPs: ${finalCount}`);
    
    if (finalUnmatched.length > 0) {
      console.log('\n📋 SLPs still unmatched (no SLP position found):');
      console.log('='.repeat(50));
      finalUnmatched.slice(0, 10).forEach((slp, index) => {
        console.log(`${index + 1}. ${slp.leaderName} - ${slp.contactNo}`);
      });
      if (finalUnmatched.length > 10) {
        console.log(`... and ${finalUnmatched.length - 10} more (see updated CSV file)`);
      }
    }
    
    console.log('\n✅ SLP-only matching correction completed!');
    
  } catch (error) {
    console.error('❌ Error during SLP-only fix:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixNameMatchingSlpOnly()
    .then(() => {
      console.log('\n🎉 Script execution completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixNameMatchingSlpOnly };
