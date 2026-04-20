function registerCcdcHandlers(ipcMain, db) {
  ipcMain.handle('ccdc:getAll', () => {
    return db.prepare('SELECT * FROM ccdc_inventory ORDER BY id DESC').all();
  });

  ipcMain.handle('ccdc:create', (_, data) => {
    try {
      if (!data.ccdc_name || !data.ccdc_name.trim()) {
        return { success: false, message: 'Tên CCDC là bắt buộc' };
      }
      const result = db.prepare(
        'INSERT INTO ccdc_inventory (ccdc_name, ccdc_code, quantity, unit, min_stock, location, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(data.ccdc_name, data.ccdc_code, data.quantity, data.unit, data.min_stock, data.location, data.status, data.note);
      return { success: true, id: result.lastInsertRowid };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('ccdc:update', (_, id, data) => {
    if (!data.ccdc_name || !data.ccdc_name.trim()) {
      return { success: false, message: 'Tên CCDC là bắt buộc' };
    }
    db.prepare(
      'UPDATE ccdc_inventory SET ccdc_name = ?, ccdc_code = ?, quantity = ?, unit = ?, min_stock = ?, location = ?, status = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(data.ccdc_name, data.ccdc_code, data.quantity, data.unit, data.min_stock, data.location, data.status, data.note, id);
    return { success: true };
  });

  ipcMain.handle('ccdc:delete', (_, id) => {
    db.prepare('DELETE FROM ccdc_inventory WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('ccdc:adjust', (_, data) => {
    try {
      if (!data.ccdc_code || !data.ccdc_code.trim()) {
        return { success: false, message: 'Mã CCDC là bắt buộc' };
      }
      const current = db.prepare('SELECT quantity FROM ccdc_inventory WHERE ccdc_code = ?').get(data.ccdc_code);
      if (!current) {
        return { success: false, message: 'CCDC không tồn tại trong kho' };
      }
      const newQty = current.quantity + data.quantity_change;
      if (newQty < 0) {
        return { success: false, message: 'Số lượng tồn kho không đủ (hiện tại: ' + current.quantity + ')' };
      }
      db.prepare('UPDATE ccdc_inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE ccdc_code = ?')
        .run(data.quantity_change, data.ccdc_code);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('ccdc:autoDeduct', (_, data) => {
    try {
      if (!data.ccdc_code || !data.ccdc_code.trim()) {
        return { success: false, message: 'Mã CCDC là bắt buộc' };
      }
      const current = db.prepare('SELECT id, quantity FROM ccdc_inventory WHERE ccdc_code = ?').get(data.ccdc_code);
      if (!current) {
        return { success: false, message: 'CCDC không tồn tại trong kho' };
      }
      const newQty = current.quantity - data.quantity;
      if (newQty < 0) {
        return { success: false, message: 'Số lượng tồn kho không đủ (hiện tại: ' + current.quantity + ')' };
      }
      db.prepare('UPDATE ccdc_inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE ccdc_code = ?')
        .run(data.quantity, data.ccdc_code);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });
}

module.exports = { registerCcdcHandlers };