function registerInventoryHandlers(ipcMain, db) {
  ipcMain.handle('inventory:getAll', () => {
    return db.prepare('SELECT * FROM inventory ORDER BY id DESC').all();
  });

  ipcMain.handle('inventory:create', (_, data) => {
    try {
      if (!data.component_code || !data.component_code.trim()) {
        return { success: false, message: 'Mã linh kiện là bắt buộc' };
      }
      const result = db.prepare(
        'INSERT INTO inventory (component_name, component_code, quantity, unit, unit_price, min_stock, location) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.min_stock, data.location);
      return { success: true, id: result.lastInsertRowid };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('inventory:update', (_, id, data) => {
    if (!data.component_code || !data.component_code.trim()) {
      return { success: false, message: 'Mã linh kiện là bắt buộc' };
    }
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
    try {
      if (!data.component_code || !data.component_code.trim()) {
        return { success: false, message: 'Mã linh kiện là bắt buộc' };
      }
      const current = db.prepare('SELECT quantity FROM inventory WHERE component_code = ?').get(data.component_code);
      if (!current) {
        return { success: false, message: 'Linh kiện không tồn tại trong kho' };
      }
      const newQty = current.quantity + data.quantity_change;
      if (newQty < 0) {
        return { success: false, message: 'Số lượng tồn kho không đủ (hiện tại: ' + current.quantity + ')' };
      }
      db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE component_code = ?')
        .run(data.quantity_change, data.component_code);
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
    return db.prepare(`
      SELECT component_code, SUM(quantity) as pending_qty
      FROM purchase_reservations WHERE status = 'pending'
      GROUP BY component_code
    `).all();
  });

  // Auto-deduct inventory when delivered quantity is entered
  ipcMain.handle('inventory:deductOnDelivery', (_, data) => {
    try {
      const { component_code, quantity } = data;
      if (!component_code || !quantity || quantity <= 0) {
        return { success: false, message: 'Thông tin không hợp lệ' };
      }
      const current = db.prepare('SELECT * FROM inventory WHERE component_code = ?').get(component_code);
      if (!current) {
        return { success: false, message: 'Linh kiện không tồn tại trong kho' };
      }
      if (current.quantity < quantity) {
        return { success: false, message: `Số lượng tồn kho không đủ (hiện tại: ${current.quantity})` };
      }
      // Use transaction for safety
      const deduct = db.transaction(() => {
        db.prepare('UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE component_code = ?')
          .run(quantity, component_code);
        db.prepare(
          'INSERT INTO inventory_transactions (component_code, type, quantity, reference_type, note) VALUES (?, ?, ?, ?, ?)'
        ).run(component_code, 'auto_deduct', quantity, 'delivery', 'Tự động trừ từ giao hàng');
      });
      deduct();
      return { success: true, remaining: current.quantity - quantity };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });
}

module.exports = { registerInventoryHandlers };
