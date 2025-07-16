const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Read the CSV file
const csvFilePath = path.join(__dirname, '..', 'mapping.csv');
const outputFilePath = path.join(__dirname, '..', 'public', 'data', 'bihar_assemblies.json');

try {
  // Read the CSV file
  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  
  // Parse the CSV data
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true
  });
  
  // Filter records for Bihar (state_code: 'BR') and extract unique assembly names
  const biharAssemblies = records
    .filter(record => record.state_code === 'BR')
    .map(record => record.as_name)
    .filter(Boolean); // Remove any empty values
  
  // Remove duplicates
  const uniqueAssemblies = [...new Set(biharAssemblies)].sort();
  
  // Create directory if it doesn't exist
  const dirPath = path.dirname(outputFilePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Write the data to a JSON file
  fs.writeFileSync(
    outputFilePath,
    JSON.stringify(uniqueAssemblies, null, 2)
  );
  
  console.log(`Successfully extracted ${uniqueAssemblies.length} Bihar assemblies to ${outputFilePath}`);
} catch (error) {
  console.error('Error processing the CSV file:', error);
} 