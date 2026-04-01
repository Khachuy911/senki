import { useState, useEffect } from 'react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    const data = await window.api.getAuditLogs();
    setLogs(data);
  };

  const actionLabel = { CREATE: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Xóa' };
  const actionClass = { CREATE: 'badge-success', UPDATE: 'badge-info', DELETE: 'badge-danger' };
  const tableLabel = {
    products: 'Sản phẩm', bom_items: 'Linh kiện BOM',
    inventory: 'Kho', orders: 'Đơn hàng', users: 'Người dùng'
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('vi-VN');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Nhật ký hệ thống (Audit Log)</h1>
        <div className="page-actions">
          <button className="btn-secondary" onClick={loadLogs}>🔄 Làm mới</button>
        </div>
      </div>

      <div className="panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Bảng dữ liệu</th>
                <th>ID bản ghi</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>{log.username}</td>
                  <td><span className={`badge ${actionClass[log.action] || ''}`}>{actionLabel[log.action] || log.action}</span></td>
                  <td>{tableLabel[log.table_name] || log.table_name}</td>
                  <td>{log.record_id || '—'}</td>
                  <td className="audit-detail">
                    {log.new_values && (
                      <details>
                        <summary>Xem chi tiết</summary>
                        <pre>{JSON.stringify(JSON.parse(log.new_values), null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan="6" className="empty-state">Chưa có nhật ký</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
