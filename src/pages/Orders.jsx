import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import OrderCell from '../components/OrderCell';

const statusLabel = {
  pending: 'Chờ xử lý',
  processing: 'Đang sản xuất',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
const statusClass = {
  pending: 'badge-warning',
  processing: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

const statusOptions = [
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'processing', label: 'Đang sản xuất' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export default function Orders() {
  const { user, canEdit, canDelete } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState([]);
  const [sortField, setSortField] = useState('order_date');
  const [sortDir, setSortDir] = useState('desc');

  // New order inline row state
  const [newRowMode, setNewRowMode] = useState(false);
  const [newOrder, setNewOrder] = useState({
    order_code: '',
    customer_name: '',
    product_id: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    delivered_quantity: 0,
    vat_rate: 0.08,
    status: 'pending',
    order_date: '',
    delivery_date: '',
    payment_deadline: '',
    assigned_to: '',
    note: '',
    shipping_fee: 0,
    discount: 0,
    customer_phone: '',
    customer_email: '',
    customer_address: '',
  });

  const generateOrderCode = () => {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `DH-${dateStr}-${random}`;
  };

  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  const loadOrders = async () => setOrders(await window.api.getOrders());
  const loadProducts = async () => setProducts(await window.api.getProducts());

  // ---- Sort ----
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return ' ⇅';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (
      sortField === 'order_date' ||
      sortField === 'delivery_date' ||
      sortField === 'payment_deadline'
    ) {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // ---- Cell save handler ----
  const handleCellSave = async (orderId, field, value) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const updated = { ...order, [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      updated.total_price = (updated.quantity || 0) * (updated.unit_price || 0);
    }
    const result = await window.api.updateOrder(orderId, updated);
    if (!result.success) throw new Error(result.message || 'Lỗi lưu');
    await window.api.logAudit({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      table_name: 'orders',
      record_id: orderId,
      old_values: null,
      new_values: JSON.stringify({ [field]: value }),
    });
    loadOrders();
  };

  // ---- Stepper save helper ----
  const handleStepper = async (orderId, field, current, delta) => {
    const next = Math.max(0, (current || 0) + delta);
    await handleCellSave(orderId, field, next);
  };

  // ---- Add new order inline ----
  const handleAddInline = async () => {
    if (!newOrder.quantity || newOrder.quantity < 1) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }
    if (!newOrder.unit_price || newOrder.unit_price <= 0) {
      alert('Đơn giá phải lớn hơn 0');
      return;
    }
    const qty = parseInt(newOrder.quantity) || 1;
    const toSave = { ...newOrder, quantity: qty };
    const result = await window.api.createOrder(toSave);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id,
        username: user.username,
        action: 'CREATE',
        table_name: 'orders',
        record_id: result.id,
        old_values: null,
        new_values: JSON.stringify(toSave),
      });
      setNewRowMode(false);
      setNewOrder({
        order_code: '',
        customer_name: '',
        product_id: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        delivered_quantity: 0,
        vat_rate: 0.08,
        status: 'pending',
        order_date: '',
        delivery_date: '',
        payment_deadline: '',
        assigned_to: '',
        note: '',
        shipping_fee: 0,
        discount: 0,
        customer_phone: '',
        customer_email: '',
        customer_address: '',
      });
      loadOrders();
    } else {
      alert('Lỗi tạo đơn: ' + result.message);
    }
  };

  const handleCancelAddInline = () => {
    setNewRowMode(false);
    setNewOrder({
      order_code: '',
      customer_name: '',
      product_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      delivered_quantity: 0,
      vat_rate: 0.08,
      status: 'pending',
      order_date: '',
      delivery_date: '',
      payment_deadline: '',
      assigned_to: '',
      note: '',
      shipping_fee: 0,
      discount: 0,
      customer_phone: '',
      customer_email: '',
      customer_address: '',
    });
  };

  // ---- Import/Export ----
  const handleExport = async () => {
    const result = await window.api.exportOrders();
    if (result.canceled) return;
    if (result.success) {
      alert(`Đã xuất file: ${result.filePath}`);
    } else {
      alert('Lỗi export: ' + result.message);
    }
  };

  const handleImport = async () => {
    const result = await window.api.importExcel();
    if (result.canceled) return;
    if (!result.success) {
      alert('Lỗi import: ' + result.message);
      return;
    }
    if (result.data && result.data.length > 0) {
      setImportData(result.data);
      setShowImport(true);
    }
  };

  const handleImportConfirm = async () => {
    let imported = 0;
    for (const row of importData) {
      const orderCode = row['Mã đơn hàng'] || row['order_code'] || generateOrderCode();
      const customerName = row['Khách hàng'] || row['customer_name'] || '';
      const quantity = parseInt(row['Số lượng'] || row['quantity'] || 1);
      const unitPrice = parseFloat(row['Đơn giá'] || row['unit_price'] || 0);
      const totalPrice = quantity * unitPrice;
      const vatRate = parseFloat(row['VAT'] || row['vat_rate'] || 0.08);
      const status = row['Trạng thái'] || row['status'] || 'pending';
      const deliveryDate = row['Ngày giao'] || row['delivery_date'] || '';
      const orderDate = row['Ngày đặt'] || row['order_date'] || '';
      const paymentDeadline = row['Ngày trả'] || row['payment_deadline'] || '';
      const note = row['Ghi chú'] || row['note'] || '';
      const productName = row['Sản phẩm'] || row['product_name'] || '';
      const productCode = row['Mã SP'] || row['product_code'] || '';

      let productId = '';
      if (productName || productCode) {
        const product = products.find(
          (p) =>
            (productName && p.name === productName) ||
            (productCode && p.code === productCode)
        );
        if (product) productId = product.id;
      }

      try {
        const r = await window.api.createOrder({
          order_code: orderCode,
          customer_name: customerName,
          product_id: productId,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          vat_rate: vatRate,
          status,
          order_date: orderDate,
          delivery_date: deliveryDate,
          payment_deadline: paymentDeadline,
          note,
          shipping_fee: 0,
          discount: 0,
          delivered_quantity: 0,
        });
        if (r.success) {
          await window.api.logAudit({
            user_id: user.id,
            username: user.username,
            action: 'CREATE',
            table_name: 'orders',
            record_id: r.id,
            old_values: null,
            new_values: JSON.stringify({ order_code: orderCode }),
          });
          imported++;
        }
      } catch (e) {
        console.error(e);
      }
    }
    alert(`Đã import ${imported}/${importData.length} đơn hàng`);
    setShowImport(false);
    setImportData([]);
    loadOrders();
  };

  // ---- Delete ----
  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa đơn hàng?')) return;
    await window.api.deleteOrder(id);
    await window.api.logAudit({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      table_name: 'orders',
      record_id: id,
      old_values: null,
      new_values: null,
    });
    loadOrders();
  };

  // ---- Toolbar Add button ----
  const handleToolbarAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    setNewOrder({
      ...newOrder,
      order_code: generateOrderCode(),
      order_date: today,
    });
    setNewRowMode(true);
  };

  // ---- Formatters ----
  const formatCurrency = (num) =>
    Number(num || 0).toLocaleString('vi-VN') + ' ₫';

  const fmtPct = (v) => `${((v || 0.08) * 100).toFixed(0)}%`;

  const fmtGrandTotal = (o) => {
    const sub = o.total_price || 0;
    const vat = sub * (o.vat_rate || 0.08);
    return formatCurrency(sub + vat + (o.shipping_fee || 0) - (o.discount || 0));
  };

  const grandTotalNew =
    (newOrder.quantity || 0) * (newOrder.unit_price || 0) * (1 + (newOrder.vat_rate || 0.08));

  // ---- Number cell (editable, no stepper) ----
  const NumberCell = ({ value, orderId, field, onSave }) => (
    <OrderCell
      field={field}
      value={value}
      orderId={orderId}
      onSave={onSave}
      inputType="number"
      inputProps={{ min: 0 }}
    />
  );

  // ---- Product cell with select ----
  const ProductCell = ({ orderId, value, products, onSave }) => {
    const [mode, setMode] = useState('display');

    return (
      <OrderCell
        field="product_id"
        value={value}
        orderId={orderId}
        onSave={onSave}
        inputType="select"
        options={[{ value: '', label: '— Chọn sản phẩm —' }, ...products.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))]}
        displayFormatter={(v) => {
          const p = products.find((pr) => pr.id === v);
          return p ? (
            <span>
              {p.name} <span style={{ color: '#888' }}>({p.code})</span>
            </span>
          ) : (
            '—'
          );
        }}
      />
    );
  };

  return (
    <div className="page">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <h1>Đơn hàng</h1>
        <div className="page-actions">
          <button
            className="btn-secondary"
            title="Export Excel"
            onClick={handleExport}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Export
          </button>
          {canEdit() && (
            <>
              <button
                className="btn-secondary"
                title="Import Excel"
                onClick={handleImport}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Import
              </button>
              <button
                className="btn-primary"
                title="Thêm đơn hàng mới"
                onClick={handleToolbarAdd}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                + Thêm đơn hàng
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="panel">
        <div className="order-table-container">
          <table>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('order_date')}>Ngày đặt{sortIcon('order_date')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('product_name')}>Sản phẩm{sortIcon('product_name')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('customer_name')}>Khách hàng{sortIcon('customer_name')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('quantity')}>SL{sortIcon('quantity')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('unit_price')}>Đơn giá{sortIcon('unit_price')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('total_price')}>Thành tiền{sortIcon('total_price')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('vat_rate')}>VAT{sortIcon('vat_rate')}</th>
                <th style={{ cursor: 'pointer' }}>Tổng cộng</th>
                <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('delivered_quantity')}>Đã giao{sortIcon('delivered_quantity')}</th>
                <th style={{ cursor: 'pointer', textAlign: 'center' }}>Còn lại</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>Trạng thái{sortIcon('status')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('delivery_date')}>Ngày giao{sortIcon('delivery_date')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('payment_deadline')}>Ngày trả{sortIcon('payment_deadline')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('order_code')}>Mã ĐH{sortIcon('order_code')}</th>
                {canEdit() && <th style={{ textAlign: 'center' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {/* ---- New order row ---- */}
              {newRowMode && (
                <tr className="row-new-order">
                  {/* Col1: Ngày đặt */}
                  <td>
                    <input
                      type="date"
                      value={newOrder.order_date}
                      onChange={(e) =>
                        setNewOrder({ ...newOrder, order_date: e.target.value })
                      }
                      style={{ fontSize: '12px', width: '100%' }}
                    />
                  </td>
                  {/* Col2: Sản phẩm */}
                  <td>
                    <select
                      value={newOrder.product_id}
                      onChange={(e) =>
                        setNewOrder({
                          ...newOrder,
                          product_id: e.target.value ? parseInt(e.target.value) : '',
                        })
                      }
                      style={{ fontSize: '12px', width: '100%', border: '1px solid var(--primary)', borderRadius: '3px', padding: '3px 6px' }}
                    >
                      <option value="">—</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* Col3: Khách hàng */}
                  <td>
                    <input
                      value={newOrder.customer_name}
                      onChange={(e) =>
                        setNewOrder({ ...newOrder, customer_name: e.target.value })
                      }
                      placeholder="Khách hàng"
                      style={{ width: '100%', fontSize: '12px', border: '1px solid var(--primary)', borderRadius: '3px', padding: '3px 6px' }}
                    />
                  </td>
                  {/* Col4: SL */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      value={newOrder.quantity}
                      onChange={(e) => {
                        const qty = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                        setNewOrder({
                          ...newOrder,
                          quantity: qty,
                          total_price: qty * (newOrder.unit_price || 0),
                        });
                      }}
                      style={{ width: '80px', textAlign: 'center', fontSize: '12px' }}
                    />
                  </td>
                  {/* Col5: Đơn giá */}
                  <td>
                    <input
                      type="text"
                      value={newOrder.unit_price ? Number(newOrder.unit_price).toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const price = raw === '' ? 0 : parseFloat(raw);
                        setNewOrder({
                          ...newOrder,
                          unit_price: price,
                          total_price: price * (newOrder.quantity || 0),
                        });
                      }}
                      style={{ width: '90px', textAlign: 'right', fontSize: '12px' }}
                    />
                  </td>
                  {/* Col6: Thành tiền */}
                  <td style={{ textAlign: 'right', background: '#f3f4f6' }}>
                    {formatCurrency(newOrder.total_price)}
                  </td>
                  {/* Col7: VAT */}
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newOrder.vat_rate}
                      onChange={(e) =>
                        setNewOrder({
                          ...newOrder,
                          vat_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                        })
                      }
                      style={{ width: '60px', fontSize: '12px' }}
                    />
                  </td>
                  {/* Col8: Tổng cộng */}
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626', background: '#f3f4f6' }}>
                    {formatCurrency(grandTotalNew)}
                  </td>
                  {/* Col9: Đã giao */}
                  <td style={{ textAlign: 'center', background: '#f3f4f6' }}>0</td>
                  {/* Col10: Còn lại */}
                  <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600, background: '#f3f4f6' }}>
                    {newOrder.quantity || 0}
                  </td>
                  {/* Col11: Trạng thái */}
                  <td>
                    <select
                      value={newOrder.status}
                      onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
                      style={{ fontSize: '12px' }}
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="processing">Đang sản xuất</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </td>
                  {/* Col12: Ngày giao */}
                  <td>
                    <input type="date" value={newOrder.delivery_date}
                      onChange={(e) => setNewOrder({ ...newOrder, delivery_date: e.target.value })}
                      style={{ fontSize: '12px' }} />
                  </td>
                  {/* Col13: Ngày trả */}
                  <td>
                    <input type="date" value={newOrder.payment_deadline}
                      onChange={(e) => setNewOrder({ ...newOrder, payment_deadline: e.target.value })}
                      style={{ fontSize: '12px' }} />
                  </td>
                  {/* Col14: Mã ĐH */}
                  <td>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {newOrder.order_code || 'Auto'}
                    </span>
                  </td>
                  {canEdit() && (
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-icon" onClick={handleAddInline} title="Lưu" style={{ color: 'var(--success)' }}>✓</button>
                      <button className="btn-icon" onClick={handleCancelAddInline} title="Hủy" style={{ color: 'var(--danger)' }}>✕</button>
                    </td>
                  )}
                </tr>
              )}

              {/* ---- Order rows ---- */}
              {sortedOrders.map((o) => (
                <tr key={o.id}>
                  {/* Col1: Ngày đặt */}
                  <OrderCell field="order_date" value={o.order_date ? o.order_date.split(' ')[0] : ''} orderId={o.id} onSave={handleCellSave} inputType="date" />

                  {/* Col2: Sản phẩm */}
                  <ProductCell orderId={o.id} value={o.product_id} products={products} onSave={handleCellSave} />

                  {/* Col3: Khách hàng */}
                  <OrderCell field="customer_name" value={o.customer_name} orderId={o.id} onSave={handleCellSave} />

                  {/* Col4: SL */}
                  <NumberCell value={o.quantity} orderId={o.id} field="quantity" onSave={handleCellSave} />

                  {/* Col5: Đơn giá */}
                  <OrderCell field="unit_price" value={o.unit_price} orderId={o.id} onSave={handleCellSave} inputType="text" displayFormatter={(v) => formatCurrency(v)} />

                  {/* Col6: Thành tiền */}
                  <td style={{ background: '#f3f4f6', textAlign: 'right', fontWeight: 500 }}>
                    {formatCurrency(o.total_price)}
                  </td>

                  {/* Col7: VAT */}
                  <td style={{ background: '#f3f4f6' }}>
                    {fmtPct(o.vat_rate)} ({formatCurrency((o.total_price || 0) * (o.vat_rate || 0.08))})
                  </td>

                  {/* Col8: Tổng cộng */}
                  <td style={{ background: '#f3f4f6', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>
                    {fmtGrandTotal(o)}
                  </td>

                  {/* Col9: Đã giao */}
                  <NumberCell value={o.delivered_quantity} orderId={o.id} field="delivered_quantity" onSave={handleCellSave} />

                  {/* Col10: Còn lại */}
                  <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                    {Math.max(0, o.quantity - (o.delivered_quantity || 0))}
                  </td>

                  {/* Col11: Trạng thái */}
                  <OrderCell field="status" value={o.status} orderId={o.id} onSave={handleCellSave} inputType="select" options={statusOptions}
                    displayFormatter={(v) => (
                      <span className={`badge ${statusClass[v] || ''}`}>{statusLabel[v] || v}</span>
                    )}
                  />

                  {/* Col12: Ngày giao */}
                  <OrderCell field="delivery_date" value={o.delivery_date || ''} orderId={o.id} onSave={handleCellSave} inputType="date" />

                  {/* Col13: Ngày trả */}
                  <OrderCell field="payment_deadline" value={o.payment_deadline || ''} orderId={o.id} onSave={handleCellSave} inputType="date" />

                  {/* Col14: Mã ĐH */}
                  <td style={{ fontWeight: 600 }}>{o.order_code}</td>

                  {/* Col15: Thao tác */}
                  {canEdit() && (
                    <td style={{ textAlign: 'center' }}>
                      {canDelete() && (
                        <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(o.id)} title="Xóa">✕</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}

              {orders.length === 0 && !newRowMode && (
                <tr>
                  <td colSpan={canEdit() ? 15 : 14} className="empty-state">
                    Chưa có đơn hàng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Import preview modal ---- */}
      {showImport && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Import đơn hàng từ Excel</h3>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Tìm thấy {importData.length} dòng dữ liệu. Xác nhận import?
            </p>
            <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ background: '#f3f4f6', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Mã ĐH</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Khách hàng</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Sản phẩm</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>SL</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((row, idx) => {
                    const qty = parseInt(row['Số lượng'] || row['quantity'] || 1);
                    const price = parseFloat(row['Đơn giá'] || row['unit_price'] || 0);
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                          {row['Mã đơn hàng'] || row['order_code'] || 'Auto'}
                        </td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                          {row['Khách hàng'] || row['customer_name'] || '-'}
                        </td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                          {row['Sản phẩm'] || row['product_name'] || '-'}
                        </td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{qty}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                          {formatCurrency(price)}
                        </td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                          {formatCurrency(qty * price)}
                        </td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                          {row['Trạng thái'] || row['status'] || 'pending'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowImport(false)}>Hủy</button>
              <button className="btn-primary" onClick={handleImportConfirm}>
                Import {importData.length} đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
