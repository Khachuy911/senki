import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Purchasing() {
  const { canEdit, canDelete } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    loadPurchaseRequests();
    loadPurchases();
  }, []);

  const loadPurchaseRequests = async () => {
    const data = await window.api.getPurchaseRequests();
    setPurchaseRequests(data);
  };

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

  const handleDeletePurchase = async (id) => {
    if (!confirm('Xác nhận xóa bản ghi này?')) return;
    await window.api.deletePurchase(id);
    loadPurchases();
  };

  const handleDeleteRequest = async (id) => {
    if (!confirm('Xác nhận xóa yêu cầu mua hàng này?')) return;
    await window.api.deletePurchaseRequest(id);
    loadPurchaseRequests();
  };

  const requestStatusColors = {
    'pending': '#f59e0b',
    'partial': '#2563eb',
    'completed': '#16a34a',
    'cancelled': '#64748b'
  };

  const requestStatusLabels = {
    'pending': 'Chờ xử lý',
    'partial': 'Một phần',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy'
  };

  const statusColors = {
    'Chưa thanh toán': '#dc2626',
    'Đã tạm ứng': '#f59e0b',
    'Đã thanh toán đủ': '#16a34a'
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Quản lý Mua hàng</h1>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav" style={{ marginBottom: 16, display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
          style={{ padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: activeTab === 'requests' ? 600 : 400, background: activeTab === 'requests' ? '#2563eb' : '#e2e8f0', color: activeTab === 'requests' ? '#fff' : '#333' }}
        >
          📋 Yêu cầu mua hàng ({purchaseRequests.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
          style={{ padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: activeTab === 'orders' ? 600 : 400, background: activeTab === 'orders' ? '#2563eb' : '#e2e8f0', color: activeTab === 'orders' ? '#fff' : '#333' }}
        >
          🛒 Đơn mua hàng ({purchases.length})
        </button>
      </div>

      {/* Purchase Requests Tab */}
      {activeTab === 'requests' && (
        <div className="panel">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Ngày tạo</th>
                  <th>Số mặt hàng</th>
                  <th>Tổng SL</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {purchaseRequests.map(req => (
                  <tr key={req.id}>
                    <td><strong>{req.request_code}</strong></td>
                    <td>{req.created_at ? req.created_at.split('T')[0] : '—'}</td>
                    <td>{req.total_items || 0}</td>
                    <td>{req.total_quantity || 0}</td>
                    <td>
                      <span style={{ color: requestStatusColors[req.status] || '#000', fontWeight: 'bold' }}>
                        {requestStatusLabels[req.status] || req.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedRequest(req)}
                          title="Xem chi tiết"
                        >👁</button>
                        {canDelete() && (
                          <button
                            className="btn-icon btn-danger-icon"
                            onClick={() => handleDeleteRequest(req.id)}
                            title="Xóa"
                          >✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {purchaseRequests.length === 0 && (
                  <tr><td colSpan="6" className="empty-state">Chưa có yêu cầu mua hàng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'orders' && (
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
                                {canDelete() && <button className="btn-icon btn-danger-icon" onClick={() => handleDeletePurchase(p.id)} title="Xóa">✕</button>}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {purchases.length === 0 && (
                  <tr><td colSpan="10" className="empty-state">Chưa có đơn mua hàng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Chi tiết: {selectedRequest.request_code}</h3>
              <span style={{ color: requestStatusColors[selectedRequest.status], fontWeight: 'bold' }}>
                {requestStatusLabels[selectedRequest.status] || selectedRequest.status}
              </span>
              <span style={{ marginLeft: 12, color: '#64748b', fontSize: 12 }}>
                Ngày tạo: {selectedRequest.created_at ? selectedRequest.created_at.split('T')[0] : '—'}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Tên linh kiện</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>SL YC</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>SL đã nhận</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(selectedRequest.items || []).map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>
                      <strong>{item.component_name}</strong>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{item.component_code}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.requested_quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.ordered_quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ color: item.status === 'completed' ? '#16a34a' : '#f59e0b', fontWeight: 'bold' }}>
                        {item.status === 'completed' ? 'Đã nhận' : 'Chờ'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!selectedRequest.items || selectedRequest.items.length === 0) && (
                  <tr><td colSpan="4" style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>Không có mặt hàng nào</td></tr>
                )}
              </tbody>
            </table>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedRequest(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
