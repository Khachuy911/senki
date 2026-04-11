function registerPurchasingHandlers(ipcMain, db) {
  ipcMain.handle('purchasing:getAll', () => {
    return db.prepare('SELECT * FROM purchasing ORDER BY id DESC').all();
  });

  ipcMain.handle('purchasing:createMultiple', (_, items) => {
    try {
      const today = new Date();
      const year = today.getFullYear();
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
              requestId, item.component_name, item.component_code, item.unit,
              item.total_required || item.shortage, 0, item.shortage, item.unit_price || 0
            );
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
    db.prepare(
      'UPDATE purchasing SET pic = ?, contract_no = ?, payment_status = ?, expected_date = ?, actual_quantity = ?, note = ? WHERE id = ?'
    ).run(data.pic, data.contract_no, data.payment_status, data.expected_date, data.actual_quantity, data.note, id);
    return { success: true };
  });

  ipcMain.handle('purchasing:addToStock', (_, id) => {
    const purchase = db.prepare('SELECT * FROM purchasing WHERE id = ?').get(id);
    if (!purchase) return { success: false, message: 'Không tìm thấy đơn mua hàng' };
    if (purchase.stocked === 1) return { success: false, message: 'Đã nhập kho rồi' };
    const excess = (purchase.actual_quantity || 0) - (purchase.quantity || 0);
    if (excess <= 0) return { success: false, message: 'Không có số lượng thừa' };

    // Kiem tra ton tai linh kien trong kho
    const inv = db.prepare('SELECT id FROM inventory WHERE component_code = ?').get(purchase.component_code);
    if (inv) {
      db.prepare('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE component_code = ?')
        .run(excess, purchase.component_code);
    } else {
      db.prepare(
        'INSERT INTO inventory (component_name, component_code, quantity, unit, unit_price, min_stock, location) VALUES (?, ?, ?, ?, 0, 0, ?)'
      ).run(purchase.component_name, purchase.component_code, excess, purchase.unit || 'pcs', '');
    }
    db.prepare(
      'INSERT INTO inventory_transactions (component_code, type, quantity, reference_id, reference_type, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(purchase.component_code, 'purchase_add', excess, id, 'purchase', `Nhận hàng từ PO (thừa ${excess})`);
    db.prepare("UPDATE purchase_reservations SET status = 'received' WHERE purchase_id = ? AND status = 'pending'").run(id);
    db.prepare('UPDATE purchasing SET stocked = 1 WHERE id = ?').run(id);
    return { success: true, excess };
  });

  ipcMain.handle('purchasing:delete', (_, id) => {
    const purchase = db.prepare('SELECT * FROM purchasing WHERE id = ?').get(id);
    if (purchase) {
      db.prepare('DELETE FROM purchase_reservations WHERE purchase_id = ?').run(id);
      db.prepare('DELETE FROM purchasing WHERE id = ?').run(id);
    }
    return { success: true };
  });

  // Purchase Requests
  ipcMain.handle('purchase_requests:getAll', () => {
    const requests = db.prepare(`
      SELECT pr.*, p.name as product_name, p.code as product_code
      FROM purchase_requests pr LEFT JOIN products p ON pr.product_id = p.id
      ORDER BY pr.id DESC
    `).all();
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
      FROM purchase_requests pr LEFT JOIN products p ON pr.product_id = p.id
      WHERE pr.product_id = ? ORDER BY pr.id DESC
    `).all(productId);
    for (const req of requests) {
      const items = db.prepare('SELECT * FROM purchase_request_items WHERE request_id = ?').all(req.id);
      req.items = items;
    }
    return requests;
  });

  ipcMain.handle('purchase_requests:delete', (_, id) => {
    db.prepare('DELETE FROM purchase_requests WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('purchase_requests:updateStatus', (_, id, status) => {
    db.prepare('UPDATE purchase_requests SET status = ? WHERE id = ?').run(status, id);
    return { success: true };
  });
}

module.exports = { registerPurchasingHandlers };
