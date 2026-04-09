const bcrypt = require('bcryptjs');

function registerAuthHandlers(ipcMain, db) {
  // AUTH
  ipcMain.handle('auth:login', (_, username, password) => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, message: 'Tài khoản không tồn tại' };
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return { success: false, message: 'Sai mật khẩu' };
    const { password: pwd, ...safeUser } = user;
    return { success: true, user: safeUser };
  });
}

module.exports = { registerAuthHandlers };
