import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
  const { user, canEdit, canDelete } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newOrder, setNewOrder] = useState({
    order_code: '', customer_name: '', product_id: '', quantity: 1, delivered_quantity: 0, total_price: 0, vat_rate: 0.08, status: 'pending', delivery_date: '', assigned_to: '', note: ''
  });

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
      setNewOrder({ order_code: '', customer_name: '', product_id: '', quantity: 1, delivered_quantity: 0, total_price: 0, vat_rate: 0.08, status: 'pending', delivery_date: '', assigned_to: '', note: '' });
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

  const statusLabel = { pending: 'Chờ xử lý', processing: 'Đang sản xuất', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
  const statusClass = { pending: 'badge-warning', processing: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };
  const formatCurrency = (num) => Number(num || 0).toLocaleString('vi-VN') + ' ₫';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Đơn hàng</h1>
        <div className="page-actions">
          {canEdit() && <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Tạo đơn hàng</button>}
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
                <th>Tổng SL</th>
                <th>Đã giao</th>
                <th>Còn lại</th>
                <th>Thành tiền (VAT)</th>
                <th>Trạng thái</th>
                <th>Ngày giao</th>
                <th>Ghi chú</th>
                {canDelete() && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_code}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.product_name || '—'}</td>
                  <td><strong>{o.quantity}</strong></td>
                  <td><strong style={{ color: '#16a34a' }}>{o.delivered_quantity || 0}</strong></td>
                  <td><strong style={{ color: '#dc2626' }}>{Math.max(0, o.quantity - (o.delivered_quantity || 0))}</strong></td>
                  <td className="text-right">
                    {formatCurrency(o.total_price)}<br/>
                    <span style={{ fontSize: 11, color: '#64748b' }}>(VAT {((o.vat_rate || 0.08)*100)}%: {formatCurrency((o.total_price || 0) * (o.vat_rate || 0.08))})</span>
                  </td>
                  <td><span className={`badge ${statusClass[o.status] || ''}`}>{statusLabel[o.status] || o.status}</span></td>
                  <td>{o.delivery_date || '—'}</td>
                  <td>{o.note || '—'}</td>
                  {canDelete() && (
                    <td><button className="btn-icon btn-danger-icon" onClick={() => handleDelete(o.id)}>✕</button></td>
                  )}
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="10" className="empty-state">Chưa có đơn hàng</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo đơn hàng mới</h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group"><label>Mã đơn hàng</label><input required value={newOrder.order_code} onChange={(e) => setNewOrder({ ...newOrder, order_code: e.target.value })} /></div>
                <div className="form-group"><label>Khách hàng</label><input required value={newOrder.customer_name} onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Sản phẩm</label>
                  <select value={newOrder.product_id} onChange={(e) => setNewOrder({ ...newOrder, product_id: e.target.value })}>
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Tổng số lượng</label><input type="number" min="1" value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Tổng Tiền (chưa VAT)</label><input type="number" min="0" value={newOrder.total_price} onChange={(e) => setNewOrder({ ...newOrder, total_price: parseFloat(e.target.value) || 0 })} /></div>
                <div className="form-group"><label>Thuế VAT (%)</label><input type="number" step="0.01" min="0" value={newOrder.vat_rate} onChange={(e) => setNewOrder({ ...newOrder, vat_rate: parseFloat(e.target.value) || 0 })} /></div>
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
                <div className="form-group"><label>Ngày giao</label><input type="date" value={newOrder.delivery_date} onChange={(e) => setNewOrder({ ...newOrder, delivery_date: e.target.value })} /></div>
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
    </div>
  );
}
