function registerBomHandlers(ipcMain, db) {
  ipcMain.handle('bom:getByProduct', (_, productId) => {
    return db.prepare('SELECT * FROM bom_items WHERE product_id = ? ORDER BY id').all(productId);
  });

  ipcMain.handle('bom:create', (_, data) => {
    try {
      if (!data.component_code || !data.component_code.trim()) {
        return { success: false, message: 'Mã linh kiện là bắt buộc' };
      }
      const result = db.prepare(
        `INSERT INTO bom_items (product_id, component_name, component_code, quantity, unit, unit_price, vat_rate, note,
          material, specification, color, identifying_features, pic_standard, contract_no, payment_status, order_date, needed_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        data.product_id, data.component_name, data.component_code, data.quantity, data.unit, data.unit_price,
        data.vat_rate, data.note, data.material || '', data.specification || '', data.color || '',
        data.identifying_features || '', data.pic_standard || '', data.contract_no || '',
        data.payment_status || '', data.order_date || '', data.needed_date || ''
      );
      return { success: true, id: result.lastInsertRowid };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('bom:update', (_, id, data) => {
    // Handle partial updates - allow qty_ordered and delivered_quantity separately
    if (data.qty_ordered !== undefined) {
      db.prepare('UPDATE bom_items SET qty_ordered = ? WHERE id = ?').run(data.qty_ordered, id);
      return { success: true };
    }
    if (data.delivered_quantity !== undefined) {
      db.prepare('UPDATE bom_items SET delivered_quantity = ? WHERE id = ?').run(data.delivered_quantity, id);
      return { success: true };
    }
    if (data.quantity !== undefined) {
      db.prepare('UPDATE bom_items SET quantity = ? WHERE id = ?').run(data.quantity, id);
      return { success: true };
    }
    if (!data.component_code || !data.component_code.trim()) {
      return { success: false, message: 'Mã linh kiện là bắt buộc' };
    }
    db.prepare(
      `UPDATE bom_items SET component_name = ?, component_code = ?, quantity = ?, unit = ?, unit_price = ?, vat_rate = ?, note = ?,
        material = ?, specification = ?, color = ?, identifying_features = ?, pic_standard = ?, contract_no = ?,
        payment_status = ?, order_date = ?, needed_date = ? WHERE id = ?`
    ).run(
      data.component_name, data.component_code, data.quantity, data.unit, data.unit_price, data.vat_rate, data.note,
      data.material || '', data.specification || '', data.color || '', data.identifying_features || '',
      data.pic_standard || '', data.contract_no || '', data.payment_status || '',
      data.order_date || '', data.needed_date || '', id
    );
    return { success: true };
  });

  ipcMain.handle('bom:delete', (_, id) => {
    db.prepare('DELETE FROM bom_items WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('bom:copyFromProduct', (_, sourceProductId, targetProductId) => {
    try {
      const sourceItems = db.prepare('SELECT * FROM bom_items WHERE product_id = ?').all(sourceProductId);
      const insert = db.prepare(
        `INSERT INTO bom_items (product_id, component_name, component_code, quantity, unit, unit_price, vat_rate, note,
          material, specification, color, identifying_features, pic_standard, contract_no, payment_status, order_date, needed_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const copyAll = db.transaction((items) => {
        for (const item of items) {
          insert.run(targetProductId, item.component_name, item.component_code, item.quantity, item.unit,
            item.unit_price, item.vat_rate, item.note, item.material || '', item.specification || '',
            item.color || '', item.identifying_features || '', item.pic_standard || '', item.contract_no || '',
            item.payment_status || '', item.order_date || '', item.needed_date || ''
          );
        }
      });
      copyAll(sourceItems);
      return { success: true, count: sourceItems.length };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });
}

module.exports = { registerBomHandlers };
