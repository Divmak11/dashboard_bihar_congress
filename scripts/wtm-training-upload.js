const XLSX = require('xlsx');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with project details
const firebaseConfig = {
  projectId: "congressdashboard-e521d",
  // Using Application Default Credentials or service account
};

let app;
try {
  // Try to initialize admin app
  app = admin.initializeApp(firebaseConfig);
} catch (error) {
  // If already initialized, get existing app
  app = admin.app();
}

const db = admin.firestore();

// Function to handle merged cells fallback
function handleMergedCellValue(worksheet, currentRow, col, lastKnownValues) {
  const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
  const cellValue = worksheet[cellAddress]?.v;
  
  if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
    // Update last known value for this column
    lastKnownValues[col] = cellValue;
    return cellValue;
  } else {
    // Use fallback value from last known values
    return lastKnownValues[col] || '';
  }
}

// Function to convert Excel date serial to JavaScript Date
function excelDateToJSDate(excelDate) {
  if (typeof excelDate === 'number') {
    // Excel date serial number (days since 1900-01-01)
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
    return jsDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } else if (typeof excelDate === 'string') {
    // Already a string, try to parse it
    const parsedDate = new Date(excelDate);
    if (!isNaN(parsedDate)) {
      return parsedDate.toISOString().split('T')[0];
    }
  }
  return excelDate; // Return as-is if can't convert
}

// Function to clean and validate data
function cleanValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

// Main function to process Excel file
async function processWTMTrainingData() {
  console.log('🚀 Starting WTM Training Data Processing...');
  
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, '../WTM_club.xlsx');
    console.log(`📖 Reading Excel file: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`📄 Processing sheet: ${sheetName}`);
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`📊 Sheet range: ${worksheet['!ref']}`);
    
    // Define column mappings (adjust indices based on actual Excel structure)
    const columnMap = {
      zonal: 0,           // Column A
      assembly: 1,        // Column B  
      assemblyCoordinator: 2, // Column C
      trainingStatus: 3,  // Column D (we'll look for this)
      dateOfTraining: 4,  // Column E
      totalSLPs: 5,       // Column F
      attendees: 6,       // Column G
      attendeesOtherThanClub: 7 // Column H
    };
    
    // Find header row and actual column positions
    let headerRow = -1;
    let actualColumnMap = {};
    
    // Search for header row
    for (let row = 0; row <= 10; row++) { // Check first 10 rows for headers
      let foundHeaders = 0;
      const tempColumnMap = {};
      
      for (let col = 0; col < 20; col++) { // Check first 20 columns
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cellValue = worksheet[cellAddress]?.v;
        
        if (cellValue && typeof cellValue === 'string') {
          const lowerValue = cellValue.toLowerCase().trim();
          
          if (lowerValue.includes('training status') || lowerValue === 'training status') {
            tempColumnMap.trainingStatus = col;
            foundHeaders++;
          } else if (lowerValue.includes('zonal') || lowerValue === 'zonal') {
            tempColumnMap.zonal = col;
            foundHeaders++;
          } else if (lowerValue.includes('assembly') && !lowerValue.includes('coordinator')) {
            tempColumnMap.assembly = col;
            foundHeaders++;
          } else if (lowerValue.includes('assembly coordinator') || lowerValue.includes('coordinator')) {
            tempColumnMap.assemblyCoordinator = col;
            foundHeaders++;
          } else if ((lowerValue.includes('date') && lowerValue.includes('training')) || lowerValue === 'date of training') {
            tempColumnMap.dateOfTraining = col;
            foundHeaders++;
          } else if ((lowerValue.includes('total') && lowerValue.includes('slp')) || lowerValue === 'total slps') {
            tempColumnMap.totalSLPs = col;
            foundHeaders++;
          } else if (lowerValue.includes('attendees') && lowerValue.includes('other')) {
            tempColumnMap.attendeesOtherThanClub = col;
            foundHeaders++;
          } else if ((lowerValue.includes('no.') && lowerValue.includes('attendees')) || lowerValue === 'no. of attendees') {
            tempColumnMap.attendees = col;
            foundHeaders++;
          }
        }
      }
      
      // If we found at least 4 key headers, consider this the header row
      if (foundHeaders >= 4) {
        headerRow = row;
        actualColumnMap = tempColumnMap;
        break;
      }
    }
    
    console.log(`🔍 Found headers at row ${headerRow + 1}`);
    console.log('📋 Column mapping:', actualColumnMap);
    
    // Debug: Print actual header values for the detected row
    if (headerRow !== -1) {
      console.log('🔍 Actual header values:');
      for (let col = 0; col < 10; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
        const cellValue = worksheet[cellAddress]?.v;
        if (cellValue) {
          console.log(`  Column ${col}: "${cellValue}"`);
        }
      }
    }
    
    if (headerRow === -1) {
      throw new Error('Could not find header row with required columns');
    }
    
    const extractedData = [];
    const inconsistencies = [];
    const lastKnownValues = {}; // For handling merged cells
    
    // Process data rows
    for (let rowIdx = headerRow + 1; rowIdx <= range.e.r; rowIdx++) {
      // Get training status first
      const trainingStatusCell = XLSX.utils.encode_cell({ 
        r: rowIdx, 
        c: actualColumnMap.trainingStatus 
      });
      const trainingStatus = cleanValue(worksheet[trainingStatusCell]?.v);
      
      // Only process rows where Training Status = "completed"
      if (trainingStatus.toLowerCase() !== 'completed') {
        continue;
      }
      
      // Extract data with merged cell fallback
      const rowData = {
        zonal: handleMergedCellValue(worksheet, rowIdx, actualColumnMap.zonal, lastKnownValues),
        assembly: handleMergedCellValue(worksheet, rowIdx, actualColumnMap.assembly, lastKnownValues),
        assemblyCoordinator: handleMergedCellValue(worksheet, rowIdx, actualColumnMap.assemblyCoordinator, lastKnownValues),
        trainingStatus: trainingStatus,
        dateOfTraining: '',
        totalSLPs: 0,
        attendees: 0,
        attendeesOtherThanClub: 0,
        form_type: 'wtm',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        rowNumber: rowIdx + 1 // For tracking inconsistencies
      };
      
      // Handle Date of Training
      if (actualColumnMap.dateOfTraining !== undefined) {
        const dateCell = XLSX.utils.encode_cell({ 
          r: rowIdx, 
          c: actualColumnMap.dateOfTraining 
        });
        const dateValue = worksheet[dateCell]?.v;
        const convertedDate = excelDateToJSDate(dateValue);
        rowData.dateOfTraining = convertedDate || '';
      }
      
      // Handle numeric fields
      const numericFields = [
        { key: 'totalSLPs', col: actualColumnMap.totalSLPs },
        { key: 'attendees', col: actualColumnMap.attendees },
        { key: 'attendeesOtherThanClub', col: actualColumnMap.attendeesOtherThanClub }
      ];
      
      numericFields.forEach(field => {
        if (field.col !== undefined) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: field.col });
          const cellValue = worksheet[cellAddress]?.v;
          
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            const numValue = parseInt(cellValue);
            if (!isNaN(numValue)) {
              rowData[field.key] = numValue;
            } else {
              inconsistencies.push({
                row: rowIdx + 1,
                field: field.key,
                value: cellValue,
                issue: 'Invalid numeric value'
              });
            }
          }
        }
      });
      
      // Clean and validate all string fields to avoid undefined values
      rowData.zonal = cleanValue(rowData.zonal);
      rowData.assembly = cleanValue(rowData.assembly);
      rowData.assemblyCoordinator = cleanValue(rowData.assemblyCoordinator);
      rowData.dateOfTraining = cleanValue(rowData.dateOfTraining);
      
      // Validation checks
      let hasValidationErrors = false;
      
      if (!rowData.zonal || !rowData.assembly || !rowData.assemblyCoordinator) {
        inconsistencies.push({
          row: rowIdx + 1,
          issue: 'Missing required fields (Zonal/Assembly/Coordinator)',
          data: {
            zonal: rowData.zonal,
            assembly: rowData.assembly,
            coordinator: rowData.assemblyCoordinator
          }
        });
        hasValidationErrors = true;
      }
      
      if (!rowData.dateOfTraining) {
        inconsistencies.push({
          row: rowIdx + 1,
          issue: 'Missing or invalid date of training',
          data: rowData
        });
        hasValidationErrors = true;
      }
      
      // Only add valid records to extractedData
      if (!hasValidationErrors) {
        extractedData.push(rowData);
      }
    }
    
    console.log(`✅ Extracted ${extractedData.length} completed training records`);
    console.log(`⚠️  Found ${inconsistencies.length} inconsistencies`);
    
    // Upload to Firebase
    if (extractedData.length > 0) {
      console.log('🔥 Uploading to Firebase...');
      
      const batch = db.batch();
      const trainingCollection = db.collection('training');
      
      extractedData.forEach((record, index) => {
        // Remove rowNumber before uploading
        delete record.rowNumber;
        
        const docRef = trainingCollection.doc(); // Auto-generate ID
        batch.set(docRef, record);
      });
      
      await batch.commit();
      console.log('✅ Successfully uploaded all records to Firebase');
    }
    
    // Report inconsistencies
    if (inconsistencies.length > 0) {
      console.log('\n📋 INCONSISTENCIES REPORT:');
      console.log('=' .repeat(50));
      
      inconsistencies.forEach((issue, index) => {
        console.log(`${index + 1}. Row ${issue.row}: ${issue.issue}`);
        if (issue.field) console.log(`   Field: ${issue.field}, Value: ${issue.value}`);
        if (issue.data) {
          console.log(`   Data: ${JSON.stringify({
            zonal: issue.data.zonal,
            assembly: issue.data.assembly,
            coordinator: issue.data.assemblyCoordinator
          })}`);
        }
        console.log('');
      });
    }
    
    // Summary
    console.log('\n📊 PROCESSING SUMMARY:');
    console.log('=' .repeat(30));
    console.log(`✅ Total completed records processed: ${extractedData.length}`);
    console.log(`⚠️  Total inconsistencies found: ${inconsistencies.length}`);
    console.log(`🔥 Records uploaded to Firebase: ${extractedData.length}`);
    
    return {
      success: true,
      totalRecords: extractedData.length,
      inconsistencies: inconsistencies.length,
      data: extractedData
    };
    
  } catch (error) {
    console.error('❌ Error processing WTM training data:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  processWTMTrainingData()
    .then((result) => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { processWTMTrainingData };
