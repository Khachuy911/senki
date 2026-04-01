import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { user, canEdit, canDelete } = useAuth();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    component_name: '', component_code: '', quantity: 0, unit: 'pcs', unit_price: 0, min_stock: 5, location: ''
  });

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const data = await window.api.getInventory();
    setItems(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const result = await window.api.createInventoryItem(newItem);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'CREATE', table_name: 'inventory', record_id: result.id,
        old_values: null, new_values: JSON.stringify(newItem)
      });
      setNewItem({ component_name: '', component_code: '', quantity: 0, unit: 'pcs', unit_price: 0, min_stock: 5, location: '' });
      setShowAdd(false);
      loadItems();
    } else {
      alert(result.message || 'Lỗi khi thêm');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa?')) return;
    await window.api.deleteInventoryItem(id);
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'DELETE', table_name: 'inventory', record_id: id,
      old_values: null, new_values: null
    });
    loadItems();
  };

  const filtered = items.filter((item) =>
    item.component_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.component_code && item.component_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (num) => Number(num || 0).toLocaleString('vi-VN') + ' ₫';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Kho linh kiện</h1>
        <div className="page-actions">
          {canEdit() && (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Thêm linh kiện</button>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="search-box">
          <input placeholder="Tìm linh kiện..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên linh kiện</th>
                <th>Mã</th>
                <th>Số lượng</th>
                <th>ĐVT</th>
                <th>Đơn giá</th>
                <th>Tồn tối thiểu</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
                {canDelete() && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} className={item.quantity <= item.min_stock ? 'row-warning' : ''}>
                  <td>{i + 1}</td>
                  <td>{item.component_name}</td>
                  <td>{item.component_code}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td className="text-right">{formatCurrency(item.unit_price)}</td>
                  <td>{item.min_stock}</td>
                  <td>{item.location}</td>
                  <td>
                    <span className={`badge ${item.quantity <= item.min_stock ? 'badge-danger' : 'badge-success'}`}>
                      {item.quantity <= item.min_stock ? 'Sắp hết' : 'Đủ hàng'}
                    </span>
                  </td>
                  {canDelete() && (
                    <td>
                      <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(item.id)}>✕</button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="10" className="empty-state">Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm linh kiện vào kho</h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group"><label>Tên linh kiện</label><input required value={newItem.component_name} onChange={(e) => setNewItem({ ...newItem, component_name: e.target.value })} /></div>
                <div className="form-group"><label>Mã</label><input value={newItem.component_code} onChange={(e) => setNewItem({ ...newItem, component_code: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Số lượng</label><input type="number" min="0" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })} /></div>
                <div className="form-group"><label>ĐVT</label><input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Đơn giá</label><input type="number" min="0" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) })} /></div>
                <div className="form-group"><label>Tồn tối thiểu</label><input type="number" min="0" value={newItem.min_stock} onChange={(e) => setNewItem({ ...newItem, min_stock: parseInt(e.target.value) })} /></div>
              </div>
              <div className="form-group"><label>Vị trí kho</label><input value={newItem.location} onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} /></div>
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
