import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { user, canEdit, canDelete } = useAuth();
  const [activeTab, setActiveTab] = useState('components');
  const [items, setItems] = useState([]);
  const [ccdcItems, setCcdcItems] = useState([]);
  const [components, setComponents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ccdcSearchTerm, setCcdcSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustData, setAdjustData] = useState({ quantity_change: 0, note: '' });
  const [componentSearch, setComponentSearch] = useState('');
  const [newItem, setNewItem] = useState({
    component_name: '', component_code: '', quantity: 0, unit: 'pcs', min_stock: 5, location: ''
  });
  const [newCcdc, setNewCcdc] = useState({
    ccdc_name: '', ccdc_code: '', quantity: 0, unit: 'pcs', min_stock: 5, location: '', status: 'good', note: ''
  });

  useEffect(() => { loadItems(); loadCcdcItems(); }, []);
  useEffect(() => { if (showAdd) loadComponents(); }, [showAdd]);

  const loadComponents = async () => {
    const data = await window.api.getComponents();
    setComponents(data);
  };

  const loadItems = async () => {
    const data = await window.api.getInventory();
    setItems(data);
  };

  const loadCcdcItems = async () => {
    const data = await window.api.getCcdcInventory();
    setCcdcItems(data);
  };

  const handleAddCcdc = async (e) => {
    e.preventDefault();
    const result = await window.api.createCcdcItem(newCcdc);
    if (result.success) {
      setNewCcdc({ ccdc_name: '', ccdc_code: '', quantity: 0, unit: 'pcs', min_stock: 5, location: '', status: 'good', note: '' });
      setShowAdd(false);
      loadCcdcItems();
    } else {
      alert(result.message || 'Lỗi khi thêm CCDC');
    }
  };

  const handleDeleteCcdc = async (id) => {
    if (!confirm('Xác nhận xóa?')) return;
    await window.api.deleteCcdcItem(id);
    loadCcdcItems();
  };

  const openCcdcAdjust = (item) => {
    setAdjustItem(item);
    setAdjustData({ quantity_change: 0, note: '' });
    setShowAdjust(true);
  };

  const handleCcdcAdjust = async (e) => {
    e.preventDefault();
    if (adjustData.quantity_change === 0) {
      alert('Vui lòng nhập số lượng thay đổi khác 0');
      return;
    }
    const result = await window.api.adjustCcdcInventory({
      ccdc_code: adjustItem.ccdc_code,
      quantity_change: adjustData.quantity_change,
      note: adjustData.note
    });
    if (result.success) {
      setShowAdjust(false);
      loadCcdcItems();
    } else {
      alert(result.message || 'Lỗi khi điều chỉnh');
    }
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
      setNewItem({ component_name: '', component_code: '', quantity: 0, unit: 'pcs', min_stock: 5, location: '' });
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

  const filteredCcdc = ccdcItems.filter((item) =>
    item.ccdc_name.toLowerCase().includes(ccdcSearchTerm.toLowerCase()) ||
    (item.ccdc_code && item.ccdc_code.toLowerCase().includes(ccdcSearchTerm.toLowerCase()))
  );

  const formatCurrency = (num) => Number(num || 0).toLocaleString('vi-VN') + ' ₫';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Kho</h1>
        <div className="page-actions">
          {canEdit() && (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Thêm</button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'components' ? 'active' : ''}`} onClick={() => setActiveTab('components')}>
          Linh kiện ({items.length})
        </button>
        <button className={`tab ${activeTab === 'ccdc' ? 'active' : ''}`} onClick={() => setActiveTab('ccdc')}>
          CCDC ({ccdcItems.length})
        </button>
      </div>

      {/* Components Tab */}
      {activeTab === 'components' && (
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
      )}

      {/* CCDC Tab */}
      {activeTab === 'ccdc' && (
        <div className="panel">
          <div className="search-box">
            <input placeholder="Tìm CCDC..." value={ccdcSearchTerm} onChange={(e) => setCcdcSearchTerm(e.target.value)} />
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên CCDC</th>
                  <th>Mã</th>
                  <th>Số lượng</th>
                  <th>ĐVT</th>
                  <th>Tồn tối thiểu</th>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  {canDelete() && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCcdc.map((item, i) => (
                  <tr key={item.id} className={item.quantity <= item.min_stock ? 'row-warning' : ''}>
                    <td>{i + 1}</td>
                    <td>{item.ccdc_name}</td>
                    <td>{item.ccdc_code}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{item.min_stock}</td>
                    <td>{item.location}</td>
                    <td>
                      <span className={`badge ${item.status === 'good' ? 'badge-success' : item.status === 'damaged' ? 'badge-warning' : 'badge-danger'}`}>
                        {item.status === 'good' ? 'Tốt' : item.status === 'damaged' ? 'Hỏng' : 'Mất'}
                      </span>
                    </td>
                    {canDelete() && (
                      <td>
                        <button className="btn-icon" onClick={() => openCcdcAdjust(item)} title="Điều chỉnh tồn kho">⚖</button>
                        <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteCcdc(item.id)}>✕</button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredCcdc.length === 0 && (
                  <tr><td colSpan="10" className="empty-state">Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal - Show based on activeTab */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setComponentSearch(''); setNewItem({ component_name: '', component_code: '', quantity: 0, unit: 'pcs', min_stock: 5, location: '' }); setNewCcdc({ ccdc_name: '', ccdc_code: '', quantity: 0, unit: 'pcs', min_stock: 5, location: '', status: 'good', note: '' }); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            {activeTab === 'components' ? (
              <>
                <h3>Thêm linh kiện vào kho</h3>

                {/* Chon linh kien tu list */}
                {!newItem.component_code ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <input
                        type="text"
                        placeholder="Tìm linh kiện theo tên hoặc mã..."
                        value={componentSearch}
                        onChange={(e) => setComponentSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
                      />
                    </div>
                    <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
                      {components.filter(c =>
                        !items.some(i => i.component_code === c.component_code) &&
                        (c.component_name.toLowerCase().includes(componentSearch.toLowerCase()) ||
                        (c.component_code && c.component_code.toLowerCase().includes(componentSearch.toLowerCase())))
                      ).length === 0 ? (
                        <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                          {components.length === 0 ? 'Chưa có linh kiện nào. Hãy thêm trong tab "Linh kiện".' : 'Không tìm thấy linh kiện'}
                        </div>
                      ) : (
                        components.filter(c =>
                          !items.some(i => i.component_code === c.component_code) &&
                          (c.component_name.toLowerCase().includes(componentSearch.toLowerCase()) ||
                          (c.component_code && c.component_code.toLowerCase().includes(componentSearch.toLowerCase())))
                        ).map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setNewItem({
                                ...newItem,
                                component_name: c.component_name,
                                component_code: c.component_code,
                                unit: c.unit || 'pcs'
                              });
                              setComponentSearch('');
                            }}
                            style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                          >
                            <strong>{c.component_name}</strong>
                            <span style={{ marginLeft: 8, fontFamily: 'monospace', color: '#2563eb', fontSize: 12 }}>{c.component_code}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      Chọn linh kiện từ danh sách hoặc đóng modal để nhập thủ công
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleAdd}>
                    <div style={{ marginBottom: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontWeight: 600, color: '#166534' }}>✓ Đã chọn: {newItem.component_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Mã: {newItem.component_code} | Đơn vị: {newItem.unit}</div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Số lượng</label><input type="number" min="0" defaultValue={newItem.quantity || ''} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value === '' ? '' : parseInt(e.target.value) })} /></div>
                      <div className="form-group"><label>Tồn tối thiểu</label><input type="number" min="0" defaultValue={newItem.min_stock || ''} onChange={(e) => setNewItem({ ...newItem, min_stock: e.target.value === '' ? '' : parseInt(e.target.value) })} /></div>
                    </div>
                    <div className="form-group"><label>Vị trí kho</label><input value={newItem.location} onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} /></div>
                    <div className="modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => { setNewItem({ component_name: '', component_code: '', quantity: 0, unit: 'pcs', unit_price: 0, min_stock: 5, location: '' }); }}>Chọn lại</button>
                      <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setComponentSearch(''); setNewItem({ component_name: '', component_code: '', quantity: 0, unit: 'pcs', unit_price: 0, min_stock: 5, location: '' }); }}>Hủy</button>
                      <button type="submit" className="btn-primary">Lưu</button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <>
                <h3>Thêm CCDC vào kho</h3>
                <form onSubmit={handleAddCcdc}>
                  <div className="form-row">
                    <div className="form-group"><label>Tên CCDC *</label><input value={newCcdc.ccdc_name} onChange={(e) => setNewCcdc({ ...newCcdc, ccdc_name: e.target.value })} required /></div>
                    <div className="form-group"><label>Mã CCDC</label><input value={newCcdc.ccdc_code} onChange={(e) => setNewCcdc({ ...newCcdc, ccdc_code: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Số lượng</label><input type="number" min="0" value={newCcdc.quantity} onChange={(e) => setNewCcdc({ ...newCcdc, quantity: parseInt(e.target.value) || 0 })} /></div>
                    <div className="form-group"><label>Đơn vị</label><input value={newCcdc.unit} onChange={(e) => setNewCcdc({ ...newCcdc, unit: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Tồn tối thiểu</label><input type="number" min="0" value={newCcdc.min_stock} onChange={(e) => setNewCcdc({ ...newCcdc, min_stock: parseInt(e.target.value) || 0 })} /></div>
                    <div className="form-group"><label>Vị trí</label><input value={newCcdc.location} onChange={(e) => setNewCcdc({ ...newCcdc, location: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Trạng thái</label>
                      <select value={newCcdc.status} onChange={(e) => setNewCcdc({ ...newCcdc, status: e.target.value })}>
                        <option value="good">Tốt</option>
                        <option value="damaged">Hỏng</option>
                        <option value="lost">Mất</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Ghi chú</label><input value={newCcdc.note} onChange={(e) => setNewCcdc({ ...newCcdc, note: e.target.value })} /></div>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setNewCcdc({ ccdc_name: '', ccdc_code: '', quantity: 0, unit: 'pcs', min_stock: 5, location: '', status: 'good', note: '' }); }}>Hủy</button>
                    <button type="submit" className="btn-primary">Lưu</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Adjust Modal - Shared but works for both tabs based on adjustItem */}
      {showAdjust && adjustItem && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Điều chỉnh tồn kho</h3>
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
              <div><strong>{adjustItem.component_name || adjustItem.ccdc_name}</strong></div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Mã: {adjustItem.component_code || adjustItem.ccdc_code}</div>
              <div style={{ fontSize: 13 }}>Tồn kho hiện tại: <strong>{adjustItem.quantity}</strong> {adjustItem.unit}</div>
            </div>
            <form onSubmit={activeTab === 'components' ? handleAdjust : handleCcdcAdjust}>
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
