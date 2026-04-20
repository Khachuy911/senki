import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [caseOverview, setCaseOverview] = useState(null);
  const { user, canManageUsers } = useAuth();

  useEffect(() => {
    loadStats();
    loadCaseOverview();
  }, []);

  const loadStats = async () => {
    const data = await window.api.getDashboardStats();
    setStats(data);
  };

  const loadCaseOverview = async () => {
    const data = await window.api.getCaseOverview();
    setCaseOverview(data);
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ CẢNH BÁO: Bạn sắp xóa TOÀN BỘ dữ liệu!\n\nCác bảng sẽ bị xóa: products, orders, inventory, bom_items, purchasing, purchase_requests, audit_logs\n\nTài khoản users và linh kiện sẽ được giữ lại.\n\nHành động này KHÔNG THỂ HOÀN TÁC!\n\nNhấn OK để xóa.')) return;
    if (!confirm('Xác nhận lần cuối: Bạn có chắc muốn xóa toàn bộ data?')) return;

    try {
      const result = await window.api.clearAllData();
      if (result.success) {
        alert('Đã xóa toàn bộ dữ liệu thành công!');
        loadStats();
        loadCaseOverview();
      } else {
        alert('Lỗi: ' + result.message);
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  if (!stats) return <div className="page-loading">Đang tải...</div>;

  const cards = [
    { title: 'Sản phẩm', value: stats.products, icon: '📦', color: '#3b82f6' },
    { title: 'Linh kiện', value: stats.components, icon: '🔧', color: '#10b981' },
    { title: 'BOM Items', value: stats.bomItems, icon: '📋', color: '#8b5cf6' },
    { title: 'Tồn kho', value: stats.inventory, icon: '🏭', color: '#06b6d4' },
    { title: 'Sắp hết hàng', value: stats.lowStock, icon: '⚠️', color: '#ef4444' },
    { title: 'Cần nhập kho', value: stats.inBomNotInv, icon: '📥', color: '#f97316' },
    { title: 'Tổng đơn hàng', value: stats.orders, icon: '🛒', color: '#f59e0b' },
    { title: 'Chờ xử lý', value: stats.pendingOrders, icon: '⏳', color: '#6366f1' },
    { title: 'Đang sản xuất', value: stats.processingOrders, icon: '⚙️', color: '#f97316' },
    { title: 'Hoàn thành', value: stats.completedOrders, icon: '✅', color: '#22c55e' },
    { title: 'Đơn mua hàng', value: stats.purchases, icon: '📦', color: '#a855f7' },
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

      {/* Case Overview Section */}
      {caseOverview && caseOverview.byCase && caseOverview.byCase.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <h3>📊 Tổng quan Case</h3>
          </div>
          <div style={{ padding: 16 }}>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0369a1' }}>{caseOverview.totalTypes}</div>
                <div style={{ fontSize: 13, color: '#075985' }}>Tổng loại linh kiện</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>{caseOverview.purchased}</div>
                <div style={{ fontSize: 13, color: '#166534' }}>Đã mua (đủ)</div>
              </div>
              <div style={{ background: '#fff7ed', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#c2410c' }}>{caseOverview.pending}</div>
                <div style={{ fontSize: 13, color: '#9a3412' }}>Chờ nhận hàng</div>
              </div>
              <div style={{ background: '#fef2f2', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{caseOverview.outOfStock}</div>
                <div style={{ fontSize: 13, color: '#b91c1c' }}>Hết hàng</div>
              </div>
            </div>

            {/* Cases Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Sản phẩm</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Mã</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Tổng SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Tổng loại</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#15803d' }}>Đã mua</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#c2410c' }}>Chờ nhận</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#dc2626' }}>Hết hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {caseOverview.byCase.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{c.code}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.total_items}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.total_types}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#15803d', fontWeight: 600 }}>{c.purchased}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#c2410c', fontWeight: 600 }}>{c.pending}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{c.out_of_stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
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

      {/* Quick Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 24 }}>
        {/* Inventory Status */}
        <div className="panel">
          <div className="panel-header">
            <h3>📦 Tồn kho</h3>
          </div>
          <div style={{ padding: 16 }}>
            {stats.lowStock > 0 ? (
              <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>
                ⚠️ Có {stats.lowStock} linh kiện sắp hết hàng
              </div>
            ) : (
              <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>
                ✅ Không có linh kiện sắp hết
              </div>
            )}
            <div style={{ color: '#64748b', fontSize: 13 }}>
              Tổng: {stats.inventory} linh kiện trong kho
            </div>
          </div>
        </div>

        {/* Orders Status */}
        <div className="panel">
          <div className="panel-header">
            <h3>🛒 Đơn hàng</h3>
          </div>
          <div style={{ padding: 16 }}>
            {stats.pendingOrders > 0 && (
              <div style={{ color: '#6366f1', fontWeight: 600, marginBottom: 8 }}>
                ⏳ Có {stats.pendingOrders} đơn chờ xử lý
              </div>
            )}
            {stats.processingOrders > 0 && (
              <div style={{ color: '#f97316', fontWeight: 600, marginBottom: 8 }}>
                ⚙️ Có {stats.processingOrders} đơn đang sản xuất
              </div>
            )}
            {stats.processingOrders === 0 && stats.pendingOrders === 0 && (
              <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>
                ✅ Không có đơn hàng chờ
              </div>
            )}
            <div style={{ color: '#64748b', fontSize: 13 }}>
              Tổng: {stats.orders} đơn hàng
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
