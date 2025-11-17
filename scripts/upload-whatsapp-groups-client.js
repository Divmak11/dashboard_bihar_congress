#!/usr/bin/env node
/**
 * Upload WhatsApp groups JSON to Firestore using Firebase Client SDK
 * (same pattern as existing API routes)
 *
 * Usage:
 *   node scripts/upload-whatsapp-groups-client.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Import Firebase client SDK (same as existing routes)
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, writeBatch, doc } = require('firebase/firestore');

// Firebase config (same as app/utils/firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyDD9RZZM8u5_Q6I24SJk1_jACFeZTGgSpw",
  authDomain: "congressdashboard-e521d.firebaseapp.com",
  projectId: "congressdashboard-e521d",
  storageBucket: "congressdashboard-e521d.firebasestorage.app",
  messagingSenderId: "561776205072",
  appId: "1:561776205072:web:003a31ab2a9def84915995"
};

// Initialize Firebase (same pattern as existing code)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Load JSON data
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

async function uploadWhatsAppGroups() {
  console.log('[upload-whatsapp-groups-client] Starting upload...');
  
  const rows = loadJson('whatsapp_groups.json');
  console.log(`[upload-whatsapp-groups-client] Loaded ${rows.length} records from whatsapp_groups.json`);

  const whatsappCollection = collection(db, 'whatsapp_data');
  
  // Firebase client SDK batch limit is 500
  const BATCH_LIMIT = 500;
  let totalUploaded = 0;
  const seen = new Set();

  // Process in chunks
  for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
    const chunk = rows.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const obj of chunk) {
      if (typeof obj !== 'object' || obj === null) {
        console.warn(`Skipping non-object at index ${i + batchCount}`);
        continue;
      }

      const id = makeDocId(obj);
      if (seen.has(id)) {
        console.log(`Duplicate object detected (same canonical content). Skipping.`);
        continue;
      }
      seen.add(id);

      const docRef = doc(whatsappCollection, id);
      batch.set(docRef, obj); // Upload EXACT object, no transformation
      batchCount++;
    }

    if (batchCount > 0) {
      await batch.commit();
      totalUploaded += batchCount;
      console.log(`[upload-whatsapp-groups-client] Uploaded batch: ${totalUploaded}/${rows.length} ...`);
    }
  }

  console.log(`[upload-whatsapp-groups-client] Upload complete! Total documents uploaded: ${totalUploaded}`);
}

// Run the upload
uploadWhatsAppGroups()
  .then(() => {
    console.log('✅ WhatsApp groups upload successful');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  });
