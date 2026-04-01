const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

let mainWindow;
let db;

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'senki.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
  `);

  // Create default admin if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)')
      .run('admin', hashedPassword, 'admin', 'Administrator');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    titleBarStyle: 'default',
    show: false,
  });

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// =================== IPC HANDLERS ===================

// AUTH
ipcMain.handle('auth:login', (_, username, password) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return { success: false, message: 'Tài khoản không tồn tại' };
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return { success: false, message: 'Sai mật khẩu' };
  const { password: _, ...safeUser } = user;
  return { success: true, user: safeUser };
});

// USERS
ipcMain.handle('users:getAll', () => {
  return db.prepare('SELECT id, username, role, full_name, created_at FROM users').all();
});

ipcMain.handle('users:create', (_, data) => {
  try {
    const hashed = bcrypt.hashSync(data.password, 10);
    db.prepare('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)')
      .run(data.username, hashed, data.role, data.full_name);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('users:delete', (_, id) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { success: true };
});

// PRODUCTS
ipcMain.handle('products:getAll', () => {
  return db.prepare('SELECT * FROM products ORDER BY id DESC').all();
});

ipcMain.handle('products:create', (_, data) => {
  try {
    const result = db.prepare('INSERT INTO products (name, code, category) VALUES (?, ?, ?)')
      .run(data.name, data.code, data.category);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('products:update', (_, id, data) => {
  db.prepare('UPDATE products SET name = ?, code = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(data.name, data.code, data.category, id);
  return { success: true };
});

ipcMain.handle('products:delete', (_, id) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return { success: true };
});

// BOM ITEMS
ipcMain.handle('bom:getByProduct', (_, productId) => {
  return db.prepare('SELECT * FROM bom_items WHERE product_id = ? ORDER BY id').all(productId);
});

ipcMain.handle('bom:create', (_, data) => {
  const result = db.prepare(
    'INSERT INTO bom_items (product_id, component_name, component_code, quantity, unit, unit_price, vat_rate, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(data.product_id, data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.vat_rate, data.note);
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('bom:update', (_, id, data) => {
  db.prepare(
    'UPDATE bom_items SET component_name = ?, component_code = ?, quantity = ?, unit = ?, unit_price = ?, vat_rate = ?, note = ? WHERE id = ?'
  ).run(data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.vat_rate, data.note, id);
  return { success: true };
});

ipcMain.handle('bom:delete', (_, id) => {
  db.prepare('DELETE FROM bom_items WHERE id = ?').run(id);
  return { success: true };
});

// INVENTORY
ipcMain.handle('inventory:getAll', () => {
  return db.prepare('SELECT * FROM inventory ORDER BY id DESC').all();
});

ipcMain.handle('inventory:create', (_, data) => {
  try {
    const result = db.prepare(
      'INSERT INTO inventory (component_name, component_code, quantity, unit, unit_price, min_stock, location) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.min_stock, data.location);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('inventory:update', (_, id, data) => {
  db.prepare(
    'UPDATE inventory SET component_name = ?, component_code = ?, quantity = ?, unit = ?, unit_price = ?, min_stock = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.min_stock, data.location, id);
  return { success: true };
});

ipcMain.handle('inventory:delete', (_, id) => {
  db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
  return { success: true };
});

// ORDERS
ipcMain.handle('orders:getAll', () => {
  return db.prepare(`
    SELECT o.*, p.name as product_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.id DESC
  `).all();
});

ipcMain.handle('orders:create', (_, data) => {
  try {
    const result = db.prepare(
      'INSERT INTO orders (order_code, customer_name, product_id, quantity, total_price, status, delivery_date, assigned_to, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(data.order_code, data.customer_name, data.product_id, data.quantity, data.total_price, data.status, data.delivery_date, data.assigned_to, data.note);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('orders:update', (_, id, data) => {
  db.prepare(
    'UPDATE orders SET order_code = ?, customer_name = ?, product_id = ?, quantity = ?, total_price = ?, status = ?, delivery_date = ?, assigned_to = ?, note = ? WHERE id = ?'
  ).run(data.order_code, data.customer_name, data.product_id, data.quantity, data.total_price, data.status, data.delivery_date, data.assigned_to, data.note, id);
  return { success: true };
});

ipcMain.handle('orders:delete', (_, id) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  return { success: true };
});

// AUDIT LOGS
ipcMain.handle('audit:getAll', () => {
  return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all();
});

ipcMain.handle('audit:log', (_, data) => {
  db.prepare(
    'INSERT INTO audit_logs (user_id, username, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(data.user_id, data.username, data.action, data.table_name, data.record_id, data.old_values, data.new_values);
  return { success: true };
});

// EXCEL IMPORT
ipcMain.handle('excel:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn file Excel để import',
    filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };

  try {
    const workbook = XLSX.readFile(result.filePaths[0]);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return { success: true, data, fileName: path.basename(result.filePaths[0]) };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// DASHBOARD STATS
ipcMain.handle('dashboard:stats', () => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const totalBomItems = db.prepare('SELECT COUNT(*) as count FROM bom_items').get().count;
  const totalInventory = db.prepare('SELECT COUNT(*) as count FROM inventory').get().count;
  const lowStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_stock').get().count;
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;
  return { totalProducts, totalBomItems, totalInventory, lowStock, totalOrders, pendingOrders };
});

// APP LIFECYCLE
app.whenReady().then(() => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
