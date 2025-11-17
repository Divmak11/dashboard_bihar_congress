const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Assembly normalization and fuzzy matching utilities (adapted from assemblyNameUtils.ts)
function normalizeAssemblyName(input) {
  if (!input) return '';
  let s = String(input).trim();
  
  // Normalize unicode diacritics
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Lowercase
  s = s.toLowerCase();
  
  // Replace fancy quotes and dashes
  s = s.replace(/[''`]/g, "'").replace(/[–—]/g, '-');
  
  // Remove common suffixes like (SC), (ST), (General)
  s = s.replace(/\((sc|st|general)\)/gi, '');
  
  // Remove remaining parentheses and punctuation except spaces and hyphens
  s = s.replace(/[()\[\]{}.,]/g, ' ');
  
  // Convert hyphens/underscores to spaces
  s = s.replace(/[-_]+/g, ' ');
  
  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();
  
  return s;
}

// Jaro-Winkler similarity implementation
function jaroWinkler(a, b) {
  if (a === b) return 1;
  a = a || '';
  b = b || '';
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;

  const matchDistance = Math.floor(Math.max(aLen, bLen) / 2) - 1;
  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);

  let matches = 0;
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions = transpositions / 2;

  const m = matches;
  const jaro = (m / aLen + m / bLen + (m - transpositions) / m) / 3;

  // Winkler boost for common prefix up to 4 chars
  let prefix = 0;
  for (let i = 0; i < Math.min(4, aLen, bLen); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  const scalingFactor = 0.1;
  return jaro + prefix * scalingFactor * (1 - jaro);
}

// Clean and normalize assembly name from Excel (remove constituency number prefix)
function cleanAssemblyFromExcel(rawAssembly) {
  if (!rawAssembly) return '';
  
  let cleaned = String(rawAssembly).trim();
  
  // Remove constituency number prefix (e.g., "112-Maharajganj" -> "Maharajganj")
  cleaned = cleaned.replace(/^\d+[-\s]*/, '');
  
  return cleaned;
}

// Normalize mobile number
function normalizeMobile(raw) {
  if (!raw) return '';
  
  let mobile = String(raw).trim();
  
  // Remove all non-numeric characters except leading +
  mobile = mobile.replace(/[^\d+]/g, '');
  
  // Remove country code if present
  if (mobile.startsWith('+91')) {
    mobile = mobile.substring(3);
  } else if (mobile.startsWith('91') && mobile.length === 12) {
    mobile = mobile.substring(2);
  }
  
  // Remove leading 0 if 11 digits
  if (mobile.length === 11 && mobile.startsWith('0')) {
    mobile = mobile.substring(1);
  }
  
  return mobile;
}

// Find best matching assembly from reference list
function findBestAssemblyMatch(rawAssembly, referenceAssemblies) {
  const cleaned = cleanAssemblyFromExcel(rawAssembly);
  const normalized = normalizeAssemblyName(cleaned);
  
  if (!normalized) {
    return { match: null, score: 0, confidence: 'unmatched' };
  }
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const refAssembly of referenceAssemblies) {
    const refNormalized = normalizeAssemblyName(refAssembly);
    const score = jaroWinkler(normalized, refNormalized);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = refAssembly;
    }
  }
  
  // Classify confidence based on score
  let confidence;
  if (bestScore >= 0.93) confidence = 'high';
  else if (bestScore >= 0.88) confidence = 'medium';
  else if (bestScore >= 0.82) confidence = 'low';
  else confidence = 'unmatched';
  
  return { match: bestMatch, score: bestScore, confidence };
}

async function extractSlpTrainingData() {
  console.log('🚀 Starting SLP Training data extraction from Excel...\n');
  
  try {
    // Load reference assemblies
    const referenceAssembliesPath = path.join(__dirname, '../public/data/bihar_assemblies.json');
    const referenceAssemblies = JSON.parse(fs.readFileSync(referenceAssembliesPath, 'utf8'));
    console.log(`✅ Loaded ${referenceAssemblies.length} reference assemblies\n`);
    
    // Load Excel file
    const excelPath = path.join(__dirname, '../slp_training.xlsx');
    console.log('📊 Reading Excel file:', excelPath);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    console.log(`📋 Total rows (including header): ${rawData.length}\n`);
    
    // Skip first row (it's a header row with column names)
    const dataRows = rawData.slice(1);
    console.log(`📊 Processing ${dataRows.length} data rows...\n`);
    
    const extractedRecords = [];
    const skippedRecords = [];
    const unmatchedAssemblies = new Set();
    const assemblyMatchStats = {
      high: 0,
      medium: 0,
      low: 0,
      unmatched: 0
    };
    
    // Track duplicates within the Excel file
    const seenMobiles = new Set();
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Extract values (column mapping from inspection)
      const name = row['__EMPTY_1'] ? String(row['__EMPTY_1']).trim() : '';
      const rawContact = row['__EMPTY_3'];
      const rawAssembly = row['__EMPTY_7'];
      
      // Validate required fields
      if (!name || !rawContact || !rawAssembly) {
        skippedRecords.push({
          rowIndex: i + 2, // +2 because: +1 for header, +1 for 1-based indexing
          reason: 'Missing required field',
          data: { name, rawContact, rawAssembly }
        });
        continue;
      }
      
      // Clean mobile number
      const mobile = normalizeMobile(rawContact);
      
      // Validate mobile number (should be 10 digits)
      if (!/^\d{10}$/.test(mobile)) {
        skippedRecords.push({
          rowIndex: i + 2,
          reason: `Invalid mobile number: ${mobile}`,
          data: { name, rawContact: mobile, rawAssembly }
        });
        continue;
      }
      
      // Check for duplicate mobile within Excel
      if (seenMobiles.has(mobile)) {
        skippedRecords.push({
          rowIndex: i + 2,
          reason: `Duplicate mobile in Excel: ${mobile}`,
          data: { name, mobile, rawAssembly }
        });
        continue;
      }
      seenMobiles.add(mobile);
      
      // Find best assembly match
      const assemblyMatch = findBestAssemblyMatch(rawAssembly, referenceAssemblies);
      assemblyMatchStats[assemblyMatch.confidence]++;
      
      if (assemblyMatch.confidence === 'unmatched') {
        unmatchedAssemblies.add(rawAssembly);
      }
      
      // Use matched assembly or cleaned raw assembly as fallback
      const finalAssembly = assemblyMatch.match || cleanAssemblyFromExcel(rawAssembly);
      
      // Create record
      extractedRecords.push({
        name,
        mobile_number: mobile,
        assembly: finalAssembly,
        _metadata: {
          originalAssembly: rawAssembly,
          matchScore: assemblyMatch.score,
          matchConfidence: assemblyMatch.confidence,
          rowIndex: i + 2
        }
      });
    }
    
    // Remove duplicates from extracted records (by mobile number)
    const uniqueRecords = [];
    const uniqueMobiles = new Set();
    
    for (const record of extractedRecords) {
      if (!uniqueMobiles.has(record.mobile_number)) {
        uniqueMobiles.add(record.mobile_number);
        uniqueRecords.push(record);
      }
    }
    
    console.log('\n📊 EXTRACTION SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log(`Total rows processed: ${dataRows.length}`);
    console.log(`Successfully extracted: ${extractedRecords.length}`);
    console.log(`Unique records (after dedup): ${uniqueRecords.length}`);
    console.log(`Skipped records: ${skippedRecords.length}`);
    
    console.log('\n🎯 ASSEMBLY MATCHING STATS:');
    console.log('═══════════════════════════════════════');
    console.log(`High confidence (≥0.93): ${assemblyMatchStats.high}`);
    console.log(`Medium confidence (≥0.88): ${assemblyMatchStats.medium}`);
    console.log(`Low confidence (≥0.82): ${assemblyMatchStats.low}`);
    console.log(`Unmatched (<0.82): ${assemblyMatchStats.unmatched}`);
    
    if (unmatchedAssemblies.size > 0) {
      console.log('\n⚠️  UNMATCHED ASSEMBLIES (need manual review):');
      console.log('═══════════════════════════════════════');
      Array.from(unmatchedAssemblies).forEach(a => console.log(`  - ${a}`));
    }
    
    if (skippedRecords.length > 0) {
      console.log('\n⚠️  SKIPPED RECORDS (first 10):');
      console.log('═══════════════════════════════════════');
      skippedRecords.slice(0, 10).forEach(s => {
        console.log(`  Row ${s.rowIndex}: ${s.reason}`);
        console.log(`    Data: ${JSON.stringify(s.data)}`);
      });
      if (skippedRecords.length > 10) {
        console.log(`  ... and ${skippedRecords.length - 10} more`);
      }
    }
    
    // Write output file
    const outputPath = path.join(__dirname, '../extracted_new_slp_training.json');
    fs.writeFileSync(outputPath, JSON.stringify(uniqueRecords, null, 2), 'utf8');
    
    console.log('\n✅ Extraction complete!');
    console.log(`📁 Output saved to: extracted_new_slp_training.json`);
    console.log(`📦 ${uniqueRecords.length} unique records ready for upload\n`);
    
    // Also save detailed report
    const reportPath = path.join(__dirname, '../extraction-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalRows: dataRows.length,
        extracted: extractedRecords.length,
        unique: uniqueRecords.length,
        skipped: skippedRecords.length
      },
      assemblyMatchStats,
      unmatchedAssemblies: Array.from(unmatchedAssemblies),
      skippedRecords
    }, null, 2), 'utf8');
    
    console.log(`📋 Detailed report saved to: extraction-report.json\n`);
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    throw error;
  }
}

// Run extraction
extractSlpTrainingData();
