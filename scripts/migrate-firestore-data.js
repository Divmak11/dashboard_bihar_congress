#!/usr/bin/env node
/**
 * Script: migrate-firestore-data.js
 *
 * 1. Rename field `type` ➜ `form_type` in the `wtm-slp` and `slp-activity` collections.
 * 2. Copy all documents from `shakti-slp` ➜ `wtm-slp` without modification.
 *
 * Usage:
 *   $ node scripts/migrate-firestore-data.js
 *
 * Requirements:
 *   - `firebase-admin` installed (already present in this repo).
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account JSON
 *     OR the script executed in an environment that has Firebase Admin
 *     privileges (e.g. Cloud Functions / Cloud Run with IAM binding).
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialise the Firebase Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

/**
 * Batch helper – commits every N operations to stay within Firestore limits.
 */
async function commitInChunks(operations, chunkSize = 400) {
  let batch = db.batch();
  let opCounter = 0;
  for (const op of operations) {
    op(batch);
    opCounter += 1;
    if (opCounter % chunkSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (opCounter % chunkSize !== 0) {
    await batch.commit();
  }
}

/**
 * Rename `type` ➜ `form_type` in the specified collection.
 */
async function renameTypeField(collectionName) {
  console.log(`\n▶  Renaming field in collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  const operations = [];
  let changedCount = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (Object.prototype.hasOwnProperty.call(data, 'type')) {
      operations.push((batch) =>
        batch.update(doc.ref, {
          form_type: data.type,
          type: admin.firestore.FieldValue.delete(),
        })
      );
      changedCount += 1;
    }
  });

  await commitInChunks(operations);
  console.log(`✔︎  ${changedCount} documents updated in '${collectionName}'.`);
}

/**
 * Copy all docs from src ➜ dest collection (same doc IDs).
 */
async function copyCollection(src, dest) {
  console.log(`\n▶  Copying docs: ${src} ➜ ${dest}`);
  const snapshot = await db.collection(src).get();
  const operations = [];

  snapshot.forEach((doc) => {
    operations.push((batch) => batch.set(db.collection(dest).doc(doc.id), doc.data(), { merge: true }));
  });

  await commitInChunks(operations);
  console.log(`✔︎  ${snapshot.size} documents copied to '${dest}'.`);
}

async function main() {
  try {
    console.log('🚀  Starting Firestore migration script...');

    // 1. Field rename migrations
    await renameTypeField('wtm-slp');
    await renameTypeField('slp-activity');

    // 2. Collection copy
    await copyCollection('shakti-slp', 'wtm-slp');

    console.log('\n✅  Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌  Migration failed:', error);
    process.exit(1);
  }
}

main();
