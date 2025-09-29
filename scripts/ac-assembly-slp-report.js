const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// Firebase configuration (same as other scripts)
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDD9RZZM8u5_Q6I24SJk1_jACFeZTGgSpw",
  authDomain: "congressdashboard-e521d.firebaseapp.com",
  projectId: "congressdashboard-e521d",
  storageBucket: "congressdashboard-e521d.firebasestorage.app",
  messagingSenderId: "561776205072",
  appId: "1:561776205072:web:003a31ab2a9def84915995"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -------------------------------------------------------------
// Helpers: normalization and parsing
// -------------------------------------------------------------
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function extractPhoneCandidates(raw) {
  if (!raw) return [];
  const digits = String(raw);
  // Extract all digit sequences
  const sequences = digits.match(/\d+/g) || [];
  const candidates = new Set();
  for (const seq of sequences) {
    let s = seq; // only digits already
    // Keep last 10 digits if more than 10
    if (s.length > 10) {
      s = s.slice(-10);
    }
    if (s.length === 10) {
      candidates.add(s);
    }
  }
  return Array.from(candidates);
}

function normalizeAssemblyName(assembly) {
  if (!assembly) return '';
  return String(assembly).trim().replace(/\s+/g, ' ').toLowerCase();
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// -------------------------------------------------------------
// Sheet header detection (robust for merged headers)
// -------------------------------------------------------------
function detectHeaderIndices(sheetArray) {
  // Search first 5 rows for a row that contains all 3 headers
  const targetHeaders = ['leader name', 'contact no.', 'assembly 1'];
  for (let r = 0; r < Math.min(5, sheetArray.length); r++) {
    const row = sheetArray[r] || [];
    const lowered = row.map((cell) => (cell ? String(cell).trim().toLowerCase() : ''));
    const indices = {
      leaderNameIdx: -1,
      contactIdx: -1,
      assemblyIdx: -1,
      headerRowIndex: r
    };
    for (let c = 0; c < lowered.length; c++) {
      const cell = lowered[c];
      if (cell === 'leader name' && indices.leaderNameIdx === -1) indices.leaderNameIdx = c;
      if (cell === 'contact no.' && indices.contactIdx === -1) indices.contactIdx = c;
      if (cell === 'assembly 1' && indices.assemblyIdx === -1) indices.assemblyIdx = c;
    }
    if (indices.leaderNameIdx !== -1 && indices.contactIdx !== -1 && indices.assemblyIdx !== -1) {
      return indices;
    }
  }
  // Fallback to previous known indices if not detected (2,4) and guess assembly near them
  return { leaderNameIdx: 2, contactIdx: 4, assemblyIdx: 5, headerRowIndex: 1 };
}

// -------------------------------------------------------------
// Main script
// -------------------------------------------------------------
async function generateAcAssemblySlpReport() {
  console.log('🚀 Starting AC-Assembly-SLP coverage report generation...');

  // 1) Read sheet
  const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
  if (!fs.existsSync(workbookPath)) {
    throw new Error('workbook.xlsx not found at project root');
  }
  const workbook = XLSX.readFile(workbookPath);
  const worksheet = workbook.Sheets['SLP-State'];
  if (!worksheet) throw new Error('Sheet "SLP-State" not found in workbook.xlsx');
  const sheetArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`📄 Sheet rows: ${sheetArray.length}`);

  const { leaderNameIdx, contactIdx, assemblyIdx, headerRowIndex } = detectHeaderIndices(sheetArray);
  console.log(`🧭 Detected columns: Leader Name=${leaderNameIdx}, Contact No.=${contactIdx}, Assembly 1=${assemblyIdx}, headerRowIndex=${headerRowIndex}`);

  const dataStart = Math.max(headerRowIndex + 1, 2); // robust default
  const rows = sheetArray.slice(dataStart).filter((r) => r && (r[leaderNameIdx] || r[contactIdx] || r[assemblyIdx]));

  const sheetEntries = rows.map((row) => {
    const leaderNameRaw = row[leaderNameIdx] || '';
    const contactRaw = row[contactIdx] || '';
    const assemblyRaw = row[assemblyIdx] || '';
    const phones = extractPhoneCandidates(contactRaw);
    return {
      leaderName: String(leaderNameRaw).trim(),
      leaderNameNorm: normalizeName(leaderNameRaw),
      contactRaw: String(contactRaw).trim(),
      phoneCandidates: phones,
      assembly: String(assemblyRaw).trim(),
      assemblyNorm: normalizeAssemblyName(assemblyRaw)
    };
  });

  console.log(`📥 Parsed ${sheetEntries.length} rows from sheet`);

  // 2) Download SLPs (recommendedPosition == 'SLP')
  console.log('⬇️  Downloading SLP profiles (wtm-slp where recommendedPosition == "SLP")...');
  const slpQuery = query(collection(db, 'wtm-slp'), where('recommendedPosition', '==', 'SLP'));
  const slpSnap = await getDocs(slpQuery);
  console.log(`📦 Fetched ${slpSnap.size} SLP documents`);

  const phoneMap = new Map(); // phone -> [slpDocs]
  const nameMap = new Map();  // normalized name -> [slpDocs]

  const slpDocs = [];
  slpSnap.forEach((doc) => {
    const data = doc.data() || {};
    const name = data.name || '';
    const nameNorm = normalizeName(name);
    const mobile = data.mobileNumber || '';
    const phones = extractPhoneCandidates(mobile);
    const assembly = data.assembly || '';

    const payload = { id: doc.id, name, nameNorm, mobile, phones, assembly, assemblyNorm: normalizeAssemblyName(assembly) };
    slpDocs.push(payload);

    // Map phones
    for (const p of phones) {
      if (!phoneMap.has(p)) phoneMap.set(p, []);
      phoneMap.get(p).push(payload);
    }
    // Map names
    if (!nameMap.has(nameNorm)) nameMap.set(nameNorm, []);
    nameMap.get(nameNorm).push(payload);
  });

  // 3) Download AC users (role == 'Assembly Coordinator')
  console.log('⬇️  Downloading Assembly Coordinators (users where role == "Assembly Coordinator")...');
  const acQuery = query(collection(db, 'users'), where('role', '==', 'Assembly Coordinator'));
  const acSnap = await getDocs(acQuery);
  console.log(`📦 Fetched ${acSnap.size} Assembly Coordinator profiles`);

  const assemblyToAcs = new Map(); // normalized assembly -> Set of AC names
  acSnap.forEach((doc) => {
    const u = doc.data() || {};
    const acName = (u.name || '').toString().trim();
    const single = u.assembly ? [u.assembly] : [];
    const multi = Array.isArray(u.assemblies) ? u.assemblies : [];
    const allAssemblies = [...single, ...multi].map((a) => ({
      raw: String(a || '').trim(),
      norm: normalizeAssemblyName(a)
    }));

    allAssemblies.forEach(({ raw, norm }) => {
      if (!norm) return;
      if (!assemblyToAcs.has(norm)) assemblyToAcs.set(norm, { rawName: raw, names: new Set() });
      assemblyToAcs.get(norm).names.add(acName);
    });
  });

  // 4) Matching logic per sheet entry
  console.log('🔎 Performing matching (phone-first, then exact-name)...');
  function tryMatchByPhones(entry) {
    for (const p of entry.phoneCandidates) {
      const candidates = phoneMap.get(p);
      if (!candidates || candidates.length === 0) continue;
      if (candidates.length === 1) {
        return { matched: candidates[0], matchedBy: 'phone', phone: p, ambiguous: false };
      }
      // Disambiguate by assembly if possible
      const filtered = candidates.filter((c) => c.assemblyNorm && c.assemblyNorm === entry.assemblyNorm);
      if (filtered.length === 1) {
        return { matched: filtered[0], matchedBy: 'phone', phone: p, ambiguous: false };
      }
      // ambiguous
      return { matched: null, matchedBy: 'phone', phone: p, ambiguous: true, count: candidates.length };
    }
    return null;
  }

  function tryMatchByName(entry) {
    const list = nameMap.get(entry.leaderNameNorm);
    if (!list || list.length === 0) return null;
    if (list.length === 1) {
      return { matched: list[0], matchedBy: 'name', ambiguous: false };
    }
    // Disambiguate by assembly
    const filtered = list.filter((c) => c.assemblyNorm && c.assemblyNorm === entry.assemblyNorm);
    if (filtered.length === 1) {
      return { matched: filtered[0], matchedBy: 'name', ambiguous: false };
    }
    return { matched: null, matchedBy: 'name', ambiguous: true, count: list.length };
  }

  const assemblyGroups = new Map();
  const metrics = {
    totalRows: sheetEntries.length,
    phoneMatches: 0,
    nameMatches: 0,
    unmatched: 0,
    ambiguousPhone: 0,
    ambiguousName: 0,
    assembliesWithoutAc: new Set()
  };

  function getOrCreateGroup(assemblyRaw, assemblyNorm) {
    if (!assemblyGroups.has(assemblyNorm)) {
      const acInfo = assemblyToAcs.get(assemblyNorm);
      const acNames = acInfo ? Array.from(acInfo.names) : [];
      if (!acInfo || acNames.length === 0) metrics.assembliesWithoutAc.add(assemblyRaw || '(Unknown)');
      assemblyGroups.set(assemblyNorm, {
        assembly: assemblyRaw || '(Unknown)',
        acNames,
        matched: [],
        unmatched: []
      });
    }
    return assemblyGroups.get(assemblyNorm);
  }

  for (const entry of sheetEntries) {
    const group = getOrCreateGroup(entry.assembly, entry.assemblyNorm);
    let notes = '';

    // 1) Phone matching
    const phoneResult = tryMatchByPhones(entry);
    if (phoneResult && phoneResult.matched && !phoneResult.ambiguous) {
      metrics.phoneMatches++;
      group.matched.push({
        name: entry.leaderName,
        number: phoneResult.phone || entry.phoneCandidates[0] || entry.contactRaw,
        matchedBy: 'phone'
      });
      continue;
    } else if (phoneResult && phoneResult.ambiguous) {
      metrics.ambiguousPhone++;
      notes = `Ambiguous phone match (${phoneResult.count} candidates)`;
      group.unmatched.push({ name: entry.leaderName, number: entry.contactRaw, notes });
      metrics.unmatched++;
      continue;
    }

    // 2) Name matching
    const nameResult = tryMatchByName(entry);
    if (nameResult && nameResult.matched && !nameResult.ambiguous) {
      metrics.nameMatches++;
      // choose a number to show: matched doc's first normalized phone or original raw
      const matchedNumber = (nameResult.matched.phones && nameResult.matched.phones[0]) || entry.contactRaw;
      group.matched.push({
        name: entry.leaderName,
        number: matchedNumber,
        matchedBy: 'name'
      });
    } else if (nameResult && nameResult.ambiguous) {
      metrics.ambiguousName++;
      notes = `Ambiguous name match (${nameResult.count} candidates)`;
      group.unmatched.push({ name: entry.leaderName, number: entry.contactRaw, notes });
      metrics.unmatched++;
    } else {
      // No match
      group.unmatched.push({ name: entry.leaderName, number: entry.contactRaw, notes: '' });
      metrics.unmatched++;
    }
  }

  // 5) Build CSV
  const outPath = path.join(__dirname, '..', 'ac_assembly_slp_report.csv');
  const headers = [
    'Assembly',
    'AC Names',
    'Row Type',
    'SLP Status',
    'SLP Name',
    'Contact No.',
    'Matched Count',
    'Unmatched Count',
    'Notes'
  ];

  const lines = [headers.map(csvEscape).join(',')];

  // Sort assemblies alphabetically by display name
  const groupsArray = Array.from(assemblyGroups.values()).sort((a, b) => a.assembly.localeCompare(b.assembly));

  for (const g of groupsArray) {
    const acNamesDisplay = g.acNames && g.acNames.length > 0 ? g.acNames.join(' | ') : 'Not Found';
    const matchedCount = g.matched.length;
    const unmatchedCount = g.unmatched.length;

    // Summary row
    lines.push([
      csvEscape(g.assembly),
      csvEscape(acNamesDisplay),
      csvEscape('Summary'),
      '',
      '',
      '',
      csvEscape(matchedCount),
      csvEscape(unmatchedCount),
      ''
    ].join(','));

    // Detail rows - matched
    for (const m of g.matched) {
      lines.push([
        csvEscape(g.assembly),
        csvEscape(acNamesDisplay),
        csvEscape('SLP'),
        csvEscape('Matched'),
        csvEscape(m.name),
        csvEscape(m.number),
        '',
        '',
        csvEscape(m.matchedBy === 'phone' ? 'Matched by phone' : 'Matched by name')
      ].join(','));
    }

    // Detail rows - unmatched
    for (const u of g.unmatched) {
      lines.push([
        csvEscape(g.assembly),
        csvEscape(acNamesDisplay),
        csvEscape('SLP'),
        csvEscape('Unmatched'),
        csvEscape(u.name),
        csvEscape(u.number),
        '',
        '',
        csvEscape(u.notes || '')
      ].join(','));
    }
  }

  fs.writeFileSync(outPath, lines.join('\n'));

  // 6) Console summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 AC-Assembly-SLP Report Summary');
  console.log('='.repeat(60));
  console.log(`Total assemblies (in sheet groups): ${groupsArray.length}`);
  console.log(`Total SLP rows processed: ${metrics.totalRows}`);
  console.log(`Matched by phone: ${metrics.phoneMatches}`);
  console.log(`Matched by name: ${metrics.nameMatches}`);
  console.log(`Ambiguous (phone): ${metrics.ambiguousPhone}`);
  console.log(`Ambiguous (name): ${metrics.ambiguousName}`);
  console.log(`Unmatched: ${metrics.unmatched}`);
  if (metrics.assembliesWithoutAc.size > 0) {
    console.log(`Assemblies without AC mapping: ${metrics.assembliesWithoutAc.size}`);
    console.log(Array.from(metrics.assembliesWithoutAc).slice(0, 10).map((a, i) => `${i + 1}. ${a}`).join('\n'));
    if (metrics.assembliesWithoutAc.size > 10) {
      console.log(`... and ${metrics.assembliesWithoutAc.size - 10} more.`);
    }
  }
  console.log(`\n📁 CSV saved at: ${outPath}`);
  console.log('✅ Completed.');
}

if (require.main === module) {
  generateAcAssemblySlpReport().catch((err) => {
    console.error('❌ Error generating report:', err);
    process.exit(1);
  });
}

module.exports = { generateAcAssemblySlpReport };
