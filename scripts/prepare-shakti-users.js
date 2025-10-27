#!/usr/bin/env node
/**
 * Script: prepare-shakti-users.js
 * 
 * Purpose: Prepare shakti-users collection entries from workbook.xlsx
 * 
 * Features:
 *   - Extracts AC and SLP data with Gender field
 *   - Fetches d2d_members Firestore IDs for handler_id mapping
 *   - Maps phoneNumbers to document IDs
 *   - Validates gender (defaults to "Female" if empty/invalid)
 *   - Outputs final list to JSON for review before upload
 * 
 * Model:
 *   { id, name, phoneNumber, assembly, role, handler_id, createdAt, gender }
 * 
 * Usage:
 *   $ node scripts/prepare-shakti-users.js
 */

const XLSX = require('xlsx');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

// Utility: Normalize phone number to last 10 digits
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : (digits || null);
}

// Utility: Count different digits between two phone numbers
function countDifferentDigits(phone1, phone2) {
  if (!phone1 || !phone2 || phone1.length !== phone2.length) return 10;
  let diff = 0;
  for (let i = 0; i < phone1.length; i++) {
    if (phone1[i] !== phone2[i]) diff++;
  }
  return diff;
}

// Utility: Find closest matching phone with fuzzy matching (max 2 digit difference)
function findClosestPhone(targetPhone, phoneMap, maxDiff = 2) {
  if (!targetPhone) return null;
  
  // First try exact match
  if (phoneMap.has(targetPhone)) {
    return { phone: targetPhone, exact: true, diff: 0 };
  }
  
  // Try fuzzy match
  let bestMatch = null;
  let minDiff = maxDiff + 1;
  
  for (const [phone, data] of phoneMap.entries()) {
    const diff = countDifferentDigits(targetPhone, phone);
    if (diff > 0 && diff <= maxDiff && diff < minDiff) {
      bestMatch = { phone, data, diff };
      minDiff = diff;
    }
  }
  
  return bestMatch;
}

// Utility: Validate and normalize gender
function normalizeGender(gender) {
  if (!gender) return 'Female';
  
  const normalized = String(gender).trim().toLowerCase();
  
  // Valid gender values
  if (normalized === 'male' || normalized === 'm') return 'Male';
  if (normalized === 'female' || normalized === 'f') return 'Female';
  if (normalized === 'other' || normalized === 'o') return 'Other';
  
  // Default to Female for any invalid/empty values
  return 'Female';
}

async function prepareShaktiUsers() {
  console.log('🚀 Starting Shakti Users Preparation Script\n');
  
  try {
    // Step 1: Fetch existing d2d_members to get Firestore-generated IDs
    console.log('📊 Fetching d2d_members from Firestore to get document IDs...');
    const d2dMembersRef = collection(db, 'd2d_members');
    const d2dSnapshot = await getDocs(d2dMembersRef);
    
    // Build phone -> docId maps for AC and SLP
    const acPhoneToDocId = new Map(); // normalized phone -> { docId, name, assembly }
    const slpPhoneToDocId = new Map(); // normalized phone -> { docId, name, assembly, acPhone }
    
    let acCount = 0;
    let slpCount = 0;
    
    d2dSnapshot.forEach(doc => {
      const data = doc.data();
      const normalizedPhone = normalizePhone(data.phoneNumber);
      
      if (!normalizedPhone) return;
      
      if (data.role === 'AC') {
        acPhoneToDocId.set(normalizedPhone, {
          docId: doc.id,
          name: data.name,
          assembly: data.assembly || ''
        });
        acCount++;
      } else if (data.role === 'SLP') {
        slpPhoneToDocId.set(normalizedPhone, {
          docId: doc.id,
          name: data.name,
          assembly: data.assembly || '',
          acPhone: data.handler_id // This is the AC's phone number
        });
        slpCount++;
      }
    });
    
    console.log(`   ✅ Found ${acCount} ACs and ${slpCount} SLPs in Firestore`);
    console.log(`   ✅ Built phone-to-docId maps\n`);
    
    // Step 2: Read workbook
    console.log('📋 Reading workbook.xlsx...');
    const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
    
    if (!fs.existsSync(workbookPath)) {
      throw new Error('workbook.xlsx not found in project root');
    }
    
    const workbook = XLSX.readFile(workbookPath);
    console.log(`   ✅ Workbook loaded\n`);
    
    // Step 3: Parse AC Details sheet
    console.log('📋 Parsing "AC Details" sheet...');
    const acSheet = workbook.Sheets['AC Details'];
    const acData = XLSX.utils.sheet_to_json(acSheet);
    console.log(`   Found ${acData.length} rows`);
    
    const shaktiAcEntries = [];
    let acSkipped = 0;
    let acNoDocId = 0;
    
    for (const row of acData) {
      const name = row['Name'];
      const phone = row['Phone'];
      const assembly = row['Assembly'];
      const gender = row['Gender'];
      
      const normalizedPhone = normalizePhone(phone);
      
      if (!normalizedPhone || !name) {
        acSkipped++;
        continue;
      }
      
      // Find the Firestore doc ID for this AC
      const acDoc = acPhoneToDocId.get(normalizedPhone);
      
      if (!acDoc) {
        acNoDocId++;
        console.log(`   ⚠️  AC "${name}" (${normalizedPhone}) not found in d2d_members`);
        continue;
      }
      
      // Create shakti-users entry for AC
      shaktiAcEntries.push({
        id: acDoc.docId, // Firestore document ID
        name: name || '',
        phoneNumber: normalizedPhone,
        assembly: assembly || '',
        role: 'AC',
        handler_id: acDoc.docId, // AC's handler_id is their own docId
        createdAt: Date.now(),
        gender: normalizeGender(gender)
      });
    }
    
    console.log(`   ✅ Processed ${shaktiAcEntries.length} AC entries (skipped ${acSkipped} invalid, ${acNoDocId} not in Firestore)\n`);
    
    // Step 4: Parse SLP Details sheet
    console.log('📋 Parsing "SLP Details" sheet...');
    const slpSheet = workbook.Sheets['SLP Details'];
    const slpData = XLSX.utils.sheet_to_json(slpSheet);
    console.log(`   Found ${slpData.length} rows`);
    
    const shaktiSlpEntries = [];
    let slpSkipped = 0;
    let slpNoDocId = 0;
    let slpNoAcDocId = 0;
    let lastAcPhoneNormalized = null;
    
    for (const row of slpData) {
      const name = row['Name'];
      const mobileNumber = row['Mobile Number'];
      const acPhoneNo = row['AC Phone No.'];
      const gender = row['Gender'];
      
      const normalizedPhone = normalizePhone(mobileNumber);
      const normalizedAcPhoneCandidate = normalizePhone(acPhoneNo);
      const normalizedAcPhone = normalizedAcPhoneCandidate || lastAcPhoneNormalized;
      if (normalizedAcPhoneCandidate) {
        lastAcPhoneNormalized = normalizedAcPhoneCandidate;
      }
      
      if (!normalizedPhone || !name) {
        slpSkipped++;
        continue;
      }
      
      // Find the Firestore doc ID for this SLP
      const slpDoc = slpPhoneToDocId.get(normalizedPhone);
      
      if (!slpDoc) {
        slpNoDocId++;
        continue; // SLP not in d2d_members, skip silently
      }
      
      // Find the AC's Firestore doc ID for handler_id
      let acDocId = null;
      let ac = acPhoneToDocId.get(normalizedAcPhone);
      
      if (!ac && normalizedAcPhone) {
        // Try fuzzy match for AC phone
        const match = findClosestPhone(normalizedAcPhone, acPhoneToDocId, 2);
        if (match && match.diff <= 2) {
          ac = match.data;
          console.log(`   🔧 Fuzzy matched SLP "${name}" AC phone ${normalizedAcPhone} -> ${match.phone} (${match.diff} digit diff)`);
        }
      }
      
      if (ac) {
        acDocId = ac.docId;
      } else {
        slpNoAcDocId++;
        console.log(`   ⚠️  SLP "${name}" (${normalizedPhone}) - AC not found in Firestore, skipping`);
        continue;
      }
      
      // Create shakti-users entry for SLP
      shaktiSlpEntries.push({
        id: slpDoc.docId, // Firestore document ID
        name: name || '',
        phoneNumber: normalizedPhone,
        assembly: slpDoc.assembly, // Use resolved assembly from d2d_members
        role: 'SLP',
        handler_id: acDocId, // AC's Firestore document ID
        createdAt: Date.now(),
        gender: normalizeGender(gender)
      });
    }
    
    console.log(`   ✅ Processed ${shaktiSlpEntries.length} SLP entries (skipped ${slpSkipped} invalid, ${slpNoDocId} not in d2d_members, ${slpNoAcDocId} AC not found)\n`);
    
    // Step 5: Combine and generate stats
    const allShaktiUsers = [...shaktiAcEntries, ...shaktiSlpEntries];
    
    const stats = {
      ac: shaktiAcEntries.length,
      slp: shaktiSlpEntries.length,
      total: allShaktiUsers.length,
      genderStats: {
        male: allShaktiUsers.filter(u => u.gender === 'Male').length,
        female: allShaktiUsers.filter(u => u.gender === 'Female').length,
        other: allShaktiUsers.filter(u => u.gender === 'Other').length
      }
    };
    
    // Step 6: Write output file
    console.log('💾 Writing output file...');
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'shakti_users_final.json');
    fs.writeFileSync(outputPath, JSON.stringify(allShaktiUsers, null, 2));
    console.log(`   ✅ Output saved to: ${outputPath}\n`);
    
    // Step 7: Print summary
    console.log('='.repeat(70));
    console.log('📊 SHAKTI-USERS PREPARATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Prepared Entries:`);
    console.log(`   • AC:     ${stats.ac.toString().padStart(4)} entries`);
    console.log(`   • SLP:    ${stats.slp.toString().padStart(4)} entries`);
    console.log(`   • Total:  ${stats.total.toString().padStart(4)} entries`);
    
    console.log(`\n👥 Gender Distribution:`);
    console.log(`   • Male:   ${stats.genderStats.male.toString().padStart(4)} entries`);
    console.log(`   • Female: ${stats.genderStats.female.toString().padStart(4)} entries`);
    console.log(`   • Other:  ${stats.genderStats.other.toString().padStart(4)} entries`);
    
    console.log(`\n📁 Output File:`);
    console.log(`   • Location: scripts/output/shakti_users_final.json`);
    console.log(`   • Ready for upload to: shakti-users collection`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Preparation completed successfully!');
    console.log('='.repeat(70));
    
    console.log('\n💡 Entry Model:');
    console.log('   {');
    console.log('     id: <Firestore docId>,');
    console.log('     name: <string>,');
    console.log('     phoneNumber: <10 digits>,');
    console.log('     assembly: <string>,');
    console.log('     role: "AC" | "SLP",');
    console.log('     handler_id: <AC docId for SLPs, own docId for ACs>,');
    console.log('     createdAt: <epoch ms>,');
    console.log('     gender: "Male" | "Female" | "Other"');
    console.log('   }');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Review shakti_users_final.json for accuracy');
    console.log('   2. Verify handler_id references are correct');
    console.log('   3. Create upload script for shakti-users collection');
    console.log('   4. Upload to Firestore when ready\n');
    
  } catch (error) {
    console.error('\n❌ Error during preparation:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  prepareShaktiUsers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { prepareShaktiUsers };
