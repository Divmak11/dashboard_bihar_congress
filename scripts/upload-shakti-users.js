#!/usr/bin/env node
/**
 * Script: upload-shakti-users.js
 * 
 * Purpose: Upload shakti-users entries to Firestore
 * 
 * Features:
 *   - Reads shakti_users_final.json
 *   - Uses existing 'id' field as Firestore document ID
 *   - Batch uploads with chunking (500 docs per batch)
 *   - Progress tracking and error handling
 * 
 * Usage:
 *   $ node scripts/upload-shakti-users.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, writeBatch, doc } = require('firebase/firestore');
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

async function uploadShaktiUsersToFirestore() {
  console.log('🚀 Starting Shakti Users Upload to Firestore\n');
  
  try {
    // Step 1: Read shakti_users_final.json
    console.log('📊 Reading shakti_users_final.json...');
    const shaktiUsersPath = path.join(__dirname, 'output', 'shakti_users_final.json');
    
    if (!fs.existsSync(shaktiUsersPath)) {
      throw new Error('shakti_users_final.json not found. Run prepare-shakti-users.js first.');
    }
    
    const shaktiUsers = JSON.parse(fs.readFileSync(shaktiUsersPath, 'utf8'));
    console.log(`   ✅ Loaded ${shaktiUsers.length} entries\n`);
    
    // Step 2: Prepare entries for upload
    console.log('🔧 Preparing entries for upload...');
    const stats = {
      ac: shaktiUsers.filter(u => u.role === 'AC').length,
      slp: shaktiUsers.filter(u => u.role === 'SLP').length,
      total: shaktiUsers.length,
      gender: {
        male: shaktiUsers.filter(u => u.gender === 'Male').length,
        female: shaktiUsers.filter(u => u.gender === 'Female').length,
        other: shaktiUsers.filter(u => u.gender === 'Other').length
      }
    };
    
    console.log(`   ✅ Prepared entries:`);
    console.log(`      • AC:     ${stats.ac}`);
    console.log(`      • SLP:    ${stats.slp}`);
    console.log(`      • Total:  ${stats.total}\n`);
    
    // Step 3: Upload in batches
    console.log('📤 Starting batch upload to shakti-users collection...');
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    
    for (let i = 0; i < shaktiUsers.length; i += batchSize) {
      batches.push(shaktiUsers.slice(i, i + batchSize));
    }
    
    console.log(`   📦 Created ${batches.length} batches (${batchSize} docs per batch)\n`);
    
    let uploadedCount = 0;
    let batchNumber = 0;
    
    for (const batch of batches) {
      batchNumber++;
      console.log(`   ⏳ Processing batch ${batchNumber}/${batches.length} (${batch.length} docs)...`);
      
      const firestoreBatch = writeBatch(db);
      
      for (const entry of batch) {
        // Use the existing 'id' field as the Firestore document ID
        const docId = entry.id;
        
        // Create document reference with specific ID
        const docRef = doc(db, 'shakti-users', docId);
        
        // Set the document (id field will be included in the document data)
        firestoreBatch.set(docRef, entry);
      }
      
      try {
        await firestoreBatch.commit();
        uploadedCount += batch.length;
        console.log(`      ✅ Batch ${batchNumber} committed successfully (${uploadedCount}/${shaktiUsers.length} total)`);
      } catch (error) {
        console.error(`      ❌ Batch ${batchNumber} failed:`, error.message);
        throw error;
      }
      
      // Small delay between batches to avoid rate limiting
      if (batchNumber < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Step 4: Generate summary report
    console.log('\n' + '='.repeat(70));
    console.log('📊 UPLOAD SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Successfully uploaded ${uploadedCount} entries to Firestore:`);
    console.log(`   • AC entries:     ${stats.ac}`);
    console.log(`   • SLP entries:    ${stats.slp}`);
    console.log(`   • Total:          ${stats.total}`);
    
    console.log(`\n👥 Gender Distribution:`);
    console.log(`   • Male:           ${stats.gender.male}`);
    console.log(`   • Female:         ${stats.gender.female}`);
    console.log(`   • Other:          ${stats.gender.other}`);
    
    console.log(`\n📁 Collection: shakti-users`);
    console.log(`📝 Document IDs: Used existing 'id' field from d2d_members`);
    console.log(`🔗 Handler IDs: ACs reference self, SLPs reference parent AC`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Upload completed successfully!');
    console.log('='.repeat(70));
    
    console.log('\n💡 Document Structure:');
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
    console.log('   1. Verify entries in Firebase Console');
    console.log('   2. Check shakti-users collection');
    console.log('   3. Test querying by role, gender, assembly');
    console.log('   4. Verify handler_id relationships work correctly\n');
    
  } catch (error) {
    console.error('\n❌ Error during upload:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  uploadShaktiUsersToFirestore()
    .then(() => {
      console.log('\n🎉 Script execution completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { uploadShaktiUsersToFirestore };
