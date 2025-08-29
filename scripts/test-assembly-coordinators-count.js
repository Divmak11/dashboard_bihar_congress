// Import Firebase client SDK (not admin SDK)
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase configuration (same as in the project)
const firebaseConfig = {
  apiKey: "AIzaSyDD9RZZM8u5_Q6I24SJk1_jACFeZTGgSpw",
  authDomain: "congressdashboard-e521d.firebaseapp.com",
  projectId: "congressdashboard-e521d",
  storageBucket: "congressdashboard-e521d.firebasestorage.app",
  messagingSenderId: "561776205072",
  appId: "1:561776205072:web:003a31ab2a9def84915995"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function countAssemblyCoordinators() {
  try {
    console.log('🔍 Querying users collection for Assembly Coordinators...');
    
    // Query users collection for documents with role 'Assembly Coordinator'
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'Assembly Coordinator'));
    
    console.log('📊 Executing Firestore query...');
    const snapshot = await getDocs(q);
    
    const count = snapshot.size;
    console.log(`✅ Found ${count} Assembly Coordinators in users collection`);
    
    // Log some sample data for verification
    if (count > 0) {
      console.log('\n📋 Sample Assembly Coordinators:');
      let sampleCount = 0;
      snapshot.forEach((doc) => {
        if (sampleCount < 5) { // Show first 5 as samples
          const data = doc.data();
          console.log(`  - ID: ${doc.id}`);
          console.log(`    Name: ${data.name || 'N/A'}`);
          console.log(`    Assembly: ${data.assembly || 'N/A'}`);
          console.log(`    Role: ${data.role}`);
          console.log('    ---');
          sampleCount++;
        }
      });
      
      if (count > 5) {
        console.log(`    ... and ${count - 5} more Assembly Coordinators`);
      }
    }
    
    // Additional statistics
    console.log('\n📈 Additional Statistics:');
    const assemblies = new Set();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.assembly) {
        assemblies.add(data.assembly);
      }
    });
    
    console.log(`📍 Unique Assemblies covered: ${assemblies.size}`);
    console.log(`👥 Total Assembly Coordinators: ${count}`);
    
    return count;
    
  } catch (error) {
    console.error('❌ Error querying Assembly Coordinators:', error);
    throw error;
  }
}

// Run the test
async function runTest() {
  console.log('🚀 Starting Assembly Coordinators Count Test');
  console.log('='.repeat(50));
  
  try {
    const startTime = Date.now();
    const count = await countAssemblyCoordinators();
    const endTime = Date.now();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed successfully!');
    console.log(`⏱️  Query execution time: ${endTime - startTime}ms`);
    console.log(`🎯 Final Result: ${count} Assembly Coordinators found`);
    
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Test failed with error:', error.message);
  } finally {
    console.log('🔚 Test execution completed');
  }
}

// Execute the test
runTest();
