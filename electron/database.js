const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

let db;

function getDb() {
  return db;
}

function initDatabase(app) {
  const dbPath = path.join(app.getPath('userData'), 'senki.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'engineer', 'user')),
      full_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bom_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      component_name TEXT NOT NULL,
      component_code TEXT,
      quantity INTEGER DEFAULT 1,
      unit TEXT DEFAULT 'pcs',
      unit_price REAL DEFAULT 0,
      vat_rate REAL DEFAULT 0.08,
      note TEXT,
      material TEXT,
      specification TEXT,
      color TEXT,
      identifying_features TEXT,
      pic_standard TEXT,
      contract_no TEXT,
      payment_status TEXT,
      order_date TEXT,
      needed_date TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_name TEXT NOT NULL,
      component_code TEXT UNIQUE,
      quantity INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      unit_price REAL DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      location TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE,
      customer_name TEXT,
      product_id INTEGER,
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivery_date DATETIME,
      assigned_to TEXT,
      note TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS purchasing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_name TEXT NOT NULL,
      component_code TEXT,
      quantity INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      pic TEXT,
      contract_no TEXT,
      payment_status TEXT DEFAULT 'Chưa thanh toán',
      order_date DATETIME,
      expected_date DATETIME,
      actual_quantity INTEGER DEFAULT 0,
      note TEXT,
      stocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT UNIQUE NOT NULL,
      product_id INTEGER,
      product_name TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      bom_item_id INTEGER,
      component_name TEXT NOT NULL,
      component_code TEXT,
      unit TEXT DEFAULT 'pcs',
      bom_quantity INTEGER NOT NULL,
      ordered_quantity INTEGER DEFAULT 0,
      requested_quantity INTEGER NOT NULL,
      unit_price REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_code TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference_id INTEGER,
      reference_type TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_code TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      purchase_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_name TEXT NOT NULL,
      component_code TEXT UNIQUE NOT NULL,
      unit TEXT DEFAULT 'pcs',
      unit_price REAL DEFAULT 0,
      material TEXT,
      specification TEXT,
      color TEXT,
      identifying_features TEXT,
      pic_standard TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ccdc_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ccdc_name TEXT NOT NULL,
      ccdc_code TEXT UNIQUE,
      quantity INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      min_stock INTEGER DEFAULT 5,
      location TEXT,
      status TEXT DEFAULT 'good',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Upgrade existing orders table
  try { db.exec('ALTER TABLE orders ADD COLUMN unit_price REAL DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN delivered_quantity INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN vat_rate REAL DEFAULT 0.08'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN vat_amount REAL DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN order_date DATETIME'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN payment_deadline DATETIME'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN customer_phone TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN customer_email TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN customer_address TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN shipping_fee REAL DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0'); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN inventory_deducted TEXT"); } catch (e) {}

  // Upgrade existing bom_items table
  try { db.exec("ALTER TABLE bom_items ADD COLUMN material TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN specification TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN color TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN identifying_features TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN pic_standard TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN contract_no TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN payment_status TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN order_date TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN needed_date TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN qty_ordered INTEGER DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE bom_items ADD COLUMN delivered_quantity INTEGER DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE purchasing ADD COLUMN stocked INTEGER DEFAULT 0"); } catch (e) {}

  // Create default admin if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)')
      .run('admin', hashedPassword, 'admin', 'Administrator');
  }

  return db;
}

module.exports = { getDb, initDatabase };
