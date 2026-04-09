const XLSX = require('xlsx');

function registerMiscHandlers(ipcMain, db) {
  // Dashboard
  ipcMain.handle('dashboard:stats', () => {
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const inventory = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_stock').get();
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get();
    const processingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'processing'").get();
    return {
      products: products.count,
      orders: orders.count,
      inventory: inventory.count,
      lowStock: lowStock.count,
      pendingOrders: pendingOrders.count,
      processingOrders: processingOrders.count
    };
  });

  // Excel Import
  ipcMain.handle('excel:import', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }] });
    if (result.canceled) return { success: false, message: 'Cancelled' };
    try {
      const workbook = XLSX.readFile(result.filePaths[0]);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      return { success: true, data };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  // Excel Export Orders
  ipcMain.handle('excel:exportOrders', async () => {
    try {
      const orders = db.prepare(`
        SELECT o.*, p.name as product_name, p.code as product_code
        FROM orders o LEFT JOIN products p ON o.product_id = p.id
        ORDER BY o.id DESC
      `).all();
      const ws = XLSX.utils.json_to_sheet(orders);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      const filePath = path.join(app.getPath('documents'), `orders_export_${Date.now()}.xlsx`);
      XLSX.writeFile(wb, filePath);
      return { success: true, filePath };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  // Clear All Data
  ipcMain.handle('data:clearAll', () => {
    try {
      if (!db) return { success: false, message: 'Database not initialized' };
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
      return { success: false, message: e.message };
    }
  });
}

module.exports = { registerMiscHandlers };
