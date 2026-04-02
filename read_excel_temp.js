const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile('Phần mềm Quản lý vật tư - BOM sx.xlsx');
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n================ SHEET: ${sheetName} ================`);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    // Print first 5 rows that have data
    let printed = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i].length > 0) {
        console.log(`Row ${i + 1}:`, data[i]);
        printed++;
        if (printed >= 10) break;
      }
    }
  });
} catch (error) {
  console.error("Error reading file:", error.message);
}
