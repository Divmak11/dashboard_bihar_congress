#!/usr/bin/env node
/**
 * Diagnostic script to identify phone number mismatches between sheets
 * Helps identify typos and data inconsistencies
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : (digits || null);
}

async function diagnosePhoneMismatches() {
  console.log('🔍 Diagnosing Phone Number Mismatches\n');
  
  try {
    const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
    const workbook = XLSX.readFile(workbookPath);
    
    // Parse AC Details
    console.log('📋 Reading AC Details sheet...');
    const acSheet = workbook.Sheets['AC Details'];
    const acData = XLSX.utils.sheet_to_json(acSheet);
    
    const acPhoneMap = new Map(); // normalized -> raw
    const acPhoneDetails = new Map(); // normalized -> {name, raw, assembly}
    
    for (const row of acData) {
      const name = row['Name'];
      const phone = row['Phone'];
      const assembly = row['Assembly'];
      
      if (!phone || !name) continue;
      
      const normalized = normalizePhone(phone);
      if (normalized) {
        acPhoneMap.set(normalized, String(phone));
        acPhoneDetails.set(normalized, { name, raw: String(phone), assembly: assembly || '' });
      }
    }
    
    console.log(`   Found ${acPhoneMap.size} unique AC phones\n`);
    
    // Parse SLP Details and find mismatches
    console.log('📋 Reading SLP Details sheet...');
    const slpSheet = workbook.Sheets['SLP Details'];
    const slpData = XLSX.utils.sheet_to_json(slpSheet);
    
    const slpAcPhones = new Map(); // normalized AC phone -> list of SLPs using it
    const mismatches = [];
    let lastAcPhoneNormalized = null;
    
    for (const row of slpData) {
      const slpName = row['Name'];
      const slpPhone = row['Mobile Number'];
      const acPhoneNo = row['AC Phone No.'];
      
      if (!slpName || !slpPhone) continue;
      
      const normalizedAcPhoneCandidate = normalizePhone(acPhoneNo);
      const normalizedAcPhone = normalizedAcPhoneCandidate || lastAcPhoneNormalized;
      if (normalizedAcPhoneCandidate) {
        lastAcPhoneNormalized = normalizedAcPhoneCandidate;
      }
      
      if (!normalizedAcPhone) continue;
      
      if (!slpAcPhones.has(normalizedAcPhone)) {
        slpAcPhones.set(normalizedAcPhone, []);
      }
      slpAcPhones.get(normalizedAcPhone).push({
        name: slpName,
        phone: String(slpPhone),
        rawAcPhone: String(acPhoneNo || 'FILLED-DOWN')
      });
      
      // Check if this AC phone exists in AC map
      if (!acPhoneMap.has(normalizedAcPhone)) {
        // Find similar AC phones (off by a few digits)
        const similarAcPhones = [];
        for (const [acNorm, acRaw] of acPhoneMap.entries()) {
          const diff = countDifferentDigits(normalizedAcPhone, acNorm);
          if (diff > 0 && diff <= 3) {
            const acInfo = acPhoneDetails.get(acNorm);
            similarAcPhones.push({
              acPhone: acNorm,
              acRaw: acRaw,
              acName: acInfo.name,
              assembly: acInfo.assembly,
              diff
            });
          }
        }
        
        mismatches.push({
          slpName,
          slpPhone: String(slpPhone),
          acPhoneInSlpSheet: String(acPhoneNo || 'FILLED-DOWN'),
          acPhoneNormalized: normalizedAcPhone,
          similarAcPhones
        });
      }
    }
    
    console.log(`   Found ${slpAcPhones.size} unique AC phones referenced by SLPs`);
    console.log(`   Found ${mismatches.length} AC phones that don't match any AC\n`);
    
    // Similarly check Saathi Details
    console.log('📋 Reading Saathi Details sheet...');
    const saathiSheet = workbook.Sheets['Saathi Details'];
    const saathiData = XLSX.utils.sheet_to_json(saathiSheet);
    
    const saathiSlpPhones = new Map();
    const saathiMismatches = [];
    const slpPhoneMap = new Map();
    
    // Build SLP phone map first
    let lastSlpAcPhone = null;
    for (const row of slpData) {
      const slpPhone = row['Mobile Number'];
      const acPhoneNo = row['AC Phone No.'];
      
      const normalizedSlpPhone = normalizePhone(slpPhone);
      const normalizedAcPhoneCandidate = normalizePhone(acPhoneNo);
      const normalizedAcPhone = normalizedAcPhoneCandidate || lastSlpAcPhone;
      if (normalizedAcPhoneCandidate) {
        lastSlpAcPhone = normalizedAcPhoneCandidate;
      }
      
      if (normalizedSlpPhone && normalizedAcPhone && acPhoneMap.has(normalizedAcPhone)) {
        slpPhoneMap.set(normalizedSlpPhone, String(slpPhone));
      }
    }
    
    let lastSlpPhoneNormalized = null;
    for (const row of saathiData) {
      const saathiName = row['Name'];
      const saathiPhone = row['Phone'];
      const slpPhoneNo = row['SLP Phone No.'];
      
      if (!saathiName || !saathiPhone) continue;
      
      const normalizedSlpPhoneCandidate = normalizePhone(slpPhoneNo);
      const normalizedSlpPhone = normalizedSlpPhoneCandidate || lastSlpPhoneNormalized;
      if (normalizedSlpPhoneCandidate) {
        lastSlpPhoneNormalized = normalizedSlpPhoneCandidate;
      }
      
      if (!normalizedSlpPhone) continue;
      
      if (!saathiSlpPhones.has(normalizedSlpPhone)) {
        saathiSlpPhones.set(normalizedSlpPhone, []);
      }
      saathiSlpPhones.get(normalizedSlpPhone).push({
        name: saathiName,
        phone: String(saathiPhone)
      });
      
      if (!slpPhoneMap.has(normalizedSlpPhone)) {
        const similarSlpPhones = [];
        for (const [slpNorm, slpRaw] of slpPhoneMap.entries()) {
          const diff = countDifferentDigits(normalizedSlpPhone, slpNorm);
          if (diff > 0 && diff <= 3) {
            similarSlpPhones.push({
              slpPhone: slpNorm,
              slpRaw: slpRaw,
              diff
            });
          }
        }
        
        saathiMismatches.push({
          saathiName,
          saathiPhone: String(saathiPhone),
          slpPhoneInSaathiSheet: String(slpPhoneNo || 'FILLED-DOWN'),
          slpPhoneNormalized: normalizedSlpPhone,
          similarSlpPhones
        });
      }
    }
    
    console.log(`   Found ${saathiSlpPhones.size} unique SLP phones referenced by Saathis`);
    console.log(`   Found ${saathiMismatches.length} SLP phones that don't match any valid SLP\n`);
    
    // Generate detailed report
    const report = {
      summary: {
        totalAcPhones: acPhoneMap.size,
        totalSlpReferencedAcPhones: slpAcPhones.size,
        slpAcMismatches: mismatches.length,
        totalSlpPhones: slpPhoneMap.size,
        totalSaathiReferencedSlpPhones: saathiSlpPhones.size,
        saathiSlpMismatches: saathiMismatches.length
      },
      slpAcMismatches: mismatches,
      saathiSlpMismatches: saathiMismatches
    };
    
    // Write report
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const reportPath = path.join(outputDir, 'd2d_phone_mismatch_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('='.repeat(70));
    console.log('📊 PHONE MISMATCH DIAGNOSTIC REPORT');
    console.log('='.repeat(70));
    console.log(`\nAC Phone Issues:`);
    console.log(`   • Total AC phones in AC Details: ${acPhoneMap.size}`);
    console.log(`   • Unique AC phones referenced by SLPs: ${slpAcPhones.size}`);
    console.log(`   • SLP entries with non-matching AC phones: ${mismatches.length}`);
    
    if (mismatches.length > 0) {
      console.log(`\n📋 Sample SLP-AC Mismatches (first 5):`);
      mismatches.slice(0, 5).forEach((m, i) => {
        console.log(`\n${i + 1}. SLP: ${m.slpName} (${m.slpPhone})`);
        console.log(`   AC Phone in SLP sheet: ${m.acPhoneInSlpSheet}`);
        console.log(`   Normalized: ${m.acPhoneNormalized}`);
        if (m.similarAcPhones.length > 0) {
          console.log(`   ⚠️  Similar AC phones found:`);
          m.similarAcPhones.forEach(s => {
            console.log(`      - ${s.acPhone} (${s.acName}, ${s.assembly}) [${s.diff} digit diff]`);
          });
        } else {
          console.log(`   ❌ No similar AC phones found`);
        }
      });
    }
    
    console.log(`\n\nSLP Phone Issues:`);
    console.log(`   • Total valid SLP phones: ${slpPhoneMap.size}`);
    console.log(`   • Unique SLP phones referenced by Saathis: ${saathiSlpPhones.size}`);
    console.log(`   • Saathi entries with non-matching SLP phones: ${saathiMismatches.length}`);
    
    if (saathiMismatches.length > 0) {
      console.log(`\n📋 Sample Saathi-SLP Mismatches (first 5):`);
      saathiMismatches.slice(0, 5).forEach((m, i) => {
        console.log(`\n${i + 1}. Saathi: ${m.saathiName} (${m.saathiPhone})`);
        console.log(`   SLP Phone in Saathi sheet: ${m.slpPhoneInSaathiSheet}`);
        console.log(`   Normalized: ${m.slpPhoneNormalized}`);
        if (m.similarSlpPhones.length > 0) {
          console.log(`   ⚠️  Similar SLP phones found:`);
          m.similarSlpPhones.forEach(s => {
            console.log(`      - ${s.slpPhone} [${s.diff} digit diff]`);
          });
        } else {
          console.log(`   ❌ No similar SLP phones found`);
        }
      });
    }
    
    console.log(`\n\n📁 Full report saved to: ${reportPath}`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function countDifferentDigits(phone1, phone2) {
  if (phone1.length !== phone2.length) return 10;
  let diff = 0;
  for (let i = 0; i < phone1.length; i++) {
    if (phone1[i] !== phone2[i]) diff++;
  }
  return diff;
}

diagnosePhoneMismatches()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
