#!/usr/bin/env node
/**
 * Script: import-d2d-shakti-members.js
 * 
 * Purpose: Parse workbook.xlsx (Shakti Abhiyaan data) and prepare d2d_members entries
 * 
 * Input: workbook.xlsx with 3 sheets:
 *   - "AC Details": Name, Phone, Assembly
 *   - "SLP Details": Name, Mobile Number, AC Phone No.
 *   - "Saathi Details": Name, Phone, SLP Phone No.
 * 
 * Output:
 *   - scripts/output/d2d_valid_entries.json: Valid entries ready for Firestore upload
 *   - scripts/output/d2d_conflicts.json: Entries with missing parent references
 * 
 * Usage:
 *   $ node scripts/import-d2d-shakti-members.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Utility: Normalize phone number to last 10 digits
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : (digits || null);
}

// Utility: Count different digits between two phone numbers
function countDifferentDigits(phone1, phone2) {
  if (!phone1 || !phone2 || phone1.length !== phone2.length) return 10;
  let diff = 0;
  for (let i = 0; i < phone1.length; i++) {
    if (phone1[i] !== phone2[i]) diff++;
  }
  return diff;
}

// Utility: Find closest matching phone with fuzzy matching (max 2 digit difference)
function findClosestPhone(targetPhone, phoneMap, maxDiff = 2) {
  if (!targetPhone) return null;
  
  // First try exact match
  if (phoneMap.has(targetPhone)) {
    return { phone: targetPhone, exact: true, diff: 0 };
  }
  
  // Try fuzzy match
  let bestMatch = null;
  let minDiff = maxDiff + 1;
  
  for (const [phone, data] of phoneMap.entries()) {
    const diff = countDifferentDigits(targetPhone, phone);
    if (diff > 0 && diff <= maxDiff && diff < minDiff) {
      bestMatch = { phone, data, diff };
      minDiff = diff;
    }
  }
  
  return bestMatch;
}

// Utility: Generate deterministic document ID
function generateDocId(role, phone) {
  return `shakti-${role.toLowerCase()}-${phone}`;
}

// Utility: Create base d2d member object
function createD2DMember(name, phoneNumber, assembly, role, handler_id) {
  return {
    name: name || '',
    phoneNumber,
    assembly: assembly || '', // Preserve empty strings
    role,
    handler_id,
    status: 'Active',
    createdAt: Date.now(),
    parentVertical: 'shakti-abhiyaan',
    // Document ID will be set during Firestore write
    _docId: generateDocId(role, phoneNumber)
  };
}

async function parseWorkbookAndPrepareData() {
  console.log('🚀 Starting Shakti Abhiyaan D2D Members Import Script\n');
  
  try {
    // Step 1: Read workbook
    console.log('📊 Reading workbook.xlsx...');
    const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
    
    if (!fs.existsSync(workbookPath)) {
      throw new Error('workbook.xlsx not found in project root');
    }
    
    const workbook = XLSX.readFile(workbookPath);
    console.log(`✅ Workbook loaded. Available sheets: ${workbook.SheetNames.join(', ')}\n`);
    
    // Step 2: Validate sheets exist
    const requiredSheets = ['AC Details', 'SLP Details', 'Saathi Details'];
    for (const sheetName of requiredSheets) {
      if (!workbook.Sheets[sheetName]) {
        throw new Error(`Required sheet "${sheetName}" not found in workbook`);
      }
    }
    console.log('✅ All required sheets found\n');
    
    // Step 3: Parse AC Details sheet
    console.log('📋 Parsing "AC Details" sheet...');
    const acSheet = workbook.Sheets['AC Details'];
    const acData = XLSX.utils.sheet_to_json(acSheet);
    console.log(`   Found ${acData.length} rows`);
    
    // Build AC map: normalized phone -> AC data
    const acMap = new Map();
    const acEntries = [];
    let acSkipped = 0;
    
    for (const row of acData) {
      const name = row['Name'];
      const phone = row['Phone'];
      const assembly = row['Assembly'];
      
      const normalizedPhone = normalizePhone(phone);
      
      if (!normalizedPhone || !name) {
        acSkipped++;
        continue;
      }
      
      // Store in map for SLP/Saathi lookups
      acMap.set(normalizedPhone, {
        name,
        phoneNumber: normalizedPhone,
        assembly: assembly || '' // Preserve empty
      });
      
      // Create AC entry
      acEntries.push(createD2DMember(
        name,
        normalizedPhone,
        assembly || '',
        'AC',
        normalizedPhone // handler_id = self phone
      ));
    }
    
    console.log(`   ✅ Processed ${acEntries.length} AC entries (skipped ${acSkipped} invalid rows)\n`);
    
    // Step 4: Parse SLP Details sheet
    console.log('📋 Parsing "SLP Details" sheet...');
    const slpSheet = workbook.Sheets['SLP Details'];
    const slpData = XLSX.utils.sheet_to_json(slpSheet);
    console.log(`   Found ${slpData.length} rows`);
    
    // Build SLP map for Saathi lookups: normalized phone -> SLP data
    const slpMap = new Map();
    const slpEntries = [];
    const slpConflicts = [];
    let slpSkipped = 0;
    // Handle merged/grouped cells: fill-down last seen AC phone for subsequent SLP rows
    let lastAcPhoneNormalized = null;
    
    for (const row of slpData) {
      const name = row['Name'];
      const mobileNumber = row['Mobile Number'];
      const acPhoneNo = row['AC Phone No.'];
      
      const normalizedPhone = normalizePhone(mobileNumber);
      const normalizedAcPhoneCandidate = normalizePhone(acPhoneNo);
      const normalizedAcPhone = normalizedAcPhoneCandidate || lastAcPhoneNormalized;
      if (normalizedAcPhoneCandidate) {
        lastAcPhoneNormalized = normalizedAcPhoneCandidate;
      }
      
      if (!normalizedPhone || !name) {
        slpSkipped++;
        continue;
      }
      
      // Lookup AC to get assembly (with fuzzy matching for typos)
      let ac = acMap.get(normalizedAcPhone);
      let acPhoneUsed = normalizedAcPhone;
      let fuzzyMatch = false;
      
      if (!ac && normalizedAcPhone) {
        // Try fuzzy match for common typos (max 2 digit difference)
        const match = findClosestPhone(normalizedAcPhone, acMap, 2);
        if (match && match.diff <= 2) {
          ac = match.data;
          acPhoneUsed = match.phone;
          fuzzyMatch = true;
          console.log(`   🔧 Fuzzy matched SLP "${name}" AC phone ${normalizedAcPhone} -> ${acPhoneUsed} (${match.diff} digit diff)`);
        }
      }
      
      if (!ac) {
        // Conflict: AC not found even with fuzzy matching
        slpConflicts.push({
          name,
          phoneNumber: normalizedPhone,
          acPhoneNo: normalizedAcPhone || 'MISSING',
          reason: 'AC phone not found in AC Details sheet (no close match)'
        });
        continue;
      }
      
      // Store in map for Saathi lookups (use corrected AC phone)
      slpMap.set(normalizedPhone, {
        name,
        phoneNumber: normalizedPhone,
        acPhoneNo: acPhoneUsed, // Use fuzzy-matched phone if applicable
        assembly: ac.assembly
      });
      
      // Create SLP entry
      slpEntries.push(createD2DMember(
        name,
        normalizedPhone,
        ac.assembly,
        'SLP',
        acPhoneUsed // handler_id = AC phone (corrected if fuzzy matched)
      ));
    }
    
    console.log(`   ✅ Processed ${slpEntries.length} SLP entries (skipped ${slpSkipped} invalid, ${slpConflicts.length} conflicts)\n`);
    
    // Step 5: Parse Saathi Details sheet
    console.log('📋 Parsing "Saathi Details" sheet...');
    const saathiSheet = workbook.Sheets['Saathi Details'];
    const saathiData = XLSX.utils.sheet_to_json(saathiSheet);
    console.log(`   Found ${saathiData.length} rows`);
    
    const saathiEntries = [];
    const saathiConflicts = [];
    let saathiSkipped = 0;
    // Handle merged/grouped cells: fill-down last seen SLP phone for subsequent Saathi rows
    let lastSlpPhoneNormalized = null;
    
    for (const row of saathiData) {
      const name = row['Name'];
      const phone = row['Phone'];
      const slpPhoneNo = row['SLP Phone No.'];
      
      const normalizedPhone = normalizePhone(phone);
      const normalizedSlpPhoneCandidate = normalizePhone(slpPhoneNo);
      const normalizedSlpPhone = normalizedSlpPhoneCandidate || lastSlpPhoneNormalized;
      if (normalizedSlpPhoneCandidate) {
        lastSlpPhoneNormalized = normalizedSlpPhoneCandidate;
      }
      
      if (!normalizedPhone || !name) {
        saathiSkipped++;
        continue;
      }
      
      // Lookup SLP to get AC phone and assembly (with fuzzy matching for typos)
      let slp = slpMap.get(normalizedSlpPhone);
      let slpPhoneUsed = normalizedSlpPhone;
      let slpFuzzyMatch = false;
      
      if (!slp && normalizedSlpPhone) {
        // Try fuzzy match for common typos (max 2 digit difference)
        const match = findClosestPhone(normalizedSlpPhone, slpMap, 2);
        if (match && match.diff <= 2) {
          slp = match.data;
          slpPhoneUsed = match.phone;
          slpFuzzyMatch = true;
          console.log(`   🔧 Fuzzy matched Saathi "${name}" SLP phone ${normalizedSlpPhone} -> ${slpPhoneUsed} (${match.diff} digit diff)`);
        }
      }
      
      if (!slp) {
        // Conflict: SLP not found even with fuzzy matching
        saathiConflicts.push({
          name,
          phoneNumber: normalizedPhone,
          slpPhoneNo: normalizedSlpPhone || 'MISSING',
          acPhoneNo: 'N/A',
          reason: 'SLP phone not found in SLP Details sheet (no close match)'
        });
        continue;
      }
      
      // Verify AC exists (should always exist if SLP was valid, but double-check)
      const ac = acMap.get(slp.acPhoneNo);
      if (!ac) {
        // Conflict: AC not found (shouldn't happen if SLP was valid)
        saathiConflicts.push({
          name,
          phoneNumber: normalizedPhone,
          slpPhoneNo: normalizedSlpPhone,
          slpName: slp.name,
          acPhoneNo: slp.acPhoneNo,
          reason: 'AC phone not found (derived from SLP)'
        });
        continue;
      }
      
      // Create Saathi entry
      saathiEntries.push(createD2DMember(
        name,
        normalizedPhone,
        ac.assembly,
        'Saathi',
        slpPhoneUsed // handler_id = SLP phone (corrected if fuzzy matched)
      ));
    }
    
    console.log(`   ✅ Processed ${saathiEntries.length} Saathi entries (skipped ${saathiSkipped} invalid, ${saathiConflicts.length} conflicts)\n`);
    
    // Step 6: Combine and deduplicate entries
    console.log('🔄 Combining and deduplicating entries...');
    const allEntries = [...acEntries, ...slpEntries, ...saathiEntries];
    
    // Deduplicate by (role + phoneNumber) - last wins
    const dedupeMap = new Map();
    for (const entry of allEntries) {
      const key = `${entry.role}-${entry.phoneNumber}`;
      dedupeMap.set(key, entry);
    }
    
    const validEntries = Array.from(dedupeMap.values());
    console.log(`   ✅ Final count: ${validEntries.length} unique entries (${allEntries.length - validEntries.length} duplicates removed)\n`);
    
    // Step 7: Generate summary statistics
    const stats = {
      ac: validEntries.filter(e => e.role === 'AC').length,
      slp: validEntries.filter(e => e.role === 'SLP').length,
      saathi: validEntries.filter(e => e.role === 'Saathi').length,
      total: validEntries.length,
      conflicts: {
        slpWithoutAc: slpConflicts.length,
        saathiWithoutSlpOrAc: saathiConflicts.length,
        total: slpConflicts.length + saathiConflicts.length
      }
    };
    
    // Step 8: Write output files
    console.log('💾 Writing output files...');
    
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write valid entries
    const validEntriesPath = path.join(outputDir, 'd2d_valid_entries.json');
    fs.writeFileSync(validEntriesPath, JSON.stringify(validEntries, null, 2));
    console.log(`   ✅ Valid entries saved to: ${validEntriesPath}`);
    
    // Write conflicts
    const conflictsPath = path.join(outputDir, 'd2d_conflicts.json');
    const conflicts = {
      summary: {
        slpWithoutAc: slpConflicts.length,
        saathiWithoutSlpOrAc: saathiConflicts.length,
        total: slpConflicts.length + saathiConflicts.length
      },
      slpWithoutAc: slpConflicts,
      saathiWithoutSlpOrAc: saathiConflicts
    };
    fs.writeFileSync(conflictsPath, JSON.stringify(conflicts, null, 2));
    console.log(`   ✅ Conflicts saved to: ${conflictsPath}\n`);
    
    // Step 9: Print summary report
    console.log('='.repeat(70));
    console.log('📊 IMPORT PREPARATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Valid Entries Ready for Upload:`);
    console.log(`   • AC:     ${stats.ac.toString().padStart(4)} entries`);
    console.log(`   • SLP:    ${stats.slp.toString().padStart(4)} entries`);
    console.log(`   • Saathi: ${stats.saathi.toString().padStart(4)} entries`);
    console.log(`   • Total:  ${stats.total.toString().padStart(4)} entries`);
    
    console.log(`\n⚠️  Conflicts Requiring Review:`);
    console.log(`   • SLP without AC:           ${stats.conflicts.slpWithoutAc.toString().padStart(4)} entries`);
    console.log(`   • Saathi without SLP or AC: ${stats.conflicts.saathiWithoutSlpOrAc.toString().padStart(4)} entries`);
    console.log(`   • Total conflicts:          ${stats.conflicts.total.toString().padStart(4)} entries`);
    
    console.log(`\n📁 Output Files:`);
    console.log(`   • Valid entries:  scripts/output/d2d_valid_entries.json`);
    console.log(`   • Conflicts:      scripts/output/d2d_conflicts.json`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Data preparation completed successfully!');
    console.log('='.repeat(70));
    
    if (stats.conflicts.total > 0) {
      console.log('\n⚠️  NOTE: Review conflicts file before uploading to Firestore');
    }
    
    console.log('\n💡 Next steps:');
    console.log('   1. Review d2d_conflicts.json and resolve issues in source Excel');
    console.log('   2. Use d2d_valid_entries.json for Firestore upload');
    console.log('   3. Each entry includes _docId for deterministic document IDs\n');
    
  } catch (error) {
    console.error('\n❌ Error during data preparation:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  parseWorkbookAndPrepareData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { parseWorkbookAndPrepareData };
