function registerAuditHandlers(ipcMain, db) {
  ipcMain.handle('audit:getAll', () => {
    return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all();
  });

  ipcMain.handle('audit:log', (_, data) => {
    db.prepare(
      'INSERT INTO audit_logs (user_id, username, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(data.user_id, data.username, data.action, data.table_name, data.record_id, data.old_values, data.new_values);
    return { success: true };
  });
}

module.exports = { registerAuditHandlers };
