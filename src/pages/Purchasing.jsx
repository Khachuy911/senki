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

  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa bản ghi này?')) return;
    await window.api.deletePurchase(id);
    loadPurchases();
  };

  const statusColors = {
    'Chưa thanh toán': '#dc2626',
    'Đã tạm ứng': '#f59e0b',
    'Đã thanh toán đủ': '#16a34a'
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Theo dõi Kế hoạch Mua hàng (PO)</h1>
      </div>

      <div className="panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Linh kiện</th>
                <th>Mã LK</th>
                <th>SL Cần Nhập</th>
                <th>Người phụ trách (P.I.C)</th>
                <th>Số Hợp Đồng</th>
                <th>Thanh toán</th>
                <th>Ngày dự kiến về</th>
                <th>SL về thực tế</th>
                <th>Ghi chú</th>
                {canEdit() && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id}>
                    <td><strong>{p.component_name}</strong></td>
                    <td>{p.component_code || '—'}</td>
                    <td><strong style={{ color: '#dc2626' }}>{p.quantity}</strong> {p.unit}</td>
                    
                    <td>
                      {isEditing ? (
                        <input className="qty-input" style={{ width: '100px' }} value={editData.pic || ''} onChange={e => setEditData({...editData, pic: e.target.value})} />
                      ) : (p.pic || '—')}
                    </td>
                    
                    <td>
                      {isEditing ? (
                        <input className="qty-input" style={{ width: '100px' }} value={editData.contract_no || ''} onChange={e => setEditData({...editData, contract_no: e.target.value})} />
                      ) : (p.contract_no || '—')}
                    </td>

                    <td>
                      {isEditing ? (
                        <select className="qty-input" style={{ width: '120px' }} value={editData.payment_status || 'Chưa thanh toán'} onChange={e => setEditData({...editData, payment_status: e.target.value})}>
                          <option value="Chưa thanh toán">Chưa TT</option>
                          <option value="Đã tạm ứng">Tạm ứng</option>
                          <option value="Đã thanh toán đủ">Đã xong</option>
                        </select>
                      ) : (
                        <span style={{ color: statusColors[p.payment_status] || '#000', fontWeight: 'bold' }}>{p.payment_status}</span>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input type="date" className="qty-input" style={{ width: '120px' }} value={editData.expected_date ? editData.expected_date.split('T')[0] : ''} onChange={e => setEditData({...editData, expected_date: e.target.value})} />
                      ) : (p.expected_date ? p.expected_date.substring(0, 10) : '—')}
                    </td>

                    <td>
                      {isEditing ? (
                        <input type="number" className="qty-input" value={editData.actual_quantity || 0} onChange={e => setEditData({...editData, actual_quantity: parseInt(e.target.value) || 0})} />
                      ) : (
                        <strong style={{ color: p.actual_quantity >= p.quantity ? '#16a34a' : (p.actual_quantity > 0 ? '#f59e0b' : '#64748b') }}>
                          {p.actual_quantity || 0}
                        </strong>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input className="qty-input" style={{ width: '100px' }} value={editData.note || ''} onChange={e => setEditData({...editData, note: e.target.value})} />
                      ) : (p.note || '—')}
                    </td>

                    {canEdit() && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {isEditing ? (
                            <>
                              <button className="btn-icon btn-success-icon" onClick={() => handleSave(p.id)} title="Lưu">💾</button>
                              <button className="btn-icon" onClick={() => setEditingId(null)} title="Hủy">↩</button>
                            </>
                          ) : (
                            <>
                              <button className="btn-icon btn-edit-icon" onClick={() => startEdit(p)} title="Sửa">✎</button>
                              {canDelete() && <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(p.id)} title="Xóa">✕</button>}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {purchases.length === 0 && (
                <tr><td colSpan="10" className="empty-state">Chưa có yêu cầu mua hàng nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
