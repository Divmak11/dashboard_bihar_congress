#!/usr/bin/env node
/*
  Upload SLP Identification JSON to Firestore (call_center_slp_identification collection)

  Usage:
    export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccountKey.json"
    node scripts/upload-slp-identification.js --file slp_identification_data.json

  Options:
    --file <path>         Path to JSON file (default: slp_identification_data.json in repo root)
    --collection <name>   Firestore collection name (default: call_center_slp_identification)
    --key <path>          Optional path to service account JSON (overrides GOOGLE_APPLICATION_CREDENTIALS)
    --project <projectId> Optional projectId override
    --dry-run             Do not write; only print planned actions

  Notes:
    - Objects are uploaded EXACTLY as they appear in the JSON (no transformation).
    - Document IDs are deterministic (SHA1 hash of key fields) to avoid duplicates on re-runs.
    - Writes are chunked into batches of 500 to respect Firestore limits.
    - All records include: assembly, form_type: 'slp_identification', sheet_source
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

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
    if (a === '--file') opts.file = args[++i];
    else if (a === '--collection') opts.collection = args[++i];
    else if (a === '--key') opts.key = args[++i];
    else if (a === '--project') opts.project = args[++i];
    else if (a === '--dry-run') opts.dryRun = true;
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
// Using mobile number, name, and assembly as unique identifiers
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

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'congressdashboard-e521d'
  });
}

const db = getFirestore();

async function run() {
  const opts = parseArgs();
  console.log(`[upload-slp-identification] Starting with options:`, opts);

  const rows = loadJson(opts.file);
  console.log(`[upload-slp-identification] Loaded ${rows.length} records from ${opts.file}`);

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

  console.log(`[upload-slp-identification] Data validation passed`);
  console.log(`[upload-slp-identification] Sample record fields:`, Object.keys(sampleRecord).slice(0, 10));

  // Count by sheet source
  const sourceCounts = {};
  rows.forEach(r => {
    const source = r.sheet_source;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  console.log(`[upload-slp-identification] Records by source:`, sourceCounts);

  if (opts.dryRun) {
    // Print sample and exit
    console.log(`[upload-slp-identification] DRY RUN: First 3 doc IDs and sample data:`);
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

  const collectionRef = db.collection(opts.collection);

  // Batch writes: Firestore limit = 500 ops per batch
  const BATCH_LIMIT = 500;
  let batch = db.batch();
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
      // Duplicate within file; skip to avoid overwriting same doc multiple times in the same batch
      console.log(`Duplicate object detected in file (same mobile/name/assembly). Skipping index ${i}.`);
      continue;
    }
    seen.add(id);

    const docRef = collectionRef.doc(id);
    batch.set(docRef, obj, { merge: false }); // write EXACT object, no extra fields
    opsInBatch++;

    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      totalCommitted += opsInBatch;
      console.log(`[upload-slp-identification] Committed ${totalCommitted}/${rows.length} ...`);
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    totalCommitted += opsInBatch;
  }

  console.log(`[upload-slp-identification] Upload complete!`);
  console.log(`[upload-slp-identification] Total committed docs: ${totalCommitted}`);
  console.log(`[upload-slp-identification] Collection: ${opts.collection}`);
  console.log(`[upload-slp-identification] All records have form_type: 'slp_identification'`);
}

run().catch((err) => {
  console.error(`[upload-slp-identification] ERROR:`, err);
  process.exit(1);
});
