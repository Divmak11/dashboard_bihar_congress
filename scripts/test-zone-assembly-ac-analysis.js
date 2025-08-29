// Import Firebase client SDK
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function fetchZones() {
  try {
    console.log('🔍 Fetching zones from admin-users collection...');
    
    // Query admin-users collection for zone documents
    const adminUsersRef = collection(db, 'admin-users');
    const q = query(adminUsersRef, where('role', '==', 'zonal-incharge'));
    
    const snapshot = await getDocs(q);
    const zones = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      zones.push({
        id: doc.id,
        name: data.email || `Zone ${doc.id}`,
        assemblies: data.assemblies || [],
        parentVertical: data.parentVertical || 'wtm',
        ...data
      });
    });
    
    console.log(`✅ Found ${zones.length} zones`);
    return zones;
    
  } catch (error) {
    console.error('❌ Error fetching zones:', error);
    throw error;
  }
}

async function fetchAssemblyCoordinators(assembly) {
  try {
    // Query users collection for ACs in this assembly
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('role', '==', 'Assembly Coordinator'),
      where('assembly', '==', assembly)
    );
    
    const snapshot = await getDocs(q);
    const acs = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      acs.push({
        id: doc.id,
        name: data.name,
        assembly: data.assembly,
        role: data.role,
        ...data
      });
    });
    
    return acs;
    
  } catch (error) {
    console.error(`❌ Error fetching ACs for assembly ${assembly}:`, error);
    return [];
  }
}

async function analyzeZoneAssemblyACStructure() {
  try {
    console.log('🚀 Starting Zone-Assembly-AC Structure Analysis');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    // Step 1: Fetch all zones
    console.log('\n📍 STEP 1: Fetching Zones');
    const zones = await fetchZones();
    
    let totalAssembliesFromZones = 0;
    let totalACsFound = 0;
    const allAssemblies = new Set();
    const acsByAssembly = new Map();
    const assemblyToZoneMap = new Map();
    
    // Step 2: Analyze each zone
    console.log('\n📊 STEP 2: Analyzing Zone Structure');
    for (const zone of zones) {
      console.log(`\n🏛️  Zone: ${zone.name || zone.id}`);
      console.log(`   Vertical: ${zone.parentVertical}`);
      console.log(`   Assemblies: ${zone.assemblies.length}`);
      
      if (zone.assemblies.length > 0) {
        console.log(`   Assembly List: ${zone.assemblies.slice(0, 5).join(', ')}${zone.assemblies.length > 5 ? '...' : ''}`);
      }
      
      totalAssembliesFromZones += zone.assemblies.length;
      
      // Map assemblies to zones
      zone.assemblies.forEach(assembly => {
        allAssemblies.add(assembly);
        assemblyToZoneMap.set(assembly, zone);
      });
    }
    
    console.log(`\n📈 Zone Summary:`);
    console.log(`   Total Zones: ${zones.length}`);
    console.log(`   Total Assemblies (from zones): ${totalAssembliesFromZones}`);
    console.log(`   Unique Assemblies: ${allAssemblies.size}`);
    
    // Step 3: Find ACs for each assembly
    console.log('\n👥 STEP 3: Finding Assembly Coordinators');
    
    const assembliesArray = Array.from(allAssemblies);
    let processedCount = 0;
    
    for (const assembly of assembliesArray) {
      processedCount++;
      console.log(`\n[${processedCount}/${assembliesArray.length}] 🏛️  Assembly: ${assembly}`);
      
      const acs = await fetchAssemblyCoordinators(assembly);
      const zone = assemblyToZoneMap.get(assembly);
      
      console.log(`   Zone: ${zone ? zone.name || zone.id : 'UNASSIGNED'}`);
      console.log(`   ACs Found: ${acs.length}`);
      
      if (acs.length > 0) {
        acs.forEach(ac => {
          console.log(`     - ${ac.name} (ID: ${ac.id.substring(0, 8)}...)`);
        });
        acsByAssembly.set(assembly, acs);
        totalACsFound += acs.length;
      } else {
        console.log(`     ⚠️  No ACs found for ${assembly}`);
        acsByAssembly.set(assembly, []);
      }
    }
    
    // Step 4: Check for ACs not in any zone assembly
    console.log('\n🔍 STEP 4: Checking for ACs Outside Zone Assemblies');
    
    const usersRef = collection(db, 'users');
    const allACsQuery = query(usersRef, where('role', '==', 'Assembly Coordinator'));
    const allACsSnapshot = await getDocs(allACsQuery);
    
    const allACs = [];
    const acsInZoneAssemblies = new Set();
    const acsOutsideZones = [];
    
    allACsSnapshot.forEach((doc) => {
      const data = doc.data();
      const ac = {
        id: doc.id,
        name: data.name,
        assembly: data.assembly,
        role: data.role,
        ...data
      };
      allACs.push(ac);
      
      if (allAssemblies.has(ac.assembly)) {
        acsInZoneAssemblies.add(ac.id);
      } else {
        acsOutsideZones.push(ac);
      }
    });
    
    console.log(`\n📊 AC Distribution Analysis:`);
    console.log(`   Total ACs in users collection: ${allACs.length}`);
    console.log(`   ACs in zone assemblies: ${acsInZoneAssemblies.size}`);
    console.log(`   ACs outside zone assemblies: ${acsOutsideZones.length}`);
    
    if (acsOutsideZones.length > 0) {
      console.log(`\n⚠️  ACs in assemblies NOT in any zone:`);
      acsOutsideZones.forEach(ac => {
        console.log(`     - ${ac.name} in ${ac.assembly} (ID: ${ac.id.substring(0, 8)}...)`);
      });
    }
    
    // Step 5: Summary and Analysis
    console.log('\n📋 STEP 5: Final Analysis');
    
    const endTime = Date.now();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL RESULTS:');
    console.log('='.repeat(60));
    console.log(`⏱️  Analysis Time: ${endTime - startTime}ms`);
    console.log(`🏛️  Zones Found: ${zones.length}`);
    console.log(`📍 Unique Assemblies in Zones: ${allAssemblies.size}`);
    console.log(`👥 Total ACs in Database: ${allACs.length}`);
    console.log(`✅ ACs in Zone Assemblies: ${acsInZoneAssemblies.size}`);
    console.log(`❓ ACs Outside Zones: ${acsOutsideZones.length}`);
    console.log(`🔢 Expected Total (Report): 44`);
    console.log(`🔢 Direct Query Result: 39`);
    console.log(`🔢 Zone-Based Analysis: ${allACs.length}`);
    
    // Identify the discrepancy
    console.log('\n🔍 DISCREPANCY ANALYSIS:');
    if (allACs.length === 44) {
      console.log('✅ Zone-based analysis matches report count (44)');
      console.log('❌ Direct query found only 39 - possible query issue');
    } else if (allACs.length === 39) {
      console.log('✅ Zone-based analysis matches direct query (39)');
      console.log('❌ Report shows 44 - possible report calculation issue');
    } else {
      console.log(`❓ Zone-based analysis shows ${allACs.length} - different from both report (44) and direct query (39)`);
    }
    
    // Zone breakdown
    console.log('\n📊 ZONE BREAKDOWN:');
    const wtmZones = zones.filter(z => z.parentVertical === 'wtm' || !z.parentVertical);
    const shaktiZones = zones.filter(z => z.parentVertical === 'shakti-abhiyaan');
    
    console.log(`   WTM Zones: ${wtmZones.length}`);
    console.log(`   Shakti Zones: ${shaktiZones.length}`);
    
    let wtmAssemblies = 0, shaktiAssemblies = 0;
    wtmZones.forEach(z => wtmAssemblies += z.assemblies.length);
    shaktiZones.forEach(z => shaktiAssemblies += z.assemblies.length);
    
    console.log(`   WTM Assemblies: ${wtmAssemblies}`);
    console.log(`   Shakti Assemblies: ${shaktiAssemblies}`);
    
    return {
      zones: zones.length,
      assemblies: allAssemblies.size,
      totalACs: allACs.length,
      acsInZones: acsInZoneAssemblies.size,
      acsOutsideZones: acsOutsideZones.length,
      discrepancy: {
        report: 44,
        directQuery: 39,
        zoneAnalysis: allACs.length
      }
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Run the analysis
async function runAnalysis() {
  try {
    const results = await analyzeZoneAssemblyACStructure();
    console.log('\n🔚 Analysis completed successfully');
    return results;
  } catch (error) {
    console.log('\n❌ Analysis failed:', error.message);
  }
}

// Execute the analysis
runAnalysis();
