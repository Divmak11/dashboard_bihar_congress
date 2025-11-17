#!/usr/bin/env node
/**
 * Script: youtube-deduplicate-influencers.js
 *
 * Purpose:
 *  - Identify duplicate influencer documents in the `youtube` collection (form_type='influencer-data')
 *  - Cross-reference duplicates against `theme-data` documents via influencerEntries[].influencerId (and influencerIds[])
 *  - Delete ONLY those duplicates that are NOT referenced in any `theme-data` document (safe delete)
 *  - If ALL docs in a duplicate group are referenced, preserve the group and list it in the report
 *  - If NONE are referenced, configurable strategy (default keep-one-latest) to avoid deleting all
 *
 * Safety:
 *  - Dry-run by default (no writes). Pass --apply to execute deletions.
 *  - Writes a JSON report to scripts/output/ with details of actions.
 *
 * Usage examples:
 *  - Dry-run, group by channelLink (default), keep one latest when none referenced:
 *      node scripts/youtube-deduplicate-influencers.js
 *  - Dry-run, group by phoneNumber:
 *      node scripts/youtube-deduplicate-influencers.js --key=phoneNumber
 *  - Apply deletions:
 *      node scripts/youtube-deduplicate-influencers.js --apply
 *  - Use composite key (channelLink + phoneNumber):
 *      node scripts/youtube-deduplicate-influencers.js --key=composite
 *  - When none referenced, delete-all instead of keeping one:
 *      node scripts/youtube-deduplicate-influencers.js --unrefStrategy=delete-all
 */

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch, doc } = require('firebase/firestore');

// Firebase configuration (reuse the same config as app/utils/firebase.ts and other scripts)
const firebaseConfig = {
  apiKey: "AIzaSyDD9RZZM8u5_Q6I24SJk1_jACFeZTGgSpw",
  authDomain: "congressdashboard-e521d.firebaseapp.com",
  projectId: "congressdashboard-e521d",
  storageBucket: "congressdashboard-e521d.firebasestorage.app",
  messagingSenderId: "561776205072",
  appId: "1:561776205072:web:003a31ab2a9def84915995"
};

// Initialize Firebase client SDK
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function parseArgs(argv) {
  const args = {
    apply: false,
    key: 'channelLink', // 'channelLink' | 'phoneNumber' | 'composite'
    unrefStrategy: 'keep-one-latest', // 'keep-one-latest' | 'keep-one-oldest' | 'delete-all'
  };
  argv.slice(2).forEach((arg) => {
    if (arg === '--apply') args.apply = true;
    else if (arg.startsWith('--key=')) args.key = arg.split('=')[1];
    else if (arg.startsWith('--unrefStrategy=')) args.unrefStrategy = arg.split('=')[1];
  });
  return args;
}

function nowTs() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function ensureOutputDir() {
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D+/g, '');
  // For Indian numbers, keep last 10 digits if longer
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let s = url.trim().toLowerCase();
  // Remove protocol
  s = s.replace(/^https?:\/\//, '');
  // Remove trailing slashes
  s = s.replace(/\/+$/, '');
  // Remove common tracking query params if any
  const qIndex = s.indexOf('?');
  if (qIndex !== -1) s = s.slice(0, qIndex);
  return s;
}

function buildKey(docData, mode = 'channelLink') {
  const phone = normalizePhone(docData.phoneNumber);
  const channel = normalizeUrl(docData.channelLink);

  if (mode === 'phoneNumber') {
    return phone || null;
  }
  if (mode === 'composite') {
    const comp = `${channel}|${phone}`;
    return comp !== '|' ? comp : null;
  }
  // default channelLink
  return channel || null;
}

async function fetchReferencedInfluencerIds() {
  console.log('▶ Fetching referenced influencer IDs from theme-data ...');
  const refSet = new Set();
  const snap = await getDocs(query(collection(db, 'youtube'), where('form_type', '==', 'theme-data')));
  console.log(`   • Loaded ${snap.size} theme-data docs`);
  snap.forEach((d) => {
    const data = d.data() || {};
    if (Array.isArray(data.influencerIds)) {
      data.influencerIds.forEach((id) => id && refSet.add(String(id)));
    }
    if (Array.isArray(data.influencerEntries)) {
      data.influencerEntries.forEach((entry) => {
        if (entry && entry.influencerId) refSet.add(String(entry.influencerId));
      });
    }
  });
  console.log(`   • Referenced influencer IDs collected: ${refSet.size}`);
  return refSet;
}

async function fetchInfluencers() {
  console.log('▶ Fetching influencer-data docs ...');
  const snap = await getDocs(query(collection(db, 'youtube'), where('form_type', '==', 'influencer-data')));
  console.log(`   • Loaded ${snap.size} influencer-data docs`);
  const docs = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    docs.push({ id: d.id, data });
  });
  return docs;
}

function groupDuplicates(docs, keyMode) {
  console.log(`▶ Grouping duplicates by key: ${keyMode}`);
  const groups = new Map();
  const skipped = [];

  for (const d of docs) {
    const key = buildKey(d.data, keyMode);
    if (!key) { skipped.push(d); continue; }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }

  // Only keep groups with >1
  const dupGroups = [];
  groups.forEach((list, key) => {
    if (list.length > 1) dupGroups.push({ key, list });
  });

  console.log(`   • Found ${dupGroups.length} duplicate groups (>1 in same key)`);
  return { dupGroups, skippedNoKey: skipped.length };
}

function pickKeepIndex(list, strategy) {
  // Choose which doc to keep when none are referenced
  if (!list || list.length === 0) return -1;
  if (strategy === 'keep-one-oldest') {
    let idx = 0; let min = Number.MAX_SAFE_INTEGER;
    list.forEach((d, i) => { const ts = Number(d.data?.createdAt || 0); if (ts < min) { min = ts; idx = i; } });
    return idx;
  }
  // default keep-one-latest
  let idx = 0; let max = -1;
  list.forEach((d, i) => { const ts = Number(d.data?.createdAt || 0); if (ts > max) { max = ts; idx = i; } });
  return idx;
}

async function commitDeletesInChunks(docIds, chunkSize = 400) {
  let total = 0;
  for (let i = 0; i < docIds.length; i += chunkSize) {
    const chunk = docIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      const ref = doc(db, 'youtube', id);
      batch.delete(ref);
    }
    await batch.commit();
    total += chunk.length;
    console.log(`   • Committed deletion batch: ${total}/${docIds.length}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  console.log('============================================');
  console.log('YouTube Influencer Deduplication (Dry-run by default)');
  console.log('--------------------------------------------');
  console.log('Options:', args);

  const outDir = ensureOutputDir();
  const referencedIds = await fetchReferencedInfluencerIds();
  const influencers = await fetchInfluencers();

  const { dupGroups, skippedNoKey } = groupDuplicates(influencers, args.key);

  const toDelete = []; // doc IDs to delete
  const preservedGroups = []; // groups fully referenced
  const partiallyReferenced = []; // groups where some referenced, some not
  const unreferencedGroups = []; // groups with none referenced (pre-strategy)

  // Evaluate each duplicate group
  for (const g of dupGroups) {
    const statuses = g.list.map((d) => ({ id: d.id, referenced: referencedIds.has(d.id), createdAt: d.data?.createdAt || null, name: d.data?.name || null, phoneNumber: d.data?.phoneNumber || null, channelLink: d.data?.channelLink || null }));
    const allRef = statuses.every((s) => s.referenced);
    const anyRef = statuses.some((s) => s.referenced);

    if (allRef) {
      preservedGroups.push({ key: g.key, docs: statuses });
      continue;
    }

    if (anyRef) {
      // delete only unreferenced ones
      const del = statuses.filter((s) => !s.referenced).map((s) => s.id);
      toDelete.push(...del);
      partiallyReferenced.push({ key: g.key, toDelete: del, keep: statuses.filter((s) => s.referenced).map((s) => s.id), detail: statuses });
      continue;
    }

    // None referenced - apply strategy
    unreferencedGroups.push({ key: g.key, docs: statuses });
    if (args.unrefStrategy === 'delete-all') {
      toDelete.push(...statuses.map((s) => s.id));
    } else {
      const keepIdx = pickKeepIndex(g.list, args.unrefStrategy);
      const keepId = g.list[keepIdx]?.id;
      const del = statuses.filter((s) => s.id !== keepId).map((s) => s.id);
      toDelete.push(...del);
    }
  }

  // Build report
  const report = {
    timestamp: Date.now(),
    options: args,
    summary: {
      totalInfluencers: influencers.length,
      duplicateGroups: dupGroups.length,
      skippedNoKey,
      toDeleteCount: toDelete.length,
      preservedGroups: preservedGroups.length,
      partiallyReferenced: partiallyReferenced.length,
      unreferencedGroups: unreferencedGroups.length,
    },
    toDelete,
    preservedGroups,
    partiallyReferenced,
    unreferencedGroups,
  };

  const reportPath = path.join(outDir, `youtube-influencer-dedup-report-${nowTs()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('--------------------------------------------');
  console.log(`Report written to: ${reportPath}`);
  console.log('Summary:', report.summary);

  if (!args.apply) {
    console.log('\nDry-run complete. No documents were deleted.');
    console.log('Run again with --apply to execute deletions.');
    return;
  }

  if (toDelete.length === 0) {
    console.log('\nNo documents to delete. Exiting.');
    return;
  }

  console.log(`\nProceeding to delete ${toDelete.length} documents ...`);
  await commitDeletesInChunks(toDelete);
  console.log('\n✅ Deletion complete.');
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
