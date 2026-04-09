import { useState, useEffect } from 'react';

export default function ProductionPlanning() {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]); // Track pending orders by product

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const data = await window.api.getProducts();
    const orders = await window.api.getOrders();
    setProducts(data);

    // Calculate total required per product from pending orders only
    // (Orders with status 'processing' are already in production, so don't recalculate)
    const activeOrders = orders.filter(o => o.status === 'pending');
    setPendingOrders(activeOrders); // Store for later use

    const requiredByProduct = {};
    activeOrders.forEach(o => {
      const remaining = Math.max(0, o.quantity - (o.delivered_quantity || 0));
      requiredByProduct[o.product_id] = (requiredByProduct[o.product_id] || 0) + remaining;
    });

    const init = {};
    data.forEach(p => {
      init[p.id] = requiredByProduct[p.id] || 0;
    });
    setQuantities(init);
  };

  const setQty = (productId, value) => {
    const newQty = { ...quantities, [productId]: parseInt(value) || 0 };
    setQuantities(newQty);
    setResults(null); // Clear old results when qty changes
  };

  const calculate = async () => {
    // Build plan from products with qty > 0
    const planItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ product_id: parseInt(id), quantity: qty }));

    if (planItems.length === 0) {
      alert('Vui lòng nhập số lượng sản xuất cho ít nhất 1 sản phẩm');
      return;
    }

    setLoading(true);
    const res = await window.api.calculateMRP(planItems);
    setResults(res);
    setLoading(false);
  };

  const clearAll = () => {
    const init = {};
    products.forEach(p => { init[p.id] = 0; });
    setQuantities(init);
    setResults(null);
  };

  const createPurchasingRequest = async () => {
    if (!results) return;
    const shortages = results.filter(r => r.shortage > 0);
    if (shortages.length === 0) {
      alert('Không có vật tư nào bị thiếu để tạo yêu cầu mua hàng!');
      return;
    }
    const res = await window.api.createPurchases(shortages);
    if (res.success) {
      // Update pending orders to processing for products with plan quantity > 0
      const planProductIds = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([id]) => parseInt(id));

      for (const order of pendingOrders) {
        if (planProductIds.includes(order.product_id)) {
          await window.api.updateOrder(order.id, { ...order, status: 'processing' });
        }
      }

      alert(`Đã tạo yêu cầu mua hàng ${res.request_code || ''} cho ${shortages.length} mã linh kiện bị thiếu! Các đơn hàng liên quan đã chuyển sang "Đang sản xuất".`);
      // Reload to refresh data
      loadProducts();
      setResults(null);
    } else {
      alert(res.message || 'Lỗi tạo yêu cầu mua hàng');
    }
  };

  const formatCurrency = (num) => Number(num || 0).toLocaleString('vi-VN') + ' ₫';
  const hasAnyQty = Object.values(quantities).some(q => q > 0);
  const totalShortage = results ? results.reduce((sum, r) => sum + r.estimated_cost, 0) : 0;
  const totalShortageItems = results ? results.filter(r => r.shortage > 0).length : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Kế hoạch sản xuất & Dự trù vật tư</h1>
        <div className="page-actions">
          {hasAnyQty && <button className="btn-secondary" onClick={clearAll}>Xóa tất cả</button>}
          <button className="btn-success" onClick={calculate} disabled={!hasAnyQty || loading}>
            {loading ? 'Đang tính...' : '⚙️ Tính toán dự trù'}
          </button>
        </div>
      </div>

      {/* Product Quantity Input Table */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h3>
            📋 Nhập số lượng sản xuất cho từng sản phẩm
            <span style={{ fontSize: 13, fontWeight: 'normal', color: '#64748b', marginLeft: 12 }}>
              (Đã tự động điền số lượng theo Đơn hàng chưa giao)
            </span>
          </h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Mã SP</th>
                <th>Loại</th>
                <th style={{ width: 120 }}>SL cần sản xuất</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className={quantities[p.id] > 0 ? 'row-highlight' : ''}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.code || '—'}</td>
                  <td>{p.category || '—'}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={quantities[p.id] || ''}
                      onChange={(e) => setQty(p.id, e.target.value)}
                      placeholder="0"
                      className="qty-input"
                    />
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan="4" className="empty-state">Chưa có sản phẩm nào. Hãy thêm sản phẩm trong trang BOM trước.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="panel">
          <div className="panel-header">
            <h3>📊 Kết quả dự trù vật tư</h3>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
              <span>
                Thiếu: <strong style={{ color: '#dc2626' }}>{totalShortageItems} linh kiện</strong>
              </span>
              <span>
                Chi phí dự trù: <strong style={{ color: '#dc2626' }}>{formatCurrency(totalShortage)}</strong>
              </span>
              {totalShortageItems > 0 && (
                <button className="btn-primary btn-sm" onClick={createPurchasingRequest} style={{ marginLeft: 16 }}>
                  🛒 Tạo Yêu Cầu Mua Hàng
                </button>
              )}
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên linh kiện</th>
                  <th>Mã</th>
                  <th>ĐVT</th>
                  <th>Tổng cần</th>
                  <th>Tồn kho</th>
                  <th>Cần nhập thêm</th>
                  <th>Đơn giá</th>
                  <th>Chi phí dự trù</th>
                  <th>Chi tiết theo SP</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.shortage > 0 ? 'row-warning' : ''}>
                    <td>{i + 1}</td>
                    <td><strong>{r.component_name}</strong></td>
                    <td>{r.component_code || '—'}</td>
                    <td>{r.unit}</td>
                    <td><strong>{r.total_required}</strong></td>
                    <td>{r.in_stock}</td>
                    <td>
                      <span className={r.shortage > 0 ? 'badge badge-danger' : 'badge badge-success'}>
                        {r.shortage > 0 ? `⚠ ${r.shortage}` : '✓ Đủ'}
                      </span>
                    </td>
                    <td className="text-right">{formatCurrency(r.unit_price)}</td>
                    <td className="text-right">
                      {r.estimated_cost > 0 ? <strong style={{ color: '#dc2626' }}>{formatCurrency(r.estimated_cost)}</strong> : '—'}
                    </td>
                    <td>
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#2563eb', fontSize: 12 }}>Xem</summary>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {r.details.map((d, j) => (
                            <div key={j}>{d.product_name}: {d.bom_qty} × {d.plan_qty} = <strong>{d.subtotal}</strong></div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan="10" className="empty-state">Các sản phẩm được chọn chưa có BOM</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
