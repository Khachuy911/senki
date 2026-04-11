const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const dbPath = 'C:\\Users\\Nguyen Khac Huy\\AppData\\Roaming\\senki-bom-manager\\senki.db';
  if (!fs.existsSync(dbPath)) {
    console.log('Database not found');
    return;
  }
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Check all purchasing rows with excess
  const rows = db.exec("SELECT id, component_code, quantity, actual_quantity, stocked FROM purchasing");
  console.log('All purchasing rows:', JSON.stringify(rows, null, 2));

  // Force set stocked = 1 for any row where actual > quantity
  db.run("UPDATE purchasing SET stocked = 1 WHERE actual_quantity > quantity AND (stocked IS NULL OR stocked != 1)");

  // Verify
  const verify = db.exec("SELECT id, component_code, stocked FROM purchasing WHERE actual_quantity > quantity");
  console.log('After update:', JSON.stringify(verify, null, 2));

  fs.writeFileSync(dbPath, db.export());
  db.close();
  console.log('Done');
}).catch(e => console.error('Error:', e));