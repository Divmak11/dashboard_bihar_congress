const XLSX = require('xlsx');
const path = require('path');

// Function to handle merged cells fallback
function handleMergedCellValue(worksheet, currentRow, col, lastKnownValues) {
  const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
  let cellValue = worksheet[cellAddress]?.v;

  // If cell is empty, try to resolve from merged range anchor
  if (cellValue === undefined || cellValue === null || cellValue === '') {
    const merges = worksheet['!merges'] || [];
    for (const m of merges) {
      if (
        currentRow >= m.s.r && currentRow <= m.e.r &&
        col >= m.s.c && col <= m.e.c
      ) {
        const anchorAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
        const anchorVal = worksheet[anchorAddr]?.v;
        if (anchorVal !== undefined && anchorVal !== null && anchorVal !== '') {
          cellValue = anchorVal;
          break;
        }

// Read value strictly from cell or merged anchor (no last-known fallback)
function getCellOrMergedStrict(worksheet, currentRow, col) {
  const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
  let cellValue = worksheet[cellAddress]?.v;
  if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
    return cellValue;
  }
  const merges = worksheet['!merges'] || [];
  for (const m of merges) {
    if (
      currentRow >= m.s.r && currentRow <= m.e.r &&
      col >= m.s.c && col <= m.e.c
    ) {
      const anchorAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
      const anchorVal = worksheet[anchorAddr]?.v;
      if (anchorVal !== undefined && anchorVal !== null && anchorVal !== '') {
        return anchorVal;
      }
    }
  }
  return '';
}
      }
    }
  }

  if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
    lastKnownValues[col] = cellValue;
    return cellValue;
  }

  // Fallback to last known values
  return lastKnownValues[col] || '';
}
// Read value strictly from cell or merged anchor (no last-known fallback)
function getCellOrMergedStrict(worksheet, currentRow, col) {
  const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
  let cellValue = worksheet[cellAddress]?.v;
  if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
    return cellValue;
  }
  const merges = worksheet['!merges'] || [];
  for (const m of merges) {
    if (
      currentRow >= m.s.r && currentRow <= m.e.r &&
      col >= m.s.c && col <= m.e.c
    ) {
      const anchorAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
      const anchorVal = worksheet[anchorAddr]?.v;
      if (anchorVal !== undefined && anchorVal !== null && anchorVal !== '') {
        return anchorVal;
      }
    }
  }
  return '';
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

// Main function to process Excel file and return data
async function extractShaktiTrainingData() {
  console.log('🚀 Starting Shakti Training Data Extraction...');
  
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, '../Shakti_club.xlsx');
    console.log(`📖 Reading Excel file: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`📄 Processing sheet: ${sheetName}`);
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`📊 Sheet range: ${worksheet['!ref']}`);
    
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
      // Get training status without last-known propagation (only explicit or merged)
      const statusRaw = getCellOrMergedStrict(
        worksheet,
        rowIdx,
        actualColumnMap.trainingStatus
      );
      const trainingStatus = cleanValue(statusRaw);
      
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
        slpName: '', // Total SLPs column contains SLP names, not numbers
        attendees: 0,
        attendeesOtherThanClub: 0,
        form_type: 'shakti-data', // Different form_type for Shakti data
        createdAt: new Date().toISOString(),
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
      
      // Handle SLP Name (from Total SLPs column)
      if (actualColumnMap.totalSLPs !== undefined) {
        const slpNameCell = XLSX.utils.encode_cell({ 
          r: rowIdx, 
          c: actualColumnMap.totalSLPs 
        });
        const slpNameValue = worksheet[slpNameCell]?.v;
        rowData.slpName = cleanValue(slpNameValue);
      }
      
      // Handle numeric fields (only attendees columns)
      const numericFields = [
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
      rowData.slpName = cleanValue(rowData.slpName);
      
      // Validation checks (relaxed): log inconsistencies, fill defaults, but do not drop the row
      if (!rowData.zonal) {
        inconsistencies.push({ row: rowIdx + 1, issue: 'Missing Zonal', data: { assembly: rowData.assembly } });
        rowData.zonal = 'Unknown Zone';
      }
      if (!rowData.assembly) {
        inconsistencies.push({ row: rowIdx + 1, issue: 'Missing Assembly', data: { zonal: rowData.zonal } });
        rowData.assembly = 'Unknown Assembly';
      }
      if (!rowData.assemblyCoordinator) {
        inconsistencies.push({ row: rowIdx + 1, issue: 'Missing Assembly Coordinator', data: { zonal: rowData.zonal, assembly: rowData.assembly } });
        rowData.assemblyCoordinator = 'Unknown';
      }
      if (!rowData.slpName) {
        inconsistencies.push({ row: rowIdx + 1, issue: 'Missing SLP name', data: { zonal: rowData.zonal, assembly: rowData.assembly } });
        rowData.slpName = 'Unknown';
      }
      if (!rowData.dateOfTraining) {
        inconsistencies.push({ row: rowIdx + 1, issue: 'Missing or invalid date of training', data: { zonal: rowData.zonal, assembly: rowData.assembly } });
        // leave as empty string; upload API will use rowNumber in ID when date is unknown
      }

      // Always add the row (completed only), with defaults applied
      extractedData.push(rowData);
    }
    
    console.log(`✅ Extracted ${extractedData.length} completed Shakti training records`);
    console.log(`⚠️  Found ${inconsistencies.length} inconsistencies`);
    
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
            coordinator: issue.data.coordinator
          })}`);
        }
        console.log('');
      });
    }
    
    return {
      success: true,
      totalRecords: extractedData.length,
      inconsistencies: inconsistencies.length,
      data: extractedData,
      inconsistencyList: inconsistencies
    };
    
  } catch (error) {
    console.error('❌ Error processing Shakti training data:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  extractShaktiTrainingData()
    .then((result) => {
      console.log('🎉 Shakti data extraction completed successfully!');
      console.log('\n📊 PROCESSING SUMMARY:');
      console.log('=' .repeat(30));
      console.log(`✅ Total completed records processed: ${result.totalRecords}`);
      console.log(`⚠️  Total inconsistencies found: ${result.inconsistencies}`);
      console.log('\n📝 Ready to upload to Firebase via web interface');
      
      // Save extracted data to a JSON file for manual upload
      const fs = require('fs');
      const outputPath = path.join(__dirname, 'shakti-training-data.json');
      fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
      console.log(`💾 Data saved to: ${outputPath}`);
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { extractShaktiTrainingData };
