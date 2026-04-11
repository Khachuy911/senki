import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Purchasing() {
  const { canEdit, canDelete } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => { loadPurchases(); }, []);

  const loadPurchases = async () => {
    const data = await window.api.getPurchases();
    setPurchases(data);
  };

  const groupedPurchases = purchases.reduce((groups, p) => {
    const match = p.note?.match(/PR:\s*(PR-\d{4}-\d+)/);
    const prCode = match ? match[1] : 'Khác';
    if (!groups[prCode]) groups[prCode] = [];
    groups[prCode].push(p);
    return groups;
  }, {});

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const handleSave = async (id) => {
    const result = await window.api.updatePurchase(id, editData);
    if (result.success) {
      setEditingId(null);
      loadPurchases();
    } else {
      alert("Lỗi khi cập nhật");
    }
  };

  const handleAddToStock = async (id) => {
    const result = await window.api.addPurchaseToStock(id);
    if (result.success) {
      alert(`Đã nhập ${result.excess} vào kho`);
      loadPurchases();
    } else {
      alert(result.message || 'Lỗi khi nhập kho');
    }
  };

  const handleDeletePurchase = async (id) => {
    if (!confirm('Xác nhận xóa đơn mua hàng này?')) return;
    await window.api.deletePurchase(id);
    loadPurchases();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📦 Mua hàng</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>
          Theo dõi đơn đặt hàng và tình trạng thanh toán
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{purchases.length}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Tổng mặt hàng</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{purchases.filter(p => !p.payment_status || p.payment_status === 'Chưa thanh toán').length}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Chưa thanh toán</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{purchases.filter(p => p.payment_status === 'Đã thanh toán đủ').length}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Đã thanh toán đủ</div>
        </div>
      </div>

      <div className="panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Linh kiện</th>
                <th>Mã LK</th>
                <th style={{ textAlign: 'right' }}>SL Cần</th>
                <th style={{ textAlign: 'right' }}>SL Về</th>
                <th>Ngày về (dự kiến)</th>
                <th>P.I.C</th>
                <th>Hợp Đồng</th>
                <th>Thanh toán</th>
                <th>Ghi chú</th>
                {canEdit() && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedPurchases).map(([prCode, items]) => (
                <>
                  <tr key={`header-${prCode}`} style={{ background: '#f1f5f9' }}>
                    <td colSpan="10" style={{ fontWeight: 700, color: '#2563eb', padding: '8px 12px' }}>
                      📋 {prCode} — {items.length} linh kiện
                    </td>
                  </tr>
                  {items.map(p => {
                    const isEditing = editingId === p.id;
                    const excessQty = (p.actual_quantity || 0) - (p.quantity || 0);
                    const isOverDelivery = excessQty > 0;
                    const canStock = isOverDelivery && (!p.stocked || p.stocked === 0);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.component_name}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{p.component_code || '—'}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#dc2626' }}>{p.quantity}</span>
                          <span style={{ color: '#64748b', marginLeft: 2 }}>{p.unit}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? (
                            <input type="number" className="qty-input" value={editData.actual_quantity || 0} onChange={e => setEditData({...editData, actual_quantity: parseInt(e.target.value) || 0})} />
                          ) : (
                            <span>
                              <strong style={{
                                color: isOverDelivery ? '#dc2626' : (p.actual_quantity >= p.quantity && p.actual_quantity > 0 ? '#16a34a' : (p.actual_quantity > 0 ? '#d97706' : '#94a3b8'))
                              }}>
                                {p.actual_quantity || 0}
                              </strong>
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="date" className="qty-input" value={editData.expected_date ? editData.expected_date.split('T')[0] : ''} onChange={e => setEditData({...editData, expected_date: e.target.value})} />
                          ) : (
                            <span style={{ color: p.expected_date ? '#1e293b' : '#94a3b8' }}>
                              {p.expected_date ? p.expected_date.substring(0, 10) : '—'}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input className="qty-input" style={{ width: 90 }} value={editData.pic || ''} onChange={e => setEditData({...editData, pic: e.target.value})} />
                          ) : (
                            <span style={{ color: p.pic ? '#1e293b' : '#94a3b8' }}>{p.pic || '—'}</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input className="qty-input" style={{ width: 90 }} value={editData.contract_no || ''} onChange={e => setEditData({...editData, contract_no: e.target.value})} />
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: p.contract_no ? '#2563eb' : '#94a3b8' }}>{p.contract_no || '—'}</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <select className="qty-input" style={{ width: 120 }} value={editData.payment_status || 'Chưa thanh toán'} onChange={e => setEditData({...editData, payment_status: e.target.value})}>
                              <option value="Chưa thanh toán">Chưa TT</option>
                              <option value="Đã tạm ứng">Tạm ứng</option>
                              <option value="Đã thanh toán đủ">Đã xong</option>
                            </select>
                          ) : (
                            <span style={{
                              color: p.payment_status === 'Đã thanh toán đủ' ? '#16a34a' : (p.payment_status === 'Đã tạm ứng' ? '#d97706' : '#dc2626'),
                              fontWeight: 600, fontSize: 12
                            }}>
                              {p.payment_status === 'Đã thanh toán đủ' ? 'Đã thanh toán' : (p.payment_status === 'Đã tạm ứng' ? 'Đã tạm ứng' : 'Chưa thanh toán')}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input className="qty-input" style={{ width: 80 }} value={editData.note || ''} onChange={e => setEditData({...editData, note: e.target.value})} />
                          ) : (
                            <span style={{ color: '#64748b', fontSize: 12 }}>{p.note || '—'}</span>
                          )}
                        </td>
                        {canEdit() && (
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {isEditing ? (
                                <>
                                  <button className="btn-icon btn-success-icon" onClick={() => handleSave(p.id)} title="Lưu">✓</button>
                                  <button className="btn-icon" onClick={() => setEditingId(null)} title="Hủy">✕</button>
                                </>
                              ) : (
                                <>
                                  <button className="btn-icon btn-edit-icon" onClick={() => startEdit(p)} title="Sửa">✎</button>
                                  {canDelete() && <button className="btn-icon btn-danger-icon" onClick={() => handleDeletePurchase(p.id)} title="Xóa">✕</button>}
                                  {canStock && (
                                    <button className="btn-icon" style={{ background: '#dcfce7', color: '#16a34a' }} onClick={() => handleAddToStock(p.id)} title="Nhập kho">📥 +{excessQty}</button>
                                  )}
                                  {isOverDelivery && p.stocked === 1 && (
                                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Đã nhập</span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </>
              ))}
              {purchases.length === 0 && (
                <tr><td colSpan="10" className="empty-state">Chưa có đơn mua hàng nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
        💡 Khi số lượng về nhiều hơn cần, click <strong>📥 Nhập kho</strong> để cộng phần thừa vào kho
      </div>
    </div>
  );
}