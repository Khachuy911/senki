import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await window.api.getDashboardStats();
    setStats(data);
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
