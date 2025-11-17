#!/usr/bin/env node
/*
  Upload Call Center Purposes JSON to Firestore using Client SDK

  Usage:
    node scripts/upload-call-center-purposes.js [--dry-run]
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch, getDocs, query, limit } = require('firebase/firestore');

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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { 
    file: 'call_center_purposes_data.json', 
    collection: 'call_center_purposes', 
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

// Canonical key for deterministic doc ID
function canonicalKey(obj) {
  const mobileNumber = obj['Mobile Number'] || '';
  const name = obj['Name'] || '';
  const assembly = obj['assembly'] || '';
  const formType = obj['form_type'] || '';
  
  return `${mobileNumber}|#|${name}|#|${assembly}|#|${formType}`;
}

function makeDocId(obj) {
  return crypto.createHash('sha1').update(canonicalKey(obj), 'utf8').digest('hex');
}

async function run() {
  const opts = parseArgs();
  console.log(`[upload-call-center-purposes] Starting with options:`, opts);

  const rows = loadJson(opts.file);
  console.log(`[upload-call-center-purposes] Loaded ${rows.length} records from ${opts.file}`);

  // Validate data structure
  const sampleRecord = rows[0];
  if (!sampleRecord.form_type) {
    throw new Error('Invalid data: form_type field is required');
  }
  if (!sampleRecord.assembly) {
    throw new Error('Invalid data: assembly field is required');
  }

  console.log(`[upload-call-center-purposes] Data validation passed`);
  console.log(`[upload-call-center-purposes] Sample record:`, sampleRecord);

  // Count by form_type
  const formTypeCounts = {};
  rows.forEach(r => {
    const formType = r.form_type;
    formTypeCounts[formType] = (formTypeCounts[formType] || 0) + 1;
  });
  console.log(`[upload-call-center-purposes] Records by form type:`, formTypeCounts);

  if (opts.dryRun) {
    console.log(`[upload-call-center-purposes] DRY RUN: First 3 doc IDs and sample data:`);
    for (const r of rows.slice(0, 3)) {
      const docId = makeDocId(r);
      const summary = {
        docId,
        Name: r['Name'],
        'Mobile Number': r['Mobile Number'],
        assembly: r['assembly'],
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
      console.log(`Duplicate object detected in file. Skipping index ${i}.`);
      continue;
    }
    seen.add(id);

    const docRef = doc(collectionRef, id);
    batch.set(docRef, obj);
    opsInBatch++;

    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      totalCommitted += opsInBatch;
      console.log(`[upload-call-center-purposes] Committed ${totalCommitted}/${rows.length} ...`);
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    totalCommitted += opsInBatch;
  }

  console.log(`[upload-call-center-purposes] Upload complete!`);
  console.log(`[upload-call-center-purposes] Total committed docs: ${totalCommitted}`);
  console.log(`[upload-call-center-purposes] Collection: ${opts.collection}`);
  
  // Verify upload
  console.log(`[upload-call-center-purposes] Verifying upload...`);
  const verifyQuery = query(collectionRef, limit(5));
  const snapshot = await getDocs(verifyQuery);
  console.log(`[upload-call-center-purposes] ✅ Verified: ${snapshot.size} sample documents found in collection`);
}

run().catch((err) => {
  console.error(`[upload-call-center-purposes] ERROR:`, err);
  process.exit(1);
});
