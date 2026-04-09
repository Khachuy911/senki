function registerComponentHandlers(ipcMain, db) {
  ipcMain.handle('components:getAll', () => {
    return db.prepare('SELECT * FROM components ORDER BY component_code').all();
  });

  ipcMain.handle('components:create', (_, data) => {
    try {
      if (!data.component_code || !data.component_code.trim()) {
        return { success: false, message: 'Mã linh kiện là bắt buộc' };
      }
      // Check if component_code already exists
      const existing = db.prepare('SELECT id FROM components WHERE component_code = ?').get(data.component_code);
      if (existing) {
        return { success: false, message: 'Mã linh kiện đã tồn tại' };
      }
      const result = db.prepare(
        `INSERT INTO components (component_name, component_code, unit, unit_price, material, specification, color, identifying_features, pic_standard, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        data.component_name, data.component_code, data.unit || 'pcs', data.unit_price || 0,
        data.material || '', data.specification || '', data.color || '',
        data.identifying_features || '', data.pic_standard || '', data.note || ''
      );
      return { success: true, id: result.lastInsertRowid };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('components:update', (_, id, data) => {
    try {
      if (!data.component_code || !data.component_code.trim()) {
        return { success: false, message: 'Mã linh kiện là bắt buộc' };
      }
      // Check if component_code already exists for another component
      const existing = db.prepare('SELECT id FROM components WHERE component_code = ? AND id != ?').get(data.component_code, id);
      if (existing) {
        return { success: false, message: 'Mã linh kiện đã tồn tại' };
      }
      db.prepare(
        `UPDATE components SET component_name = ?, component_code = ?, unit = ?, unit_price = ?,
          material = ?, specification = ?, color = ?, identifying_features = ?, pic_standard = ?, note = ?,
          updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(
        data.component_name, data.component_code, data.unit || 'pcs', data.unit_price || 0,
        data.material || '', data.specification || '', data.color || '',
        data.identifying_features || '', data.pic_standard || '', data.note || '', id
      );
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('components:delete', (_, id) => {
    try {
      db.prepare('DELETE FROM components WHERE id = ?').run(id);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });
}

module.exports = { registerComponentHandlers };
