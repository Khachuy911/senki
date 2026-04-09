import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { user, canEdit, canDelete } = useAuth();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustData, setAdjustData] = useState({ quantity_change: 0, note: '' });
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

  const openAdjust = (item) => {
    setAdjustItem(item);
    setAdjustData({ quantity_change: 0, note: '' });
    setShowAdjust(true);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (adjustData.quantity_change === 0) {
      alert('Vui lòng nhập số lượng thay đổi khác 0');
      return;
    }
    const result = await window.api.adjustInventory({
      component_code: adjustItem.component_code,
      quantity_change: adjustData.quantity_change,
      note: adjustData.note
    });
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: adjustData.quantity_change > 0 ? 'MANUAL_ADD' : 'MANUAL_DEDUCT',
        table_name: 'inventory', record_id: adjustItem.id,
        old_values: JSON.stringify({ quantity: adjustItem.quantity }),
        new_values: JSON.stringify({ quantity: adjustItem.quantity + adjustData.quantity_change })
      });
      setShowAdjust(false);
      loadItems();
    } else {
      alert(result.message || 'Lỗi khi điều chỉnh');
    }
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
                      <button className="btn-icon" onClick={() => openAdjust(item)} title="Điều chỉnh tồn kho">⚖</button>
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
                <div className="form-group"><label>Mã <span style={{color:'red'}}>*</span></label><input required value={newItem.component_code} onChange={(e) => setNewItem({ ...newItem, component_code: e.target.value })} placeholder="Bắt buộc" /></div>
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

      {showAdjust && adjustItem && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Điều chỉnh tồn kho</h3>
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
              <div><strong>{adjustItem.component_name}</strong></div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Mã: {adjustItem.component_code}</div>
              <div style={{ fontSize: 13 }}>Tồn kho hiện tại: <strong>{adjustItem.quantity}</strong> {adjustItem.unit}</div>
            </div>
            <form onSubmit={handleAdjust}>
              <div className="form-row">
                <div className="form-group">
                  <label>Thay đổi số lượng</label>
                  <input
                    type="number"
                    value={adjustData.quantity_change}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity_change: parseInt(e.target.value) || 0 })}
                    placeholder="Âm = giảm, Dương = tăng"
                  />
                  <small style={{ color: '#64748b' }}>Âm (-) để giảm tồn, Dương (+) để tăng tồn</small>
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input
                  value={adjustData.note}
                  onChange={(e) => setAdjustData({ ...adjustData, note: e.target.value })}
                  placeholder="Lý do điều chỉnh..."
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Tồn kho mới: <strong style={{ color: adjustItem.quantity + adjustData.quantity_change < 0 ? '#dc2626' : '#16a34a' }}>
                  {adjustItem.quantity + adjustData.quantity_change}
                </strong> {adjustItem.unit}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdjust(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
