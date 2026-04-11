function registerOrderHandlers(ipcMain, db) {
  ipcMain.handle('orders:getAll', () => {
    return db.prepare(`
      SELECT o.*, p.name as product_name, p.code as product_code
      FROM orders o LEFT JOIN products p ON o.product_id = p.id
      ORDER BY o.id DESC
    `).all();
  });

  ipcMain.handle('orders:create', (_, data) => {
    try {
      // Insert order first to get the ID
      const result = db.prepare(
        `INSERT INTO orders (order_code, customer_name, product_id, quantity, unit_price, total_price, status, order_date,
          delivery_date, payment_deadline, assigned_to, note, delivered_quantity, vat_rate, vat_amount,
          customer_phone, customer_email, customer_address, shipping_fee, discount, inventory_deducted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        data.order_code, data.customer_name, data.product_id, data.quantity, data.unit_price || 0, data.total_price,
        data.status, data.order_date, data.delivery_date, data.payment_deadline, data.assigned_to, data.note,
        data.delivered_quantity || 0, data.vat_rate || 0.08, data.vat_amount || 0,
        data.customer_phone || '', data.customer_email || '', data.customer_address || '', data.shipping_fee || 0, data.discount || 0,
        data.status === 'processing' ? JSON.stringify([]) : null
      );
      const orderId = result.lastInsertRowid;

      // If creating order with 'processing' status, deduct inventory after insert
      if (data.status === 'processing') {
        const bomItems = db.prepare('SELECT * FROM bom_items WHERE product_id = ?').all(data.product_id);
        const deducted = [];
        for (const bom of bomItems) {
          const neededQty = bom.quantity * data.quantity;
          const stock = db.prepare('SELECT quantity FROM inventory WHERE component_code = ?').get(bom.component_code);
          const availableStock = stock?.quantity || 0;
          // Chi tru so luong thuc te co trong kho
          const deductQty = Math.min(neededQty, availableStock);
          if (deductQty > 0) {
            db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE component_code = ?')
              .run(deductQty, bom.component_code);
            db.prepare(
              'INSERT INTO inventory_transactions (component_code, type, quantity, reference_id, reference_type, note) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(bom.component_code, 'order_deduct', deductQty, orderId, 'order', `Đơn hàng ${data.order_code} - SX`);
            deducted.push({ component_code: bom.component_code, quantity: deductQty });
          }
        }
        // Luu so luong da tru vao order
        db.prepare('UPDATE orders SET inventory_deducted = ? WHERE id = ?')
          .run(JSON.stringify(deducted), orderId);
      }

      return { success: true, id: orderId };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('orders:update', (_, id, data) => {
    const oldOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const oldStatus = oldOrder ? oldOrder.status : '';
    const newStatus = data.status;
    let previousDeducted = [];
    try { previousDeducted = oldOrder.inventory_deducted ? JSON.parse(oldOrder.inventory_deducted) : []; } catch (e) { previousDeducted = []; }

    db.prepare(
      `UPDATE orders SET order_code = ?, customer_name = ?, product_id = ?, quantity = ?, unit_price = ?, total_price = ?,
        status = ?, order_date = ?, delivery_date = ?, payment_deadline = ?, assigned_to = ?, note = ?,
        delivered_quantity = ?, vat_rate = ?, vat_amount = ?, customer_phone = ?, customer_email = ?,
        customer_address = ?, shipping_fee = ?, discount = ? WHERE id = ?`
    ).run(
      data.order_code, data.customer_name, data.product_id, data.quantity, data.unit_price || 0, data.total_price,
      data.status, data.order_date, data.delivery_date, data.payment_deadline, data.assigned_to, data.note,
      data.delivered_quantity, data.vat_rate, data.vat_amount, data.customer_phone || '', data.customer_email || '',
      data.customer_address || '', data.shipping_fee || 0, data.discount || 0, id
    );

    // If status changed to 'processing', deduct inventory
    let newDeducted = [];
    if (oldStatus !== 'processing' && newStatus === 'processing') {
      const bomItems = db.prepare('SELECT * FROM bom_items WHERE product_id = ?').all(data.product_id);
      for (const bom of bomItems) {
        const neededQty = bom.quantity * data.quantity;
        const stock = db.prepare('SELECT quantity FROM inventory WHERE component_code = ?').get(bom.component_code);
        const availableStock = stock?.quantity || 0;
        // Chi tru so luong thuc te co trong kho
        const deductQty = Math.min(neededQty, availableStock);
        if (deductQty > 0) {
          db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE component_code = ?')
            .run(deductQty, bom.component_code);
          db.prepare(
            'INSERT INTO inventory_transactions (component_code, type, quantity, reference_id, reference_type, note) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(bom.component_code, 'order_deduct', deductQty, id, 'order', `Đơn hàng ${data.order_code} - SX`);
          newDeducted.push({ component_code: bom.component_code, quantity: deductQty });
        }
      }
      db.prepare('UPDATE orders SET inventory_deducted = ? WHERE id = ?')
        .run(JSON.stringify(newDeducted), id);
    }

    // If status changed from 'processing' to 'cancelled', restore inventory theo so da tru
    if (oldStatus === 'processing' && newStatus === 'cancelled') {
      for (const item of previousDeducted) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE component_code = ?')
          .run(item.quantity, item.component_code);
        db.prepare(
          'INSERT INTO inventory_transactions (component_code, type, quantity, reference_id, reference_type, note) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(item.component_code, 'order_cancelled', item.quantity, id, 'order', `Hủy đơn ${data.order_code} - Hoàn hàng`);
      }
      db.prepare('UPDATE orders SET inventory_deducted = NULL WHERE id = ?').run(id);
    }

    // Neu don da hoan thanh thi khong cho huy
    if (oldStatus === 'completed' && newStatus === 'cancelled') {
      return { success: false, message: 'Không thể hủy đơn đã hoàn thành' };
    }

    return { success: true };
  });

  ipcMain.handle('orders:delete', (_, id) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (order && order.status === 'processing') {
      // Hoan so luong da tru luc tao/cap nhat don
      let deducted = [];
      try { deducted = order.inventory_deducted ? JSON.parse(order.inventory_deducted) : []; } catch (e) { deducted = []; }
      for (const item of deducted) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE component_code = ?')
          .run(item.quantity, item.component_code);
        db.prepare(
          'INSERT INTO inventory_transactions (component_code, type, quantity, reference_id, reference_type, note) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(item.component_code, 'order_cancelled', item.quantity, id, 'order', `Xóa đơn ${order.order_code} - Hoàn hàng`);
      }
    }
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return { success: true };
  });
}

module.exports = { registerOrderHandlers };
