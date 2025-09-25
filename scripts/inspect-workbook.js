const XLSX = require('xlsx');
const path = require('path');

async function inspectWorkbook() {
  console.log('🔍 Inspecting workbook.xlsx structure...\n');
  
  try {
    // Read the workbook
    const workbookPath = path.join(__dirname, '..', 'workbook.xlsx');
    const workbook = XLSX.readFile(workbookPath);
    
    console.log('📋 Available sheets:');
    console.log(workbook.SheetNames);
    console.log('');
    
    // Check for SLP-State sheet specifically
    const worksheet = workbook.Sheets['SLP-State'];
    
    if (!worksheet) {
      console.log('❌ Sheet "SLP-State" not found!');
      console.log('Available sheets:', workbook.SheetNames);
      return;
    }
    
    console.log('✅ Found "SLP-State" sheet');
    
    // Convert sheet to JSON to see the structure
    const sheetData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 Total rows in sheet: ${sheetData.length}`);
    
    if (sheetData.length > 0) {
      console.log('\n📋 Column names (first row):');
      const columns = Object.keys(sheetData[0]);
      columns.forEach((col, index) => {
        console.log(`${index + 1}. "${col}"`);
      });
      
      console.log('\n📄 Sample data (first 3 rows):');
      sheetData.slice(0, 3).forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: "${value}"`);
        });
      });
      
      // Check specifically for contact number columns
      console.log('\n🔍 Looking for contact number columns:');
      const contactColumns = columns.filter(col => 
        col.toLowerCase().includes('contact') || 
        col.toLowerCase().includes('mobile') || 
        col.toLowerCase().includes('phone')
      );
      console.log('Contact-related columns:', contactColumns);
      
      // Check for leader name columns
      console.log('\n🔍 Looking for leader name columns:');
      const nameColumns = columns.filter(col => 
        col.toLowerCase().includes('name') || 
        col.toLowerCase().includes('leader')
      );
      console.log('Name-related columns:', nameColumns);
      
    } else {
      console.log('❌ Sheet is empty!');
    }
    
  } catch (error) {
    console.error('❌ Error inspecting workbook:', error);
  }
}

// Run the inspection
inspectWorkbook();
