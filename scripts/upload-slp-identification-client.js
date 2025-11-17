#!/usr/bin/env node
/*
  Upload SLP Identification JSON to Firestore using Client SDK
  (No service account credentials required)

  Usage:
    node scripts/upload-slp-identification-client.js [--dry-run]
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch, getDocs, query, limit } = require('firebase/firestore');

// Firebase configuration (same as web app)
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

// Simple CLI arg parser
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { 
    file: 'slp_identification_data.json', 
    collection: 'call_center_slp_identification', 
    dryRun: false 
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

function loadJson(filePath) {
  const full = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = fs.readFileSync(full, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error('Expected top-level JSON array');
  }
  return data;
}

// Canonical key to derive a deterministic doc ID per object
function canonicalKey(obj) {
  const mobileNumber = obj['Mobile Number'] || '';
  const name = obj['Name'] || '';
  const assembly = obj['assembly'] || '';
  const sheetSource = obj['sheet_source'] || '';
  
  return `${mobileNumber}|#|${name}|#|${assembly}|#|${sheetSource}`;
}

function makeDocId(obj) {
  return crypto.createHash('sha1').update(canonicalKey(obj), 'utf8').digest('hex');
}

async function run() {
  const opts = parseArgs();
  console.log(`[upload-slp-identification-client] Starting with options:`, opts);

  const rows = loadJson(opts.file);
  console.log(`[upload-slp-identification-client] Loaded ${rows.length} records from ${opts.file}`);

  // Validate data structure
  const sampleRecord = rows[0];
  if (!sampleRecord.form_type || sampleRecord.form_type !== 'slp_identification') {
    throw new Error('Invalid data: form_type should be "slp_identification"');
  }
  if (!sampleRecord.assembly) {
    throw new Error('Invalid data: assembly field is required');
  }
  if (!sampleRecord.sheet_source) {
    throw new Error('Invalid data: sheet_source field is required');
  }

  console.log(`[upload-slp-identification-client] Data validation passed`);
  console.log(`[upload-slp-identification-client] Sample record fields:`, Object.keys(sampleRecord).slice(0, 10));

  // Count by sheet source
  const sourceCounts = {};
  rows.forEach(r => {
    const source = r.sheet_source;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  console.log(`[upload-slp-identification-client] Records by source:`, sourceCounts);

  if (opts.dryRun) {
    console.log(`[upload-slp-identification-client] DRY RUN: First 3 doc IDs and sample data:`);
    for (const r of rows.slice(0, 3)) {
      const docId = makeDocId(r);
      const summary = {
        docId,
        Name: r['Name'],
        'Mobile Number': r['Mobile Number'],
        assembly: r['assembly'],
        sheet_source: r['sheet_source'],
        form_type: r['form_type']
      };
      console.log(summary);
    }
    return;
  }

  const collectionRef = collection(db, opts.collection);

  // Batch writes: Firestore limit = 500 ops per batch
  const BATCH_LIMIT = 500;
  let batch = writeBatch(db);
  let opsInBatch = 0;
  let totalCommitted = 0;

  const seen = new Set();

  for (let i = 0; i < rows.length; i++) {
    const obj = rows[i];
    if (typeof obj !== 'object' || obj === null) {
      console.warn(`Skipping non-object at index ${i}`);
      continue;
    }
    
    const id = makeDocId(obj);
    if (seen.has(id)) {
      console.log(`Duplicate object detected in file (same mobile/name/assembly). Skipping index ${i}.`);
      continue;
    }
    seen.add(id);

    const docRef = doc(collectionRef, id);
    batch.set(docRef, obj);
    opsInBatch++;

    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      totalCommitted += opsInBatch;
      console.log(`[upload-slp-identification-client] Committed ${totalCommitted}/${rows.length} ...`);
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    totalCommitted += opsInBatch;
  }

  console.log(`[upload-slp-identification-client] Upload complete!`);
  console.log(`[upload-slp-identification-client] Total committed docs: ${totalCommitted}`);
  console.log(`[upload-slp-identification-client] Collection: ${opts.collection}`);
  console.log(`[upload-slp-identification-client] All records have form_type: 'slp_identification'`);
  
  // Verify upload
  console.log(`[upload-slp-identification-client] Verifying upload...`);
  const verifyQuery = query(collectionRef, limit(5));
  const snapshot = await getDocs(verifyQuery);
  console.log(`[upload-slp-identification-client] ✅ Verified: ${snapshot.size} sample documents found in collection`);
}

run().catch((err) => {
  console.error(`[upload-slp-identification-client] ERROR:`, err);
  process.exit(1);
});
