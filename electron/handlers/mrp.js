function registerMrpHandlers(ipcMain, db) {
  ipcMain.handle('mrp:calculate', (_, planItems) => {
    // planItems = [{ product_id, quantity }]
    const componentNeeds = {};

    for (const plan of planItems) {
      const bomItems = db.prepare('SELECT * FROM bom_items WHERE product_id = ?').all(plan.product_id);
      const product = db.prepare('SELECT name, code FROM products WHERE id = ?').get(plan.product_id);
      const productName = product ? product.name : `Product ${plan.product_id}`;
      const productCode = product ? product.code : '';

      for (const bom of bomItems) {
        const key = bom.component_code || bom.component_name;
        if (!componentNeeds[key]) {
          componentNeeds[key] = {
            component_code: bom.component_code,
            component_name: bom.component_name,
            total_required: 0,
            in_stock: 0,
            unit: bom.unit,
            unit_price: bom.unit_price,
            details: []
          };
        }
        const subtotal = bom.quantity * plan.quantity;
        componentNeeds[key].total_required += subtotal;
        componentNeeds[key].details.push({
          product_id: plan.product_id,
          product_name: productName,
          product_code: productCode,
          bom_qty: bom.quantity,
          plan_qty: plan.quantity,
          subtotal
        });
      }
    }

    // Get stock levels
    const inventory = db.prepare('SELECT * FROM inventory').all();
    const inventoryMap = {};
    for (const inv of inventory) {
      inventoryMap[inv.component_code || inv.component_name] = inv.quantity;
    }

    const results = [];
    for (const key of Object.keys(componentNeeds)) {
      const need = componentNeeds[key];
      need.in_stock = inventoryMap[key] || 0;
      // shortage = total_required - in_stock (moi don hang tinh rieng, khong tinh chung purchase_reservations)
      const shortage = Math.max(0, need.total_required - need.in_stock);
      need.shortage = shortage;
      need.estimated_cost = shortage * (need.unit_price || 0);
      results.push(need);
    }

    return results;
  });
}

module.exports = { registerMrpHandlers };
