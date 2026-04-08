import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
  const { user, canEdit, canDelete } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState([]);
  const [sortField, setSortField] = useState('order_date');
  const [sortDir, setSortDir] = useState('desc');
  const [newOrder, setNewOrder] = useState({
    order_code: '', customer_name: '', product_id: '', quantity: 1, unit_price: 0, total_price: 0, delivered_quantity: 0, vat_rate: 0.08, status: 'pending', order_date: '', delivery_date: '', payment_deadline: '', assigned_to: '', note: '',
    shipping_fee: 0, discount: 0
  });

  const generateOrderCode = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `DH-${dateStr}-${random}`;
  };

  const calculateTotal = (order) => {
    const qty = order.quantity || 0;
    const price = order.unit_price || 0;
    return qty * price;
  };

  useEffect(() => { loadOrders(); loadProducts(); }, []);

  const loadOrders = async () => { setOrders(await window.api.getOrders()); };
  const loadProducts = async () => { setProducts(await window.api.getProducts()); };

  const handleAdd = async (e) => {
    e.preventDefault();
    const result = await window.api.createOrder(newOrder);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'CREATE', table_name: 'orders', record_id: result.id,
        old_values: null, new_values: JSON.stringify(newOrder)
      });
      setNewOrder({ order_code: '', customer_name: '', product_id: '', quantity: 1, unit_price: 0, total_price: 0, delivered_quantity: 0, vat_rate: 0.08, status: 'pending', order_date: '', delivery_date: '', payment_deadline: '', assigned_to: '', note: '', shipping_fee: 0, discount: 0 });
      setShowAdd(false);
      loadOrders();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa đơn hàng?')) return;
    await window.api.deleteOrder(id);
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'DELETE', table_name: 'orders', record_id: id,
      old_values: null, new_values: null
    });
    loadOrders();
  };

  const handleExport = async () => {
    const result = await window.api.exportOrders();
    if (result.canceled) return;
    if (result.success) {
      alert(`Đã xuất file: ${result.filePath}`);
    } else {
      alert('Lỗi export: ' + result.message);
    }
  };

  const handleImport = async () => {
    const result = await window.api.importExcel();
    if (result.canceled) return;
    if (!result.success) {
      alert('Lỗi import: ' + result.message);
      return;
    }
    if (result.data && result.data.length > 0) {
      setImportData(result.data);
      setShowImport(true);
    }
  };

  const handleImportConfirm = async () => {
    let imported = 0;
    for (const row of importData) {
      const orderCode = row['Mã đơn hàng'] || row['order_code'] || generateOrderCode();
      const customerName = row['Khách hàng'] || row['customer_name'] || '';
      const quantity = parseInt(row['Số lượng'] || row['quantity'] || 1);
      const unitPrice = parseFloat(row['Đơn giá'] || row['unit_price'] || 0);
      const totalPrice = quantity * unitPrice;
      const vatRate = parseFloat(row['VAT'] || row['vat_rate'] || 0.08);
      const status = row['Trạng thái'] || row['status'] || 'pending';
      const deliveryDate = row['Ngày giao'] || row['delivery_date'] || '';
      const orderDate = row['Ngày đặt'] || row['order_date'] || '';
      const paymentDeadline = row['Ngày trả'] || row['payment_deadline'] || '';
      const note = row['Ghi chú'] || row['note'] || '';
      const productName = row['Sản phẩm'] || row['product_name'] || '';
      const productCode = row['Mã SP'] || row['product_code'] || '';

      let productId = '';
      if (productName || productCode) {
        const product = products.find(p =>
          (productName && p.name === productName) ||
          (productCode && p.code === productCode)
        );
        if (product) productId = product.id;
      }

      try {
        const result = await window.api.createOrder({
          order_code: orderCode,
          customer_name: customerName,
          product_id: productId,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          vat_rate: vatRate,
          status,
          order_date: orderDate,
          delivery_date: deliveryDate,
          payment_deadline: paymentDeadline,
          note,
          shipping_fee: 0,
          discount: 0,
          delivered_quantity: 0
        });
        if (result.success) {
          await window.api.logAudit({
            user_id: user.id, username: user.username,
            action: 'CREATE', table_name: 'orders', record_id: result.id,
            old_values: null, new_values: JSON.stringify({ order_code: orderCode })
          });
          imported++;
        }
      } catch (e) { console.error(e); }
    }
    alert(`Đã import ${imported}/${importData.length} đơn hàng`);
    setShowImport(false);
    setImportData([]);
    loadOrders();
  };

  const handleEdit = (order) => {
    setEditingOrder({ ...order });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await window.api.updateOrder(editingOrder.id, editingOrder);
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'UPDATE', table_name: 'orders', record_id: editingOrder.id,
      old_values: null, new_values: JSON.stringify(editingOrder)
    });
    setEditingOrder(null);
    loadOrders();
  };

  const statusLabel = { pending: 'Chờ xử lý', processing: 'Đang sản xuất', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
  const statusClass = { pending: 'badge-warning', processing: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };
  const formatCurrency = (num) => Number(num || 0).toLocaleString('vi-VN') + ' ₫';

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (sortField === 'order_date' || sortField === 'delivery_date' || sortField === 'payment_deadline') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const sortIcon = (field) => {
    if (sortField !== field) return ' ⇅';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Đơn hàng</h1>
        <div className="page-actions">
          <button
            className="btn-secondary"
            title="Export Excel"
            onClick={handleExport}
            style={{ marginRight: '8px', padding: '8px 16px', fontSize: '14px' }}
          >📤 Export</button>
          {canEdit() && (
            <>
              <button
                className="btn-secondary"
                title="Import Excel"
                onClick={handleImport}
                style={{ marginRight: '8px', padding: '8px 16px', fontSize: '14px' }}
              >📥 Import</button>
              <button
                className="btn-primary"
                title="Thêm đơn hàng mới"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setNewOrder({ ...newOrder, order_code: generateOrderCode(), order_date: today });
                  setShowAdd(true);
                }}
                style={{ width: '36px', height: '36px', fontSize: '20px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</button>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã ĐH</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('order_date')}>Ngày đặt{sortIcon('order_date')}</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
                <th>VAT</th>
                <th>Tổng cộng</th>
                <th>Đã giao</th>
                <th>Còn lại</th>
                <th>Trạng thái</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('delivery_date')}>Ngày giao{sortIcon('delivery_date')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('payment_deadline')}>Ngày trả{sortIcon('payment_deadline')}</th>
                {canEdit() && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((o) => {
                const subtotal = o.total_price || 0;
                const vatRate = o.vat_rate || 0.08;
                const vatAmount = subtotal * vatRate;
                const shippingFee = o.shipping_fee || 0;
                const discount = o.discount || 0;
                const grandTotal = subtotal + vatAmount + shippingFee - discount;
                return (
                <tr key={o.id}>
                  <td>{o.order_code}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.product_name || '—'} {o.product_code ? `(${o.product_code})` : ''}</td>
                  <td>{o.order_date ? o.order_date.split(' ')[0] : '—'}</td>
                  <td style={{ background: '#f3f4f6', textAlign: 'center' }}><strong>{o.quantity}</strong></td>
                  <td style={{ background: '#f3f4f6' }}>{formatCurrency(o.unit_price || 0)}</td>
                  <td style={{ background: '#f3f4f6' }}>{formatCurrency(subtotal)}</td>
                  <td style={{ background: '#f3f4f6' }}>{(vatRate * 100).toFixed(0)}% ({formatCurrency(vatAmount)})</td>
                  <td style={{ background: '#f3f4f6', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(grandTotal)}</td>
                  <td style={{ color: '#16a34a' }}>{o.delivered_quantity || 0}</td>
                  <td style={{ color: '#dc2626' }}>{Math.max(0, o.quantity - (o.delivered_quantity || 0))}</td>
                  <td><span className={`badge ${statusClass[o.status] || ''}`}>{statusLabel[o.status] || o.status}</span></td>
                  <td>{o.delivery_date || '—'}</td>
                  <td>{o.payment_deadline ? o.payment_deadline.split(' ')[0] : '—'}</td>
                  {canEdit() && (
                    <td>
                      <button className="btn-icon" onClick={() => handleEdit(o)} style={{ marginRight: '4px' }}>✎</button>
                      {canDelete() && <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(o.id)}>✕</button>}
                    </td>
                  )}
                </tr>
              );
              })}
              {orders.length === 0 && <tr><td colSpan="15" className="empty-state">Chưa có đơn hàng</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo đơn hàng mới</h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group"><label>Mã đơn hàng</label><input required value={newOrder.order_code} readOnly /></div>
                <div className="form-group"><label>Khách hàng</label><input required value={newOrder.customer_name} onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })} placeholder="Nhập tên khách hàng" /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Sản phẩm</label>
                  <select value={newOrder.product_id} onChange={(e) => setNewOrder({ ...newOrder, product_id: e.target.value })}>
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Tổng số lượng</label><input type="number" min="1" value={newOrder.quantity} onChange={(e) => {
                    const val = e.target.value;
                    const qty = val === '' ? 0 : (parseInt(val) || 0);
                    setNewOrder({ ...newOrder, quantity: qty, total_price: qty * (newOrder.unit_price || 0) });
                  }} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Đơn giá (VNĐ)</label><input type="number" min="0" value={newOrder.unit_price} onChange={(e) => {
                    const val = e.target.value;
                    const price = val === '' ? 0 : (parseFloat(val) || 0);
                    setNewOrder({ ...newOrder, unit_price: price, total_price: price * (newOrder.quantity || 0) });
                  }} /></div>
                <div className="form-group"><label>Tổng tiền (chưa VAT)</label><input type="number" min="0" value={newOrder.total_price} readOnly /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Thuế VAT (%)</label><input type="number" step="0.01" min="0" value={newOrder.vat_rate} onChange={(e) => setNewOrder({ ...newOrder, vat_rate: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) })} /></div>
                <div className="form-group"><label>Tổng tiền (có VAT)</label><input type="number" value={newOrder.total_price * (1 + newOrder.vat_rate)} readOnly /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select value={newOrder.status} onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}>
                    <option value="pending">Chờ xử lý</option>
                    <option value="processing">Đang sản xuất</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Ngày đặt hàng</label><input type="date" value={newOrder.order_date} onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })} /></div>
                <div className="form-group"><label>Ngày giao</label><input type="date" value={newOrder.delivery_date} onChange={(e) => setNewOrder({ ...newOrder, delivery_date: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Ngày phải trả</label><input type="date" value={newOrder.payment_deadline} onChange={(e) => setNewOrder({ ...newOrder, payment_deadline: e.target.value })} /></div>
                <div className="form-group"><label>Phụ trách</label><input value={newOrder.assigned_to} onChange={(e) => setNewOrder({ ...newOrder, assigned_to: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Ghi chú</label><input value={newOrder.note} onChange={(e) => setNewOrder({ ...newOrder, note: e.target.value })} /></div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Mã đơn hàng: {editingOrder.order_code}</h3>
                  <span className={`badge ${statusClass[editingOrder.status] || ''}`} style={{ marginTop: '4px', display: 'inline-block' }}>{statusLabel[editingOrder.status] || editingOrder.status}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdate}>
              <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>Thông tin khách hàng</h4>
                <div className="form-group">
                  <label>Tên khách hàng</label>
                  <input value={editingOrder.customer_name || ''} onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })} />
                </div>
              </div>

              <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>Thông tin giao hàng</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ngày giao hàng</label>
                    <input type="date" value={editingOrder.delivery_date || ''} onChange={(e) => setEditingOrder({ ...editingOrder, delivery_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Ngày phải trả</label>
                    <input type="date" value={editingOrder.payment_deadline || ''} onChange={(e) => setEditingOrder({ ...editingOrder, payment_deadline: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <input value={editingOrder.note || ''} onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })} />
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>Chi tiết đơn hàng</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select value={editingOrder.status || 'pending'} onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}>
                      <option value="pending">Chờ xử lý</option>
                      <option value="processing">Đang sản xuất</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sản phẩm</label>
                    <select value={editingOrder.product_id || ''} onChange={(e) => setEditingOrder({ ...editingOrder, product_id: e.target.value })}>
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Số lượng</label>
                    <input type="number" min="1" value={editingOrder.quantity} onChange={(e) => setEditingOrder({ ...editingOrder, quantity: parseInt(e.target.value) || 1, total_price: (parseInt(e.target.value) || 1) * editingOrder.unit_price })} />
                  </div>
                  <div className="form-group">
                    <label>Đã giao</label>
                    <input type="number" min="0" max={editingOrder.quantity} value={editingOrder.delivered_quantity || 0} onChange={(e) => setEditingOrder({ ...editingOrder, delivered_quantity: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Đơn giá</label>
                    <input type="number" min="0" value={editingOrder.unit_price || 0} onChange={(e) => setEditingOrder({ ...editingOrder, unit_price: parseFloat(e.target.value) || 0, total_price: (parseFloat(e.target.value) || 0) * editingOrder.quantity })} />
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>Thanh toán</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tổng tiền hàng</label>
                    <input type="number" min="0" value={editingOrder.total_price || ''} readOnly />
                  </div>
                  <div className="form-group">
                    <label>Thuế VAT (%)</label>
                    <input type="number" step="0.01" min="0" value={editingOrder.vat_rate || ''} onChange={(e) => setEditingOrder({ ...editingOrder, vat_rate: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phí vận chuyển</label>
                    <input type="number" min="0" value={editingOrder.shipping_fee || ''} onChange={(e) => setEditingOrder({ ...editingOrder, shipping_fee: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })} />
                  </div>
                  <div className="form-group">
                    <label>Giảm giá</label>
                    <input type="number" min="0" value={editingOrder.discount || ''} onChange={(e) => setEditingOrder({ ...editingOrder, discount: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Tổng cộng</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc2626' }}>
                    {formatCurrency(editingOrder.total_price * (1 + (editingOrder.vat_rate || 0.08)) + (editingOrder.shipping_fee || 0) - (editingOrder.discount || 0))}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingOrder(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Cập nhật đơn hàng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay">
          <div class="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Import đơn hàng từ Excel</h3>
            <p style={{ color: '#666', marginBottom: '16px' }}>Tìm thấy {importData.length} dòng dữ liệu. Xác nhận import?</p>
            <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ background: '#f3f4f6', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Mã ĐH</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Khách hàng</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Sản phẩm</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>SL</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((row, idx) => {
                    const qty = parseInt(row['Số lượng'] || row['quantity'] || 1);
                    const price = parseFloat(row['Đơn giá'] || row['unit_price'] || 0);
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>{row['Mã đơn hàng'] || row['order_code'] || 'Auto'}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>{row['Khách hàng'] || row['customer_name'] || '-'}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>{row['Sản phẩm'] || row['product_name'] || '-'}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{qty}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(price)}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(qty * price)}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>{row['Trạng thái'] || row['status'] || 'pending'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowImport(false)}>Hủy</button>
              <button className="btn-primary" onClick={handleImportConfirm}>Import {importData.length} đơn hàng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
