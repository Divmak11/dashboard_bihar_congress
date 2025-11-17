const XLSX = require('xlsx');
const path = require('path');

// Quick script to inspect the SLP training Excel file structure
function inspectExcel() {
  const excelPath = path.join(__dirname, '../slp_training.xlsx');
  
  console.log('📊 Inspecting slp_training.xlsx...\n');
  
  try {
    const workbook = XLSX.readFile(excelPath);
    
    console.log('Sheet Names:', workbook.SheetNames);
    console.log('Active Sheet:', workbook.SheetNames[0], '\n');
    
    // Read first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON to see structure
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log('Total Rows (excluding header):', data.length);
    console.log('\nColumn Headers:');
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    }
    
    console.log('\nFirst 3 Sample Rows:');
    data.slice(0, 3).forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`);
      console.log(JSON.stringify(row, null, 2));
    });
    
    // Check for common column name variations
    console.log('\n🔍 Checking for expected columns...');
    const firstRow = data[0] || {};
    const columns = Object.keys(firstRow);
    
    const nameColumn = columns.find(c => 
      /leader.*name|name/i.test(c)
    );
    const contactColumn = columns.find(c => 
      /contact|mobile|phone/i.test(c)
    );
    const assemblyColumn = columns.find(c => 
      /assembly|constituency/i.test(c)
    );
    
    console.log('Name Column:', nameColumn || 'NOT FOUND');
    console.log('Contact Column:', contactColumn || 'NOT FOUND');
    console.log('Assembly Column:', assemblyColumn || 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Error inspecting file:', error.message);
  }
}

inspectExcel();
