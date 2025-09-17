/**
 * SLP Activity Status Analysis Script
 * 
 * Analyzes SLP data from wtm-slp collection to generate activity status report
 * grouped by zones with zonal incharge names.
 * 
 * Requirements:
 * - Fetch all SLPs with recommendedPosition: "SLP"
 * - Filter by onboardingStatus: "Onboarded" 
 * - Count activityStatus: "Active" vs "Inactive"
 * - Group by zones using assembly mapping
 * - Include zonal incharge names in output
 * 
 * Usage: node scripts/analyze-slp-activity-status.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase configuration (reusing from existing setup in firebase.ts)
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

/**
 * Fetch specific zones from admin-users collection 
 * Returns zones from both 'zonal-incharge' and 'dept-head' roles (Ravi is dept-head but manages a zone)
 */
async function fetchZones() {
  try {
    console.log('[fetchZones] Fetching zones from admin-users collection...');
    
    // Fetch both zonal-incharge and dept-head users to find all zone managers including Ravi
    const q1 = query(collection(db, 'admin-users'), where('role', '==', 'zonal-incharge'));
    const q2 = query(collection(db, 'admin-users'), where('role', '==', 'dept-head'));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const zones = [];
    let counter = 0;
    
    const targetZoneNames = ['Hare Ram Mishra', 'Ashutosh', 'Sarfaraz', 'Jitesh', 'Shadab', 'Nitesh'];
    let raviFound = false;
    
    // Process both zonal-incharge and dept-head documents
    const allDocs = [...snap1.docs, ...snap2.docs];
    
    allDocs.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      
      // Check if this is Ravi (dept-head) or one of the target WTM zones
      const isRavi = data.name && data.name.toLowerCase().includes('ravi') && data.role === 'dept-head';
      const isTargetWtmZone = data.parentVertical === 'wtm' && targetZoneNames.includes(data.name) && data.role === 'zonal-incharge';
      
      if (isRavi) {
        console.log(`[FOUND RAVI] Dept-head document:`, { 
          id: id,
          name: data.name,
          role: data.role,
          zoneName: data.zoneName,
          parentVertical: data.parentVertical,
          assembliesCount: data.assemblies?.length || 0,
          allFields: Object.keys(data)
        });
        raviFound = true;
      }
      
      if (isTargetWtmZone || isRavi) {
        console.log(`[DEBUG] Including zone:`, { 
          id: id,
          name: data.name,
          zoneName: data.zoneName,
          role: data.role,
          parentVertical: data.parentVertical,
          assembliesCount: data.assemblies?.length || 0,
          isRavi: isRavi
        });

        if (data.assemblies && Array.isArray(data.assemblies)) {
          counter++;
          
          zones.push({
            id: counter,
            zoneName: data.zoneName || `Zone ${counter}`,
            zonalIncharge: data.name || 'Unknown',
            assemblies: data.assemblies,
            isRavi: isRavi,
            parentVertical: data.parentVertical,
            role: data.role
          });
        }
      }
    });
    
    // Sort alphabetically by zone name
    zones.sort((a, b) => a.zoneName.localeCompare(b.zoneName));
    console.log(`[fetchZones] Found ${zones.length} zones`);
    console.log(`[INFO] Ravi found: ${raviFound}`);
    
    return zones;
  } catch (error) {
    console.error('[fetchZones] Error fetching zones:', error);
    return [];
  }
}

/**
 * Normalize activity status (treats "Highly Active" as "Active")
 */
function normalizeActivityStatus(status) {
  if (status === 'Active' || status === 'Highly Active') {
    return 'Active';
  } else if (status === 'Inactive') {
    return 'Inactive';
  } else {
    return 'Other';
  }
}

/**
 * Fetch SLP data from wtm-slp collection
 * Only returns SLPs with onboardingStatus: 'Onboarded'
 */
async function fetchSlpData() {
  try {
    console.log('[fetchSlpData] Fetching SLP data from wtm-slp collection...');
    
    // Query for SLPs with recommendedPosition: "SLP"
    const q = query(
      collection(db, 'wtm-slp'), 
      where('recommendedPosition', '==', 'SLP')
    );
    
    const snap = await getDocs(q);
    console.log(`[fetchSlpData] Found ${snap.docs.length} total SLPs with recommendedPosition: 'SLP'`);
    
    // Filter for onboarded SLPs and analyze not onboarded active SLPs
    const onboardedSlps = [];
    const onboardedActiveSlps = [];
    const notOnboardedActiveSlps = [];
    
    snap.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      
      // Include SLPs with onboardingStatus: 'Onboarded'
      if (data.onboardingStatus === 'Onboarded') {
        const slpData = {
          id: docId,
          assembly: data.assembly,
          activityStatus: data.activityStatus,
          recommendedPosition: data.recommendedPosition,
          onboardingStatus: data.onboardingStatus,
          category: data.category,
          gender: data.gender
        };
        
        onboardedSlps.push(slpData);
        
        // Also collect Active Onboarded SLPs for demographic analysis
        const normalizedStatus = normalizeActivityStatus(data.activityStatus);
        if (normalizedStatus === 'Active') {
          onboardedActiveSlps.push(slpData);
        }
      }
      
      // Also collect Active SLPs with "Not Onboarded" status for demographic analysis
      if (data.onboardingStatus === 'Not Onboarded') {
        // Normalize activity status
        const normalizedStatus = normalizeActivityStatus(data.activityStatus);
        if (normalizedStatus === 'Active') {
          notOnboardedActiveSlps.push({
            id: docId,
            assembly: data.assembly,
            activityStatus: data.activityStatus,
            normalizedActivityStatus: normalizedStatus,
            recommendedPosition: data.recommendedPosition,
            onboardingStatus: data.onboardingStatus,
            category: data.category,
            gender: data.gender
          });
        }
      }
    });
    
    console.log(`[fetchSlpData] Found ${onboardedSlps.length} SLPs with onboardingStatus: 'Onboarded'`);
    console.log(`[fetchSlpData] Found ${onboardedActiveSlps.length} Active SLPs with onboardingStatus: 'Onboarded'`);
    console.log(`[fetchSlpData] Found ${notOnboardedActiveSlps.length} Active SLPs with onboardingStatus: 'Not Onboarded'`);
    
    // Comprehensive demographic analysis function
    function analyzeDemographics(slps, title) {
      console.log(`\n=== ${title} ===`);
      
      const stats = {
        SC: 0,
        EBC: 0,
        OBC: 0,
        General: 0,
        Women: 0,
        Minority: 0,
        Other: 0,
        Unknown: 0
      };
      
      slps.forEach(slp => {
        const category = slp.category || 'Unknown';
        const gender = slp.gender || 'Unknown';
        
        // Count by category
        if (category === 'SC') {
          stats.SC++;
        } else if (category === 'EBC') {
          stats.EBC++;
        } else if (category === 'OBC') {
          stats.OBC++;
        } else if (category === 'General') {
          stats.General++;
        } else if (category === 'Minority') {
          stats.Minority++;
        } else if (category === 'Unknown' || category === null || category === undefined) {
          stats.Unknown++;
        } else {
          stats.Other++;
        }
        
        // Count women separately (can overlap with other categories)
        if (gender === 'Female') {
          stats.Women++;
        }
      });
      
      console.log(`📊 Demographics for ${slps.length} SLPs:`);
      console.log(`   • SC: ${stats.SC} (${(stats.SC/slps.length*100).toFixed(1)}%)`);
      console.log(`   • EBC: ${stats.EBC} (${(stats.EBC/slps.length*100).toFixed(1)}%)`);
      console.log(`   • OBC: ${stats.OBC} (${(stats.OBC/slps.length*100).toFixed(1)}%)`);
      console.log(`   • General: ${stats.General} (${(stats.General/slps.length*100).toFixed(1)}%)`);
      console.log(`   • Minority: ${stats.Minority} (${(stats.Minority/slps.length*100).toFixed(1)}%)`);
      console.log(`   • Women: ${stats.Women} (${(stats.Women/slps.length*100).toFixed(1)}%)`);
      console.log(`   • Other Categories: ${stats.Other} (${(stats.Other/slps.length*100).toFixed(1)}%)`);
      console.log(`   • Unknown Category: ${stats.Unknown} (${(stats.Unknown/slps.length*100).toFixed(1)}%)`);
      console.log(`   • TOTAL: ${slps.length}`);
      
      return stats;
    }
    
    // Analyze both groups
    if (onboardedActiveSlps.length > 0) {
      analyzeDemographics(onboardedActiveSlps, 'DEMOGRAPHIC ANALYSIS: Active + Onboarded SLPs');
    }
    
    if (notOnboardedActiveSlps.length > 0) {
      analyzeDemographics(notOnboardedActiveSlps, 'DEMOGRAPHIC ANALYSIS: Active + Not Onboarded SLPs');
      
      // Show some examples
      console.log('\n📋 Sample Active "Not Onboarded" SLPs:');
      notOnboardedActiveSlps.slice(0, 5).forEach((slp, index) => {
        console.log(`   ${index + 1}. Assembly: ${slp.assembly}, Status: ${slp.activityStatus}, Category: ${slp.category || 'Unknown'}, Gender: ${slp.gender || 'Unknown'}`);
      });
    }
    
    return onboardedSlps;
  } catch (error) {
    console.error('[fetchSlpData] Error fetching SLP data:', error);
    return [];
  }
}

/**
 * Create assembly to zone mapping for efficient lookup
 */
function createAssemblyZoneMapping(zones) {
  const assemblyToZone = new Map();
  
  zones.forEach(zone => {
    zone.assemblies.forEach(assembly => {
      // Normalize assembly name for matching
      const normalizedAssembly = assembly.trim().toLowerCase();
      assemblyToZone.set(normalizedAssembly, zone);
    });
  });
  
  console.log(`[createAssemblyZoneMapping] Created mapping for ${assemblyToZone.size} assemblies across ${zones.length} zones`);
  return assemblyToZone;
}

/**
 * Group SLPs by zones and count activity status
 */
function groupSlpsByZones(slps, zones) {
  const assemblyToZone = createAssemblyZoneMapping(zones);
  
  // Initialize zone statistics
  const zoneStats = new Map();
  zones.forEach(zone => {
    zoneStats.set(zone.id, {
      zone: zone,
      active: 0,
      inactive: 0,
      otherStatus: 0,
      slps: []
    });
  });
  
  // Track unmatched SLPs
  const unmatchedSlps = [];
  
  // Group SLPs by their assembly
  slps.forEach(slp => {
    const assembly = slp.assembly;
    
    if (!assembly) {
      console.warn(`[groupSlpsByZones] SLP ${slp.id} has no assembly field`);
      unmatchedSlps.push(slp);
      return;
    }
    
    // Find matching zone
    const normalizedAssembly = assembly.trim().toLowerCase();
    const matchingZone = assemblyToZone.get(normalizedAssembly);
    
    if (!matchingZone) {
      console.warn(`[groupSlpsByZones] No zone found for assembly: ${assembly}`);
      unmatchedSlps.push(slp);
      return;
    }
    
    // Count activity status
    const zoneData = zoneStats.get(matchingZone.id);
    zoneData.slps.push(slp);
    
    // Count by activity status (normalize "Highly Active" to "Active")
    if (slp.activityStatus === 'Active' || slp.activityStatus === 'Highly Active') {
      zoneData.active++;
    } else if (slp.activityStatus === 'Inactive') {
      zoneData.inactive++;
    } else {
      console.log(`[groupSlpsByZones] SLP ${slp.id} has unknown activityStatus: ${slp.activityStatus}`);
      zoneData.otherStatus++;
    }
  });
  
  console.log(`[groupSlpsByZones] Grouped ${slps.length - unmatchedSlps.length} SLPs across zones`);
  console.log(`[groupSlpsByZones] ${unmatchedSlps.length} SLPs could not be matched to any zone`);
  
  return { zoneStats, unmatchedSlps };
}

/**
 * Calculate overall totals including category breakdown for Active SLPs
 */
function calculateTotals(slps) {
  const totals = {
    totalSlps: slps.length,
    totalActive: 0,
    totalInactive: 0,
    totalOther: 0,
    activeSC: 0,
    activeEBC: 0,
    activeOther: 0
  };
  
  slps.forEach(slp => {
    if (slp.activityStatus === 'Active' || slp.activityStatus === 'Highly Active') {
      totals.totalActive++;
      
      // Category breakdown for Active SLPs
      if (slp.category === 'SC') {
        totals.activeSC++;
      } else if (slp.category === 'EBC') {
        totals.activeEBC++;
      } else {
        totals.activeOther++;
      }
    } else if (slp.activityStatus === 'Inactive') {
      totals.totalInactive++;
    } else {
      totals.totalOther++;
    }
  });
  
  return totals;
}

/**
 * Generate formatted output
 */
function generateOutput(totals, zoneStats, unmatchedSlps) {
  console.log('\n' + '='.repeat(60));
  console.log('SLP ACTIVITY STATUS ANALYSIS REPORT');
  console.log('='.repeat(60));
  
  // Overall totals
  console.log(`\nTotal SLPs: ${totals.totalSlps}`);
  console.log(`Total Active SLPs: ${totals.totalActive}`);
  console.log(`Total Inactive SLPs: ${totals.totalInactive}`);
  
  if (totals.totalOther > 0) {
    console.log(`Total Other Status: ${totals.totalOther}`);
  }
  
  // Category breakdown for Active SLPs
  console.log('\n' + '-'.repeat(60));
  console.log('ACTIVE SLP CATEGORY BREAKDOWN:');
  console.log('-'.repeat(60));
  console.log(`Active SC SLPs: ${totals.activeSC}`);
  console.log(`Active EBC SLPs: ${totals.activeEBC}`);
  console.log(`Active Other Category SLPs: ${totals.activeOther}`);
  
  console.log('\n' + '-'.repeat(60));
  console.log('ZONE-WISE BREAKDOWN:');
  console.log('-'.repeat(60));
  
  // Zone-wise breakdown
  const sortedZones = Array.from(zoneStats.values()).sort((a, b) => 
    a.zone.zoneName.localeCompare(b.zone.zoneName)
  );
  
  sortedZones.forEach(zoneData => {
    const { zone, active, inactive } = zoneData;
    console.log(`\n${zone.zoneName} (Incharge: ${zone.zonalIncharge})`);
    console.log(`Total Active SLPs: ${active}`);
    console.log(`Total Inactive SLPs: ${inactive}`);
  });
  
  // Unmatched SLPs summary
  if (unmatchedSlps.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('UNMATCHED SLPs (No Zone Found):');
    console.log('-'.repeat(60));
    console.log(`Total Unmatched SLPs: ${unmatchedSlps.length}`);
    
    const unmatchedActive = unmatchedSlps.filter(slp => slp.activityStatus === 'Active').length;
    const unmatchedInactive = unmatchedSlps.filter(slp => slp.activityStatus === 'Inactive').length;
    
    console.log(`Unmatched Active SLPs: ${unmatchedActive}`);
    console.log(`Unmatched Inactive SLPs: ${unmatchedInactive}`);
    
    // Show all unmatched assemblies
    const uniqueUnmatchedAssemblies = [...new Set(
      unmatchedSlps.map(slp => slp.assembly).filter(Boolean)
    )].sort();
    
    if (uniqueUnmatchedAssemblies.length > 0) {
      console.log('\nAll unmatched assemblies:');
      uniqueUnmatchedAssemblies.forEach(assembly => {
        const slpCount = unmatchedSlps.filter(slp => slp.assembly === assembly).length;
        console.log(`  - ${assembly} (${slpCount} SLPs)`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('Starting SLP Activity Status Analysis...\n');
    
    // Step 1: Fetch zones
    const zones = await fetchZones();
    if (zones.length === 0) {
      console.error('No zones found. Exiting.');
      return;
    }
    
    console.log('\n=== ZONE DEBUG SUMMARY ===');
    zones.forEach(zone => {
      console.log(`${zone.zoneName} - Incharge: ${zone.zonalIncharge} (${zone.assemblies.length} assemblies) [${zone.role}]`);
    });
    console.log('===========================');
    
    // Step 2: Fetch SLP data
    const slps = await fetchSlpData();
    if (slps.length === 0) {
      console.error('No SLP data found. Exiting.');
      return;
    }
    
    // Step 3: Calculate overall totals
    const totals = calculateTotals(slps);
    
    // Step 4: Group SLPs by zones
    const { zoneStats, unmatchedSlps } = groupSlpsByZones(slps, zones);
    
    // Step 5: Generate output
    generateOutput(totals, zoneStats, unmatchedSlps);
    
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Load environment variables and run
require('dotenv').config({ path: '.env.local' });

// Execute the script
main().then(() => {
  console.log('\nScript execution completed successfully.');
  process.exit(0);
}).catch((error) => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
