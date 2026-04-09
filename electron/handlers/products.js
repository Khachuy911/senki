function registerProductHandlers(ipcMain, db) {
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
    try {
      db.prepare('UPDATE products SET name = ?, code = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(data.name, data.code, data.category, id);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('products:delete', (_, id) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return { success: true };
  });
}

module.exports = { registerProductHandlers };
