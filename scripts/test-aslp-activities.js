/**
 * ASLP Activity Testing Script
 * 
 * Purpose: Find the most active ASLP and fetch all their activities
 * to validate our handler_id implementation against real database data.
 */

const { initializeApp } = require('firebase/app');
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Find ASLPs from the database
 */
async function findASLPs() {
  console.log('\n=== FINDING ASLPs ===');
  
  try {
    // Look for ASLPs in wtm-slp collection
    const wtmSlpCollection = collection(db, 'wtm-slp');
    
    // Broad query to find potential ASLPs
    const aslpQueries = [
      // Look for documents with role = ASLP
      query(wtmSlpCollection, where('role', '==', 'ASLP'), limit(50)),
      // Look for documents with handler_id field (indicates they might be ASLPs)
      query(wtmSlpCollection, where('handler_id', '!=', ''), limit(50)),
      // Look for documents that might have ASLP in name or other fields
      query(wtmSlpCollection, limit(100))
    ];
    
    const aslpMap = new Map();
    
    for (let i = 0; i < aslpQueries.length; i++) {
      console.log(`Executing ASLP query ${i + 1}...`);
      const snapshot = await getDocs(aslpQueries[i]);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Check if this looks like an ASLP
        if (data.role === 'ASLP' || 
            data.handler_id || 
            (data.name && data.name.toLowerCase().includes('aslp')) ||
            (data.recommendedPosition === 'ASLP')) {
          
          aslpMap.set(doc.id, {
            uid: doc.id,
            name: data.name || 'Unknown',
            role: data.role || 'Unknown',
            handler_id: data.handler_id || null,
            assembly: data.assembly || 'Unknown',
            recommendedPosition: data.recommendedPosition || 'Unknown'
          });
        }
      });
    }
    
    const aslps = Array.from(aslpMap.values());
    console.log(`Found ${aslps.length} potential ASLPs:`);
    aslps.forEach((aslp, index) => {
      console.log(`${index + 1}. ${aslp.name} (${aslp.uid}) - Role: ${aslp.role}, Handler: ${aslp.handler_id}, Assembly: ${aslp.assembly}`);
    });
    
    return aslps;
    
  } catch (error) {
    console.error('Error finding ASLPs:', error);
    return [];
  }
}

/**
 * Count activities for an ASLP using broad queries
 */
async function countASLPActivities(aslp) {
  console.log(`\n=== COUNTING ACTIVITIES FOR ${aslp.name} (${aslp.uid}) ===`);
  
  const slpActivityCollection = collection(db, 'slp-activity');
  const possibleIds = [aslp.uid];
  
  if (aslp.handler_id) {
    possibleIds.push(aslp.handler_id);
  }
  
  console.log(`Searching with IDs: ${possibleIds.join(', ')}`);
  
  const activityTypes = [
    { name: 'Members', formTypes: ['members'], types: ['members'] },
    { name: 'Training', formTypes: ['slp-training'], types: ['slp-training'] },
    { name: 'Panchayat WA', formTypes: ['panchayat-wa'], types: ['panchayat-wa'] },
    { name: 'Local Issue Videos', formTypes: ['local-issue-video'], types: ['local-issue-video'] },
    { name: 'Mai Bahin Yojna', formTypes: ['mai-bahin-yojna'], types: ['mai-bahin-yojna'] }
  ];
  
  const results = {};
  let totalActivities = 0;
  
  for (const activityType of activityTypes) {
    console.log(`\nChecking ${activityType.name}...`);
    
    try {
      const queries = [];
      
      // Add form_type queries
      for (const formType of activityType.formTypes) {
        queries.push(
          query(
            slpActivityCollection,
            where('form_type', '==', formType),
            where('handler_id', 'in', possibleIds)
          )
        );
      }
      
      // Add type queries
      for (const type of activityType.types) {
        queries.push(
          query(
            slpActivityCollection,
            where('type', '==', type),
            where('handler_id', 'in', possibleIds)
          )
        );
      }
      
      const activityMap = new Map();
      
      for (const q of queries) {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          activityMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        });
      }
      
      const activities = Array.from(activityMap.values());
      results[activityType.name] = activities;
      totalActivities += activities.length;
      
      console.log(`  Found ${activities.length} ${activityType.name.toLowerCase()} activities`);
      
      // Show sample data
      if (activities.length > 0) {
        const sample = activities[0];
        console.log(`  Sample: ID=${sample.id}, handler_id=${sample.handler_id}, form_type=${sample.form_type}, type=${sample.type}`);
      }
      
    } catch (error) {
      console.error(`  Error fetching ${activityType.name}:`, error.message);
      results[activityType.name] = [];
    }
  }
  
  return { results, totalActivities };
}

/**
 * Find the most active ASLP
 */
async function findMostActiveASLP(aslps) {
  console.log('\n=== FINDING MOST ACTIVE ASLP ===');
  
  const activityCounts = [];
  
  for (const aslp of aslps) {
    const { results, totalActivities } = await countASLPActivities(aslp);
    
    activityCounts.push({
      aslp,
      totalActivities,
      results
    });
    
    console.log(`${aslp.name}: ${totalActivities} total activities`);
  }
  
  // Sort by total activities
  activityCounts.sort((a, b) => b.totalActivities - a.totalActivities);
  
  console.log('\n=== ACTIVITY RANKING ===');
  activityCounts.forEach((item, index) => {
    console.log(`${index + 1}. ${item.aslp.name} (${item.aslp.uid}): ${item.totalActivities} activities`);
  });
  
  return activityCounts[0]; // Return most active
}

/**
 * Detailed analysis of the most active ASLP
 */
async function analyzeASLP(mostActive) {
  if (!mostActive) {
    console.log('No active ASLP found!');
    return;
  }
  
  const { aslp, results, totalActivities } = mostActive;
  
  console.log('\n=== DETAILED ANALYSIS ===');
  console.log(`Most Active ASLP: ${aslp.name} (${aslp.uid})`);
  console.log(`Role: ${aslp.role}`);
  console.log(`Handler ID: ${aslp.handler_id}`);
  console.log(`Assembly: ${aslp.assembly}`);
  console.log(`Total Activities: ${totalActivities}`);
  
  console.log('\n=== ACTIVITY BREAKDOWN ===');
  for (const [activityType, activities] of Object.entries(results)) {
    console.log(`\n${activityType}: ${activities.length} activities`);
    
    if (activities.length > 0) {
      console.log('  Sample activities:');
      activities.slice(0, 3).forEach((activity, index) => {
        console.log(`    ${index + 1}. ID: ${activity.id}`);
        console.log(`       handler_id: ${activity.handler_id}`);
        console.log(`       form_type: ${activity.form_type || 'N/A'}`);
        console.log(`       type: ${activity.type || 'N/A'}`);
        console.log(`       date: ${activity.date_submitted || activity.dateOfVisit || activity.date || activity.createdAt || 'N/A'}`);
        
        // Show which ID matched
        if (activity.handler_id === aslp.uid) {
          console.log(`       ✅ Matched by document ID (${aslp.uid})`);
        } else if (activity.handler_id === aslp.handler_id) {
          console.log(`       ✅ Matched by handler_id field (${aslp.handler_id})`);
        }
        console.log('');
      });
    }
  }
  
  console.log('\n=== VALIDATION SUMMARY ===');
  console.log(`✅ ASLP found: ${aslp.name}`);
  console.log(`✅ Total activities: ${totalActivities}`);
  console.log(`✅ Handler ID implementation working: ${totalActivities > 0 ? 'YES' : 'NO'}`);
  
  // Check if we're getting activities from both ID types
  let matchedByDocId = 0;
  let matchedByHandlerId = 0;
  
  for (const activities of Object.values(results)) {
    for (const activity of activities) {
      if (activity.handler_id === aslp.uid) {
        matchedByDocId++;
      } else if (activity.handler_id === aslp.handler_id) {
        matchedByHandlerId++;
      }
    }
  }
  
  console.log(`✅ Activities matched by document ID: ${matchedByDocId}`);
  console.log(`✅ Activities matched by handler_id field: ${matchedByHandlerId}`);
  console.log(`✅ Both ID types working: ${matchedByDocId > 0 && matchedByHandlerId > 0 ? 'YES' : 'PARTIAL'}`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 ASLP Activity Testing Script Started');
  console.log('Purpose: Validate ASLP handler_id implementation against real database data');
  
  try {
    // Step 1: Find ASLPs
    const aslps = await findASLPs();
    
    if (aslps.length === 0) {
      console.log('❌ No ASLPs found in database!');
      return;
    }
    
    // Step 2: Find most active ASLP
    const mostActive = await findMostActiveASLP(aslps);
    
    // Step 3: Detailed analysis
    await analyzeASLP(mostActive);
    
    console.log('\n🎯 Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
main().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
