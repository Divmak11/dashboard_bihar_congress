const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit, orderBy } = require('firebase/firestore');

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function testReportFixes() {
  console.log('Testing Report Fixes...\n');
  
  try {
    // 1. Fetch some ACs and check their meeting counts
    console.log('1. Checking AC meeting counts for performance zones:');
    console.log('================================================');
    
    const usersRef = collection(db, 'users');
    const acsQuery = query(usersRef, where('role', '==', 'Assembly Coordinator'), limit(20));
    const acsSnapshot = await getDocs(acsQuery);
    
    let greenZoneCount = 0; // meetings >= 7
    let orangeZoneCount = 0; // meetings >= 5 and < 7
    let redZoneCount = 0; // meetings < 5
    
    const acData = [];
    
    for (const doc of acsSnapshot.docs) {
      const data = doc.data();
      const acName = data.name || 'Unknown';
      const assembly = data.assembly || data.assemblies?.[0] || 'Unknown';
      
      // Fetch meeting count for this AC (simplified query to avoid composite index)
      const meetingsRef = collection(db, 'meetings');
      const meetingsQuery = query(
        meetingsRef,
        where('handler_id', '==', data.handler_id || doc.id)
      );
      const meetingsSnapshot = await getDocs(meetingsQuery);
      
      const meetingCount = meetingsSnapshot.size;
      
      let zone = 'Red';
      if (meetingCount >= 7) {
        greenZoneCount++;
        zone = 'Green';
      } else if (meetingCount >= 5) {
        orangeZoneCount++;
        zone = 'Orange';
      } else {
        redZoneCount++;
      }
      
      acData.push({
        name: acName,
        assembly: assembly,
        meetings: meetingCount,
        zone: zone
      });
    }
    
    // Display results
    console.log('\nSample AC Performance Data:');
    acData.slice(0, 10).forEach(ac => {
      console.log(`  ${ac.name} (${ac.assembly}): ${ac.meetings} meetings - ${ac.zone} Zone`);
    });
    
    console.log('\n2. Performance Zone Summary:');
    console.log('============================');
    console.log(`  Green Zone (Active ACs, meetings >= 7): ${greenZoneCount}`);
    console.log(`  Orange Zone (Moderate, meetings >= 5 & < 7): ${orangeZoneCount}`);
    console.log(`  Red Zone (Poor, meetings < 5): ${redZoneCount}`);
    console.log(`  Total ACs checked: ${acData.length}`);
    
    // 3. Check assemblies with no ACs
    console.log('\n3. Checking Assemblies with No ACs:');
    console.log('====================================');
    
    // Get all assemblies from zones
    const adminUsersRef = collection(db, 'admin-users');
    const zonesQuery = query(
      adminUsersRef,
      where('role', '==', 'zonal-incharge'),
      where('parentVertical', '==', 'wtm')
    );
    const zonesSnapshot = await getDocs(zonesQuery);
    
    const allAssemblies = new Set();
    zonesSnapshot.forEach(doc => {
      const assemblies = doc.data().assemblies || [];
      assemblies.forEach(a => allAssemblies.add(a));
    });
    
    // Get assemblies with ACs
    const assembliesWithACs = new Set();
    const acsFullQuery = query(usersRef, where('role', '==', 'Assembly Coordinator'));
    const acsFullSnapshot = await getDocs(acsFullQuery);
    
    acsFullSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.assembly) {
        assembliesWithACs.add(data.assembly);
      }
      if (data.assemblies) {
        data.assemblies.forEach(a => assembliesWithACs.add(a));
      }
    });
    
    const assembliesWithoutACs = Array.from(allAssemblies).filter(a => !assembliesWithACs.has(a));
    
    console.log(`  Total assemblies: ${allAssemblies.size}`);
    console.log(`  Assemblies with ACs: ${assembliesWithACs.size}`);
    console.log(`  Assemblies without ACs: ${assembliesWithoutACs.length}`);
    
    if (assembliesWithoutACs.length > 0) {
      console.log('\n  Sample assemblies without ACs:');
      assembliesWithoutACs.slice(0, 5).forEach(a => {
        console.log(`    - ${a}`);
      });
    }
    
    console.log('\n4. Expected Report Behavior:');
    console.log('============================');
    console.log('  ✓ Executive Summary should show:');
    console.log(`    - Active ACs: ${greenZoneCount} (only green zone)`);
    console.log(`    - Performance zones: High=${greenZoneCount}, Moderate=${orangeZoneCount}, Poor=${redZoneCount}`);
    console.log('  ✓ Assemblies without ACs should show:');
    console.log('    - Centered message: "No AC assigned for this assembly"');
    console.log('    - Not a red row with placeholder data');
    
  } catch (error) {
    console.error('Error testing report fixes:', error);
  } finally {
    process.exit(0);
  }
}

testReportFixes();
