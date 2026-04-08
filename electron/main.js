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
      -- New fields for purchasing tracking
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
  const { password: pwd, ...safeUser } = user;
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
    'INSERT INTO bom_items (product_id, component_name, component_code, quantity, unit, unit_price, vat_rate, note, material, specification, color, identifying_features, pic_standard, contract_no, payment_status, order_date, needed_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(data.product_id, data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.vat_rate, data.note, data.material || '', data.specification || '', data.color || '', data.identifying_features || '', data.pic_standard || '', data.contract_no || '', data.payment_status || '', data.order_date || '', data.needed_date || '');
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('bom:update', (_, id, data) => {
  db.prepare(
    'UPDATE bom_items SET component_name = ?, component_code = ?, quantity = ?, unit = ?, unit_price = ?, vat_rate = ?, note = ?, material = ?, specification = ?, color = ?, identifying_features = ?, pic_standard = ?, contract_no = ?, payment_status = ?, order_date = ?, needed_date = ? WHERE id = ?'
  ).run(data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.vat_rate, data.note, data.material || '', data.specification || '', data.color || '', data.identifying_features || '', data.pic_standard || '', data.contract_no || '', data.payment_status || '', data.order_date || '', data.needed_date || '', id);
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

ipcMain.handle('inventory:adjust', (_, data) => {
  // data = { component_code, quantity_change, note }
  // quantity_change can be positive (add) or negative (deduct)
  try {
    // Update inventory
    db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE component_code = ?')
      .run(data.quantity_change, data.component_code);

    // Log transaction
    const type = data.quantity_change > 0 ? 'manual_add' : 'manual_deduct';
    db.prepare(
      'INSERT INTO inventory_transactions (component_code, type, quantity, reference_type, note) VALUES (?, ?, ?, ?, ?)'
    ).run(data.component_code, type, Math.abs(data.quantity_change), 'manual', data.note || 'Điều chỉnh tay');

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('inventory:autoStock', (_, data) => {
  // data = { component_code, component_name, quantity, unit, note }
  // Auto-add to inventory: create if not exists, update if exists
  try {
    const existing = db.prepare('SELECT id, quantity FROM inventory WHERE component_code = ?').get(data.component_code);
    if (existing) {
      db.prepare('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE component_code = ?')
        .run(data.quantity, data.component_code);
    } else {
      db.prepare(
        'INSERT INTO inventory (component_name, component_code, quantity, unit, unit_price, min_stock, location) VALUES (?, ?, ?, ?, 0, 0, ?)'
      ).run(data.component_name, data.component_code, data.quantity, data.unit, data.location || '');
    }
    db.prepare(
      'INSERT INTO inventory_transactions (component_code, type, quantity, reference_type, note) VALUES (?, ?, ?, ?, ?)'
    ).run(data.component_code, 'auto_stock', data.quantity, 'over_delivery', data.note || 'Tự động cập nhật từ mua hàng vượt đơn');
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('inventory:getPendingReservations', () => {
  // Get sum of pending purchase reservations
  return db.prepare(`
    SELECT component_code, SUM(quantity) as pending_qty
    FROM purchase_reservations
    WHERE status = 'pending'
    GROUP BY component_code
  `).all();
});

// ORDERS
ipcMain.handle('orders:getAll', () => {
  return db.prepare(`
    SELECT o.*, p.name as product_name, p.code as product_code
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.id DESC
  `).all();
});

ipcMain.handle('orders:create', (_, data) => {
  try {
    const result = db.prepare(
      'INSERT INTO orders (order_code, customer_name, product_id, quantity, unit_price, total_price, status, order_date, delivery_date, payment_deadline, assigned_to, note, delivered_quantity, vat_rate, vat_amount, customer_phone, customer_email, customer_address, shipping_fee, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(data.order_code, data.customer_name, data.product_id, data.quantity, data.unit_price || 0, data.total_price, data.status, data.order_date, data.delivery_date, data.payment_deadline, data.assigned_to, data.note, data.delivered_quantity || 0, data.vat_rate || 0.08, data.vat_amount || 0, data.customer_phone || '', data.customer_email || '', data.customer_address || '', data.shipping_fee || 0, data.discount || 0);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('orders:update', (_, id, data) => {
  // Get old order data for comparison
  const oldOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  const oldStatus = oldOrder ? oldOrder.status : '';
  const newStatus = data.status;

  // Perform update
  db.prepare(
    'UPDATE orders SET order_code = ?, customer_name = ?, product_id = ?, quantity = ?, unit_price = ?, total_price = ?, status = ?, order_date = ?, delivery_date = ?, payment_deadline = ?, assigned_to = ?, note = ?, delivered_quantity = ?, vat_rate = ?, vat_amount = ?, customer_phone = ?, customer_email = ?, customer_address = ?, shipping_fee = ?, discount = ? WHERE id = ?'
  ).run(data.order_code, data.customer_name, data.product_id, data.quantity, data.unit_price || 0, data.total_price, data.status, data.order_date, data.delivery_date, data.payment_deadline, data.assigned_to, data.note, data.delivered_quantity, data.vat_rate, data.vat_amount, data.customer_phone || '', data.customer_email || '', data.customer_address || '', data.shipping_fee || 0, data.discount || 0, id);

  // If status changed to 'processing', deduct inventory
  if (oldStatus !== 'processing' && newStatus === 'processing') {
    // Get BOM items for this product
    const bomItems = db.prepare('SELECT * FROM bom_items WHERE product_id = ?').all(data.product_id);
    for (const bom of bomItems) {
      const deductQty = bom.quantity * data.quantity;
      // Deduct from inventory
      db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE component_code = ?')
        .run(deductQty, bom.component_code);
      // Log transaction
      db.prepare(
        'INSERT INTO inventory_transactions (component_code, type, quantity, reference_id, reference_type, note) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(bom.component_code, 'order_deduct', deductQty, id, 'order', `Đơn hàng ${data.order_code} - SX`);
    }
  }

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

// PURCHASING
ipcMain.handle('purchasing:getAll', () => {
  return db.prepare('SELECT * FROM purchasing ORDER BY id DESC').all();
});

ipcMain.handle('purchasing:createMultiple', (_, items) => {
  try {
    // Create purchase request header
    const today = new Date();
    const year = today.getFullYear();
    // Get last request code to generate next number
    const lastRequest = db.prepare(
      "SELECT request_code FROM purchase_requests WHERE request_code LIKE ? ORDER BY id DESC LIMIT 1"
    ).get(`PR-${year}-%`);
    let seqNum = 1;
    if (lastRequest) {
      const lastNum = parseInt(lastRequest.request_code.split('-')[2]);
      seqNum = lastNum + 1;
    }
    const requestCode = `PR-${year}-${String(seqNum).padStart(4, '0')}`;

    const insertRequest = db.prepare(
      `INSERT INTO purchase_requests (request_code, status, created_at) VALUES (?, 'pending', CURRENT_TIMESTAMP)`
    );
    const requestResult = insertRequest.run(requestCode);
    const requestId = requestResult.lastInsertRowid;

    // Insert items into purchasing and link to request
    const insertPurchase = db.prepare(
      `INSERT INTO purchasing (component_name, component_code, quantity, unit, order_date, expected_date, pic, note)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, date('now', '+7 days'), 'Phòng Thu Mua', ?)`
    );

    const insertRequestItem = db.prepare(
      `INSERT INTO purchase_request_items (request_id, component_name, component_code, unit, bom_quantity, ordered_quantity, requested_quantity, unit_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    );

    const createAll = db.transaction((items) => {
      for (const item of items) {
        if (item.shortage > 0) {
          insertPurchase.run(item.component_name, item.component_code, item.shortage, item.unit, `PR: ${requestCode}`);
          const purchaseId = db.prepare('SELECT last_insert_rowid() as id').get();
          insertRequestItem.run(
            requestId,
            item.component_name,
            item.component_code,
            item.unit,
            item.total_required || item.shortage,
            0,
            item.shortage,
            item.unit_price || 0
          );
          // Create purchase reservation
          db.prepare(
            'INSERT INTO purchase_reservations (component_code, quantity, purchase_id, status) VALUES (?, ?, ?, ?)'
          ).run(item.component_code, item.shortage, purchaseId.lastInsertRowid, 'pending');
        }
      }
    });

    createAll(items);
    return { success: true, request_code: requestCode, request_id: requestId };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('purchasing:update', (_, id, data) => {
  // Get old data to calculate quantity change
  const oldPurchase = db.prepare('SELECT * FROM purchasing WHERE id = ?').get(id);
  const oldActualQty = oldPurchase ? oldPurchase.actual_quantity : 0;
  const newActualQty = data.actual_quantity || 0;

  // Perform update
  db.prepare(
    'UPDATE purchasing SET pic = ?, contract_no = ?, payment_status = ?, expected_date = ?, actual_quantity = ?, note = ? WHERE id = ?'
  ).run(data.pic, data.contract_no, data.payment_status, data.expected_date, newActualQty, data.note, id);

  // If actual_quantity increased, add to inventory and mark reservation received
  const qtyDiff = newActualQty - oldActualQty;
  if (qtyDiff > 0 && oldPurchase) {
    db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE component_code = ?')
      .run(qtyDiff, oldPurchase.component_code);
    // Log transaction
    db.prepare(
      'INSERT INTO inventory_transactions (component_code, type, quantity, reference_id, reference_type, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(oldPurchase.component_code, 'purchase_add', qtyDiff, id, 'purchase', `Nhận hàng từ PO`);
    // Mark reservation as received
    db.prepare(
      "UPDATE purchase_reservations SET status = 'received' WHERE purchase_id = ? AND status = 'pending'"
    ).run(id);
  }

  return { success: true };
});

ipcMain.handle('purchasing:delete', (_, id) => {
  // Get purchase info before deleting for audit
  const purchase = db.prepare('SELECT * FROM purchasing WHERE id = ?').get(id);
  if (purchase) {
    // Delete associated purchase reservations (reserved quantity in planning)
    db.prepare('DELETE FROM purchase_reservations WHERE purchase_id = ?').run(id);
    // Delete the purchase order
    db.prepare('DELETE FROM purchasing WHERE id = ?').run(id);
  }
  return { success: true };
});

// PURCHASE REQUESTS
ipcMain.handle('purchase_requests:getAll', () => {
  const requests = db.prepare(`
    SELECT pr.*, p.name as product_name, p.code as product_code
    FROM purchase_requests pr
    LEFT JOIN products p ON pr.product_id = p.id
    ORDER BY pr.id DESC
  `).all();

  // Get items for each request
  for (const req of requests) {
    const items = db.prepare('SELECT * FROM purchase_request_items WHERE request_id = ?').all(req.id);
    req.items = items;
    req.total_items = items.length;
    req.total_quantity = items.reduce((sum, item) => sum + item.requested_quantity, 0);
  }
  return requests;
});

ipcMain.handle('purchase_requests:getByProduct', (_, productId) => {
  const requests = db.prepare(`
    SELECT pr.*, p.name as product_name
    FROM purchase_requests pr
    LEFT JOIN products p ON pr.product_id = p.id
    WHERE pr.product_id = ?
    ORDER BY pr.id DESC
  `).all(productId);

  for (const req of requests) {
    const items = db.prepare('SELECT * FROM purchase_request_items WHERE request_id = ?').all(req.id);
    req.items = items;
  }
  return requests;
});

ipcMain.handle('purchase_requests:delete', (_, id) => {
  // Delete will cascade to purchase_request_items due to foreign key
  db.prepare('DELETE FROM purchase_requests WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('purchase_requests:updateStatus', (_, id, status) => {
  db.prepare('UPDATE purchase_requests SET status = ? WHERE id = ?').run(status, id);
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

// EXCEL EXPORT
ipcMain.handle('excel:exportOrders', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Lưu file Excel đơn hàng',
    defaultPath: `don-hang-${new Date().toISOString().split('T')[0]}.xlsx`,
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
  });

  if (result.canceled || !result.filePath) return { success: false, canceled: true };

  try {
    const orders = db.prepare(`
      SELECT o.*, p.name as product_name, p.code as product_code
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      ORDER BY o.id DESC
    `).all();

    const data = orders.map(o => ({
      'Mã đơn hàng': o.order_code,
      'Khách hàng': o.customer_name,
      'Sản phẩm': o.product_name || '',
      'Mã SP': o.product_code || '',
      'Số lượng': o.quantity,
      'Đơn giá': o.unit_price,
      'Thành tiền': o.total_price,
      'VAT (%)': (o.vat_rate || 0.08) * 100,
      'Tiền VAT': o.total_price * (o.vat_rate || 0.08),
      'Phí ship': o.shipping_fee || 0,
      'Giảm giá': o.discount || 0,
      'Tổng cộng': o.total_price * (1 + (o.vat_rate || 0.08)) + (o.shipping_fee || 0) - (o.discount || 0),
      'Đã giao': o.delivered_quantity || 0,
      'Còn lại': Math.max(0, o.quantity - (o.delivered_quantity || 0)),
      'Trạng thái': o.status === 'pending' ? 'Chờ xử lý' : o.status === 'processing' ? 'Đang sản xuất' : o.status === 'completed' ? 'Hoàn thành' : 'Đã hủy',
      'Ngày đặt': o.order_date || '',
      'Ngày giao': o.delivery_date || '',
      'Ngày trả': o.payment_deadline || '',
      'Ghi chú': o.note || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 20 },
    ];

    XLSX.writeFile(wb, result.filePath);
    return { success: true, filePath: result.filePath };
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

// BOM COPY - Copy BOM from one product to another
ipcMain.handle('bom:copyFromProduct', (_, sourceProductId, targetProductId) => {
  const sourceItems = db.prepare('SELECT * FROM bom_items WHERE product_id = ?').all(sourceProductId);
  if (sourceItems.length === 0) return { success: false, message: 'Sản phẩm nguồn không có BOM' };

  const insert = db.prepare(
    'INSERT INTO bom_items (product_id, component_name, component_code, quantity, unit, unit_price, vat_rate, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const copyAll = db.transaction(() => {
    for (const item of sourceItems) {
      insert.run(targetProductId, item.component_name, item.component_code, item.quantity, item.unit, item.unit_price, item.vat_rate, item.note);
    }
  });

  try {
    copyAll();
    return { success: true, count: sourceItems.length };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// MRP - Material Requirement Planning
ipcMain.handle('mrp:calculate', (_, planItems) => {
  // planItems = [{ product_id, quantity }, ...]
  // Step 1: Aggregate total material needs across all products in the plan
  const materialNeeds = {};

  for (const planItem of planItems) {
    const bomItems = db.prepare('SELECT * FROM bom_items WHERE product_id = ?').all(planItem.product_id);
    for (const bom of bomItems) {
      const key = bom.component_code || bom.component_name;
      if (!materialNeeds[key]) {
        materialNeeds[key] = {
          component_name: bom.component_name,
          component_code: bom.component_code,
          unit: bom.unit,
          unit_price: bom.unit_price,
          total_required: 0,
          details: [],
        };
      }
      const qty = bom.quantity * planItem.quantity;
      materialNeeds[key].total_required += qty;
      // Track which product needs how much
      const product = db.prepare('SELECT name FROM products WHERE id = ?').get(planItem.product_id);
      materialNeeds[key].details.push({
        product_name: product ? product.name : `ID:${planItem.product_id}`,
        bom_qty: bom.quantity,
        plan_qty: planItem.quantity,
        subtotal: qty,
      });
    }
  }

  // Step 2: Compare with inventory AND pending reservations
  const results = [];
  for (const key of Object.keys(materialNeeds)) {
    const need = materialNeeds[key];
    let inStock = 0;
    let pendingReservation = 0;
    if (need.component_code) {
      // Get inventory stock
      const inv = db.prepare('SELECT quantity FROM inventory WHERE component_code = ?').get(need.component_code);
      if (inv) inStock = inv.quantity;
      // Get pending reservation from purchase_reservations table
      const reservation = db.prepare(
        `SELECT COALESCE(SUM(quantity), 0) as pending FROM purchase_reservations WHERE component_code = ? AND status = 'pending'`
      ).get(need.component_code);
      pendingReservation = reservation ? reservation.pending : 0;
    }
    const shortage = Math.max(0, need.total_required - inStock - pendingReservation);
    results.push({
      component_name: need.component_name,
      component_code: need.component_code,
      unit: need.unit,
      unit_price: need.unit_price,
      total_required: need.total_required,
      in_stock: inStock,
      already_ordered: pendingReservation,
      shortage: shortage,
      estimated_cost: shortage * (need.unit_price || 0),
      details: need.details,
    });
  }

  return results;
});

// CLEAR ALL DATA
ipcMain.handle('data:clearAll', () => {
  try {
    if (!db) {
      return { success: false, message: 'Database not initialized' };
    }
    db.exec('DELETE FROM purchase_request_items');
    db.exec('DELETE FROM purchase_requests');
    db.exec('DELETE FROM purchasing');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM inventory');
    db.exec('DELETE FROM bom_items');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM audit_logs');
    return { success: true, message: 'Đã xóa toàn bộ dữ liệu' };
  } catch (e) {
    console.error('Clear data error:', e);
    return { success: false, message: e.message };
  }
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
