const bcrypt = require('bcryptjs');

function registerUserHandlers(ipcMain, db) {
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
}

module.exports = { registerUserHandlers };
