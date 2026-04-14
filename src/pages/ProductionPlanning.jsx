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
    const raw = parseInt(value) || 0;
    const newQty = { ...quantities, [productId]: Math.max(0, raw) };
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
      await updateOrdersToProcessing();
      alert(`Đã tạo yêu cầu mua hàng ${res.request_code || ''} cho ${shortages.length} mã linh kiện bị thiếu!`);
      loadProducts();
      setResults(null);
    } else {
      alert(res.message || 'Lỗi tạo yêu cầu mua hàng');
    }
  };

  const proceedToProduction = async () => {
    if (!results) return;
    const shortages = results.filter(r => r.shortage > 0);
    if (shortages.length > 0) {
      alert('Còn linh kiện thiếu, không thể tiến hành sản xuất!');
      return;
    }

    // Deduct inventory for each component
    for (const r of results) {
      const key = r.component_code || r.component_name;
      await window.api.adjustInventory({
        component_code: key,
        quantity_change: -r.total_required,
        type: 'production_deduct',
        note: `Trừ vật tư sản xuất - Kế hoạch tự động`
      });
    }

    await updateOrdersToProcessing();
    alert('Đã trừ vật tư trong kho và tiến hành sản xuất!');
    loadProducts();
    setResults(null);
  };

  const updateOrdersToProcessing = async () => {
    const planProductIds = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id]) => parseInt(id));

    for (const order of pendingOrders) {
      if (planProductIds.includes(order.product_id)) {
        await window.api.updateOrder(order.id, { ...order, status: 'processing' });
      }
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
                <th style={{ width: 120 }}>SL cần sản xuất</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className={quantities[p.id] > 0 ? 'row-highlight' : ''}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.code || '—'}</td>
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
                <tr><td colSpan="3" className="empty-state">Chưa có sản phẩm nào. Hãy thêm sản phẩm trong trang BOM trước.</td></tr>
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
              {totalShortageItems > 0 ? (
                <button className="btn-primary btn-sm" onClick={createPurchasingRequest}>
                  🛒 Tạo Yêu Cầu Mua Hàng
                </button>
              ) : (
                <button className="btn-success btn-sm" onClick={proceedToProduction}>
                  ✅ Tiến hành sản xuất
                </button>
              )}
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>STT</th>
                  <th style={{ width: 350 }}>Tên linh kiện</th>
                  <th style={{ width: 150 }}>Mã</th>
                  <th style={{ width: 80, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Tổng cần</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Tồn kho</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Cần nhập thêm</th>
                  <th>Chi tiết theo SP</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.shortage > 0 ? 'row-warning' : ''}>
                    <td>{i + 1}</td>
                    <td><strong>{r.component_name}</strong></td>
                    <td>{r.component_code || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{r.unit}</td>
                    <td style={{ textAlign: 'center' }}><strong>{r.total_required}</strong></td>
                    <td style={{ textAlign: 'center' }}>{r.in_stock}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={r.shortage > 0 ? 'badge badge-danger' : 'badge badge-success'}>
                        {r.shortage > 0 ? `${r.shortage}` : 'Đủ'}
                      </span>
                    </td>
                    <td>
                      {r.details.map((d, j) => (
                        <div key={j} style={{ fontSize: 12 }}>
                          <span style={{ color: '#2563eb' }}>{d.product_name}</span>
                          <span style={{ color: '#64748b' }}> ({d.product_code || '—'})</span>: {d.bom_qty} × {d.plan_qty} = <strong>{d.subtotal}</strong>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr><td colSpan="8" className="empty-state">Các sản phẩm được chọn chưa có BOM</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
