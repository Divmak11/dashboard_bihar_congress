#!/usr/bin/env node
/*
  Upload WhatsApp groups JSON to Firestore (whatsapp_data collection by default)

  Usage:
    export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccountKey.json"
    node scripts/upload-whatsapp-groups.js --file whatsapp_groups.json --collection whatsapp_data

  Options:
    --file <path>         Path to JSON file (default: whatsapp_groups.json in repo root)
    --collection <name>   Firestore collection name (default: whatsapp_data)
    --key <path>          Optional path to service account JSON (overrides GOOGLE_APPLICATION_CREDENTIALS)
    --project <projectId> Optional projectId override
    --dry-run             Do not write; only print planned actions

  Notes:
    - Objects are uploaded EXACTLY as they appear in the JSON (no transformation).
    - Document IDs are deterministic (SHA1 hash of canonical concatenation of fields) to avoid duplicates on re-runs.
    - Writes are chunked into batches of 500 to respect Firestore limits.
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Simple CLI arg parser
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { file: 'whatsapp_groups.json', collection: 'whatsapp_data', dryRun: false };
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

// Canonical key to derive a deterministic doc ID per object (keeps content unchanged)
function canonicalKey(obj) {
  const order = [
    'Assembly',
    'Group Name',
    'Group Link',
    'Group Members',
    'Admin',
    'form_type',
  ];
  return order.map((k) => (obj.hasOwnProperty(k) ? String(obj[k]) : '')).join('|#|');
}

function makeDocId(obj) {
  return crypto.createHash('sha1').update(canonicalKey(obj), 'utf8').digest('hex');
}

// Initialize Firebase Admin SDK (same pattern as existing scripts)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'congressdashboard-e521d'
  });
}

const db = getFirestore();

async function run() {
  const opts = parseArgs();
  console.log(`[upload-whatsapp-groups] Starting with options:`, opts);

  const rows = loadJson(opts.file);
  console.log(`[upload-whatsapp-groups] Loaded ${rows.length} records from ${opts.file}`);

  if (opts.dryRun) {
    // Print sample and exit
    console.log(`[upload-whatsapp-groups] DRY RUN: First 3 doc IDs and objects:`);
    for (const r of rows.slice(0, 3)) {
      console.log(makeDocId(r), r);
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
      console.log(`Duplicate object detected in file (same canonical content). Skipping index ${i}.`);
      continue;
    }
    seen.add(id);

    const docRef = collectionRef.doc(id);
    batch.set(docRef, obj, { merge: false }); // write EXACT object, no extra fields
    opsInBatch++;

    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      totalCommitted += opsInBatch;
      console.log(`[upload-whatsapp-groups] Committed ${totalCommitted}/${rows.length} ...`);
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    totalCommitted += opsInBatch;
  }

  console.log(`[upload-whatsapp-groups] Upload complete. Total committed docs: ${totalCommitted}`);
}

run().catch((err) => {
  console.error(`[upload-whatsapp-groups] ERROR:`, err);
  process.exit(1);
});
