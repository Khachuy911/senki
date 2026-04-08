import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { user, canManageUsers } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await window.api.getDashboardStats();
    setStats(data);
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ CẢNH BÁO: Bạn sắp xóa TOÀN BỘ dữ liệu!\n\nCác bảng sẽ bị xóa: products, orders, inventory, bom_items, purchasing, purchase_requests, audit_logs\n\nTài khoản users sẽ được giữ lại.\n\nHành động này KHÔNG THỂ HOÀN TÁC!\n\nNhấn OK để xóa.')) return;
    if (!confirm('Xác nhận lần cuối: Bạn có chắc muốn xóa toàn bộ data?')) return;

    try {
      console.log('Calling clearAllData...');
      const result = await window.api.clearAllData();
      console.log('Result:', result);
      if (result.success) {
        alert('Đã xóa toàn bộ dữ liệu thành công!');
        loadStats();
      } else {
        alert('Lỗi: ' + result.message);
      }
    } catch (e) {
      console.error('Clear data error:', e);
      alert('Lỗi: ' + e.message);
    }
  };

  if (!stats) return <div className="page-loading">Đang tải...</div>;

  const cards = [
    { title: 'Sản phẩm', value: stats.totalProducts, icon: '📦', color: '#3b82f6' },
    { title: 'Linh kiện BOM', value: stats.totalBomItems, icon: '🔧', color: '#10b981' },
    { title: 'Tồn kho', value: stats.totalInventory, icon: '🏭', color: '#8b5cf6' },
    { title: 'Sắp hết hàng', value: stats.lowStock, icon: '⚠️', color: '#ef4444' },
    { title: 'Tổng đơn hàng', value: stats.totalOrders, icon: '📋', color: '#f59e0b' },
    { title: 'Đơn chờ xử lý', value: stats.pendingOrders, icon: '⏳', color: '#6366f1' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tổng quan</h1>
        {canManageUsers() && (
          <div className="page-actions">
            <button
              className="btn-danger"
              onClick={handleClearAllData}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              🗑️ Xóa toàn bộ data
            </button>
          </div>
        )}
      </div>
      <div className="stats-grid">
        {cards.map((card, i) => (
          <div className="stat-card" key={i} style={{ borderLeftColor: card.color }}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{card.value}</div>
              <div className="stat-title">{card.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
