import { useState, useEffect } from 'react';

/**
 * RowExpandForm — inline 2-column edit form shown below an expanded order row.
 *
 * Props:
 *   order         — full order object
 *   products      — array of product objects for select
 *   onSave        — (updatedOrder) => Promise<void>
 *   onCancel      — () => void
 *   onToggle      — () => void (toggle expand/collapse)
 *   isExpanded    — boolean
 */
export default function RowExpandForm({
  order,
  products,
  onSave,
  onCancel,
  onToggle,
  isExpanded,
}) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Sync form state when order changes or form opens
  useEffect(() => {
    if (isExpanded) {
      setForm({ ...order });
    }
  }, [order, isExpanded]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...form });
      onToggle();
    } catch (e) {
      alert('Lỗi cập nhật: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...order });
    onCancel();
  };

  // Format currency for display in read-only fields
  const fmtCurrency = (num) =>
    Number(num || 0).toLocaleString('vi-VN') + ' ₫';

  // Calculate grand total
  const subtotal = (form.quantity || 0) * (form.unit_price || 0);
  const vatRate = form.vat_rate || 0.08;
  const grandTotal = subtotal * (1 + vatRate);

  return (
    <>
      {/* Toggle button cell — sits in the "Thao tác" column of the expand row */}
      <td className="order-expand-toggle-cell">
        <button
          type="button"
          className="btn-icon"
          onClick={onToggle}
          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          style={{ fontSize: '14px' }}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </td>

      {/* Form content — full width via colspan */}
      <td colSpan="14" className="order-expand-form-cell">
        <div className="order-expand-form">
          {/* Section: Thông tin khách hàng */}
          <div className="expand-form-section">
            <h4 className="expand-form-section-title">Thông tin khách hàng</h4>
            <div className="expand-form-row">
              <div className="form-group">
                <label>Tên khách hàng</label>
                <input
                  value={form.customer_name || ''}
                  onChange={(e) => set('customer_name', e.target.value)}
                  placeholder="Nhập tên khách hàng"
                />
              </div>
              <div className="form-group">
                <label>Điện thoại</label>
                <input
                  value={form.customer_phone || ''}
                  onChange={(e) => set('customer_phone', e.target.value)}
                  placeholder="0xxx xxx xxx"
                />
              </div>
            </div>
            <div className="expand-form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.customer_email || ''}
                  onChange={(e) => set('customer_email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  value={form.customer_address || ''}
                  onChange={(e) => set('customer_address', e.target.value)}
                  placeholder="Địa chỉ giao hàng"
                />
              </div>
            </div>
          </div>

          {/* Section: Chi tiết đơn hàng */}
          <div className="expand-form-section">
            <h4 className="expand-form-section-title">Chi tiết đơn hàng</h4>
            <div className="expand-form-row">
              <div className="form-group">
                <label>Sản phẩm</label>
                <select
                  value={form.product_id || ''}
                  onChange={(e) => set('product_id', e.target.value ? parseInt(e.target.value) : '')}
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  value={form.status || 'pending'}
                  onChange={(e) => set('status', e.target.value)}
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang sản xuất</option>
                  <option value="completed">Hoàn thành</option>
                  {form.status !== 'completed' && (
                    <option value="cancelled">Đã hủy</option>
                  )}
                </select>
              </div>
            </div>
            <div className="expand-form-row">
              <div className="form-group">
                <label>Số lượng</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity || ''}
                  onChange={(e) =>
                    set('quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="form-group">
                <label>Đã giao</label>
                <input
                  type="number"
                  min="0"
                  max={form.quantity}
                  value={form.delivered_quantity || 0}
                  onChange={(e) =>
                    set('delivered_quantity', parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Section: Giá & Thanh toán */}
          <div className="expand-form-section">
            <h4 className="expand-form-section-title">Giá &amp; Thanh toán</h4>
            <div className="expand-form-row">
              <div className="form-group">
                <label>Đơn giá</label>
                <input
                  type="text"
                  value={
                    form.unit_price
                      ? Number(form.unit_price).toLocaleString('vi-VN')
                      : ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    set('unit_price', raw === '' ? 0 : parseFloat(raw));
                  }}
                  style={{ textAlign: 'right' }}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Thành tiền</label>
                <input
                  type="text"
                  value={fmtCurrency(subtotal)}
                  readOnly
                  style={{ textAlign: 'right', background: '#f3f4f6' }}
                />
              </div>
            </div>
            <div className="expand-form-row">
              <div className="form-group">
                <label>VAT (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.vat_rate ?? 0.08}
                  onChange={(e) =>
                    set('vat_rate', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="form-group">
                <label>Tổng cộng</label>
                <input
                  type="text"
                  value={fmtCurrency(grandTotal)}
                  readOnly
                  style={{
                    textAlign: 'right',
                    color: '#dc2626',
                    fontWeight: 'bold',
                    background: '#f3f4f6',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section: Giao hàng & Phụ trách */}
          <div className="expand-form-section">
            <h4 className="expand-form-section-title">Giao hàng &amp; Phụ trách</h4>
            <div className="expand-form-row">
              <div className="form-group">
                <label>Ngày đặt hàng</label>
                <input
                  type="date"
                  value={form.order_date || ''}
                  onChange={(e) => set('order_date', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Ngày giao hàng</label>
                <input
                  type="date"
                  value={form.delivery_date || ''}
                  onChange={(e) => set('delivery_date', e.target.value)}
                />
              </div>
            </div>
            <div className="expand-form-row">
              <div className="form-group">
                <label>Ngày phải trả</label>
                <input
                  type="date"
                  value={form.payment_deadline || ''}
                  onChange={(e) => set('payment_deadline', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phụ trách</label>
                <input
                  value={form.assigned_to || ''}
                  onChange={(e) => set('assigned_to', e.target.value)}
                  placeholder="Người phụ trách"
                />
              </div>
            </div>
            <div className="expand-form-row expand-form-row-full">
              <div className="form-group">
                <label>Ghi chú</label>
                <input
                  value={form.note || ''}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="Ghi chú đơn hàng"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="expand-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </td>
    </>
  );
}
