const XLSX = require('xlsx');
const path = require('path');

function registerMiscHandlers(ipcMain, db, app) {
  // Case Overview - aggregated stats for BOM cases
  ipcMain.handle('dashboard:caseOverview', () => {
    try {
      // Get total stats
      const totalTypes = db.prepare(`
        SELECT COUNT(DISTINCT component_code) as count FROM bom_items
      `).get();

      // Purchased: delivered_quantity >= quantity (fully delivered)
      const purchased = db.prepare(`
        SELECT COUNT(*) as count FROM bom_items
        WHERE delivered_quantity >= quantity AND delivered_quantity > 0
      `).get();

      // Pending: delivered_quantity < quantity AND delivered_quantity > 0
      const pending = db.prepare(`
        SELECT COUNT(*) as count FROM bom_items
        WHERE delivered_quantity < quantity AND delivered_quantity > 0
      `).get();

      // Out of stock: delivered_quantity = 0 AND exists in purchasing
      const outOfStock = db.prepare(`
        SELECT COUNT(DISTINCT bi.id) as count FROM bom_items bi
        WHERE bi.delivered_quantity = 0
        AND EXISTS (SELECT 1 FROM purchasing p WHERE p.component_code = bi.component_code)
      `).get();

      // By case breakdown
      const byCase = db.prepare(`
        SELECT
          p.id, p.name, p.code,
          COUNT(DISTINCT bi.id) as total_items,
          COUNT(DISTINCT bi.component_code) as total_types,
          SUM(CASE WHEN bi.delivered_quantity >= bi.quantity THEN 1 ELSE 0 END) as purchased,
          SUM(CASE WHEN bi.delivered_quantity < bi.quantity AND bi.delivered_quantity > 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN bi.delivered_quantity = 0 AND EXISTS(
            SELECT 1 FROM purchasing pc
            WHERE pc.component_code = bi.component_code
          ) THEN 1 ELSE 0 END) as out_of_stock
        FROM products p
        JOIN bom_items bi ON p.id = bi.product_id
        GROUP BY p.id
        ORDER BY p.name
      `).all();

      return {
        totalTypes: totalTypes.count,
        purchased: purchased.count,
        pending: pending.count,
        outOfStock: outOfStock.count,
        byCase: byCase
      };
    } catch (e) {
      console.error('Error in getCaseOverview:', e);
      return {
        totalTypes: 0,
        purchased: 0,
        pending: 0,
        outOfStock: 0,
        byCase: []
      };
    }
  });

  // Dashboard
  ipcMain.handle('dashboard:stats', () => {
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const components = db.prepare('SELECT COUNT(*) as count FROM components').get();
    const bomItems = db.prepare('SELECT COUNT(*) as count FROM bom_items').get();
    const inventory = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_stock').get();
    const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get();
    const processingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'processing'").get();
    const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get();
    const purchases = db.prepare('SELECT COUNT(*) as count FROM purchasing').get();
    // Components in BOM but not in inventory
    const inBomNotInv = db.prepare(`
      SELECT COUNT(DISTINCT bi.component_code) as count FROM bom_items bi
      LEFT JOIN inventory i ON bi.component_code = i.component_code
      WHERE i.id IS NULL
    `).get();
    return {
      products: products.count,
      components: components.count,
      bomItems: bomItems.count,
      inventory: inventory.count,
      lowStock: lowStock.count,
      orders: orders.count,
      pendingOrders: pendingOrders.count,
      processingOrders: processingOrders.count,
      completedOrders: completedOrders.count,
      purchases: purchases.count,
      inBomNotInv: inBomNotInv.count
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
      const { dialog } = require('electron');
      const result = await dialog.showSaveDialog({
        defaultPath: `orders_export_${Date.now()}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      });
      if (result.canceled) return { canceled: true };
      const orders = db.prepare(`
        SELECT o.*, p.name as product_name, p.code as product_code
        FROM orders o LEFT JOIN products p ON o.product_id = p.id
        ORDER BY o.id DESC
      `).all();
      const ws = XLSX.utils.json_to_sheet(orders);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, result.filePath);
      return { success: true, filePath: result.filePath };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  // Clear All Data (except components)
  ipcMain.handle('data:clearAll', () => {
    try {
      if (!db) return { success: false, message: 'Database not initialized' };
      db.exec('DELETE FROM purchase_request_items');
      db.exec('DELETE FROM purchase_requests');
      db.exec('DELETE FROM purchase_reservations');
      db.exec('DELETE FROM purchasing');
      db.exec('DELETE FROM inventory_transactions');
      db.exec('DELETE FROM inventory');
      db.exec('DELETE FROM orders');
      db.exec('DELETE FROM bom_items');
      db.exec('DELETE FROM products');
      db.exec('DELETE FROM audit_logs');
      // KEEP components table intact
      return { success: true, message: 'Đã xóa toàn bộ dữ liệu (giữ lại linh kiện)' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });
}

module.exports = { registerMiscHandlers };
