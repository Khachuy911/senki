import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BOMManagement() {
  const { user, canEdit, canDelete } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bomItems, setBomItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddBom, setShowAddBom] = useState(false);
  const [showCopyBom, setShowCopyBom] = useState(false);
  const [copySourceId, setCopySourceId] = useState('');
  const [showEditBom, setShowEditBom] = useState(false);
  const [editBom, setEditBom] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', code: '', category: '' });
  const [newBom, setNewBom] = useState({
    component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: ''
  });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const data = await window.api.getProducts();
    setProducts(data);
  };

  const loadBom = async (productId) => {
    const data = await window.api.getBomByProduct(productId);
    setBomItems(data);
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    loadBom(product.id);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const result = await window.api.createProduct(newProduct);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'CREATE', table_name: 'products', record_id: result.id,
        old_values: null, new_values: JSON.stringify(newProduct)
      });
      setNewProduct({ name: '', code: '', category: '' });
      setShowAddProduct(false);
      loadProducts();
    }
  };

  const handleAddBom = async (e) => {
    e.preventDefault();
    const data = { ...newBom, product_id: selectedProduct.id };
    const result = await window.api.createBomItem(data);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'CREATE', table_name: 'bom_items', record_id: result.id,
        old_values: null, new_values: JSON.stringify(data)
      });
      setNewBom({ component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: '' });
      setShowAddBom(false);
      loadBom(selectedProduct.id);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Xác nhận xóa sản phẩm này?')) return;
    await window.api.deleteProduct(id);
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'DELETE', table_name: 'products', record_id: id,
      old_values: null, new_values: null
    });
    if (selectedProduct?.id === id) {
      setSelectedProduct(null);
      setBomItems([]);
    }
    loadProducts();
  };

  const handleDeleteBom = async (id) => {
    if (!confirm('Xác nhận xóa linh kiện này?')) return;
    await window.api.deleteBomItem(id);
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'DELETE', table_name: 'bom_items', record_id: id,
      old_values: null, new_values: null
    });
    loadBom(selectedProduct.id);
  };

  const openEditBom = (item) => {
    setEditBom({ ...item });
    setShowEditBom(true);
  };

  const handleEditBom = async (e) => {
    e.preventDefault();
    const oldItem = bomItems.find(b => b.id === editBom.id);
    await window.api.updateBomItem(editBom.id, {
      component_name: editBom.component_name,
      component_code: editBom.component_code,
      quantity: editBom.quantity,
      unit: editBom.unit,
      unit_price: editBom.unit_price,
      vat_rate: editBom.vat_rate,
      note: editBom.note,
    });
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'UPDATE', table_name: 'bom_items', record_id: editBom.id,
      old_values: JSON.stringify(oldItem),
      new_values: JSON.stringify(editBom)
    });
    setShowEditBom(false);
    setEditBom(null);
    loadBom(selectedProduct.id);
  };

  const handleCopyBom = async () => {
    if (!copySourceId) return;
    const result = await window.api.copyBomFromProduct(parseInt(copySourceId), selectedProduct.id);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'CREATE', table_name: 'bom_items', record_id: selectedProduct.id,
        old_values: null, new_values: JSON.stringify({ action: 'COPY_BOM', source_product_id: copySourceId, count: result.count })
      });
      alert(`Đã sao chép ${result.count} linh kiện thành công!`);
      setCopySourceId('');
      setShowCopyBom(false);
      loadBom(selectedProduct.id);
    } else {
      alert(result.message || 'Lỗi khi sao chép BOM');
    }
  };

  const handleImportExcel = async () => {
    const result = await window.api.importExcel();
    if (result.canceled || !result.success) return;
    if (!result.data || result.data.length === 0) {
      alert('File Excel không có dữ liệu!');
      return;
    }
    let importedCount = 0;
    for (const row of result.data) {
      const name = row['Tên sản phẩm'] || row['Tên SP'] || row['name'] || '';
      const code = row['Mã SP'] || row['Mã sản phẩm'] || row['code'] || '';
      const category = row['Loại'] || row['category'] || '';
      if (name) {
        await window.api.createProduct({ name, code: String(code), category });
        importedCount++;
      }
    }
    alert(`Import thành công ${importedCount} sản phẩm từ "${result.fileName}"`);
    loadProducts();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (num) => Number(num || 0).toLocaleString('vi-VN') + ' ₫';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Quản lý BOM</h1>
        <div className="page-actions">
          {canEdit() && (
            <>
              <button className="btn-success" onClick={handleImportExcel}>📥 Import Excel</button>
              <button className="btn-primary" onClick={() => setShowAddProduct(true)}>+ Thêm sản phẩm</button>
            </>
          )}
        </div>
      </div>

      <div className="bom-layout">
        {/* Product List */}
        <div className="bom-products">
          <div className="panel">
            <div className="panel-header">
              <h3>Danh sách sản phẩm</h3>
            </div>
            <div className="search-box">
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã SP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="product-list">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={`product-item ${selectedProduct?.id === p.id ? 'active' : ''}`}
                  onClick={() => selectProduct(p)}
                >
                  <div className="product-name">{p.name}</div>
                  <div className="product-code">{p.code}</div>
                  {canDelete() && (
                    <button
                      className="btn-icon btn-danger-icon"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }}
                      title="Xóa"
                    >✕</button>
                  )}
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="empty-state">Không tìm thấy sản phẩm</div>
              )}
            </div>
          </div>
        </div>

        {/* BOM Detail */}
        <div className="bom-detail">
          <div className="panel">
            <div className="panel-header">
              <h3>{selectedProduct ? `BOM: ${selectedProduct.name}` : 'Chọn sản phẩm để xem BOM'}</h3>
              {selectedProduct && canEdit() && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-secondary btn-sm" onClick={() => setShowCopyBom(true)}>📋 Sao chép BOM từ...</button>
                  <button className="btn-primary btn-sm" onClick={() => setShowAddBom(true)}>+ Thêm linh kiện</button>
                </div>
              )}
            </div>
            {selectedProduct ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên linh kiện</th>
                      <th>Mã</th>
                      <th>SL</th>
                      <th>ĐVT</th>
                      <th>Đơn giá</th>
                      <th>VAT</th>
                      <th>Thành tiền</th>
                      <th>Ghi chú</th>
                      {canEdit() && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bomItems.map((item, i) => {
                      const subtotal = item.quantity * item.unit_price * (1 + item.vat_rate);
                      return (
                        <tr key={item.id}>
                          <td>{i + 1}</td>
                          <td>{item.component_name}</td>
                          <td>{item.component_code}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td className="text-right">{formatCurrency(item.unit_price)}</td>
                          <td>{(item.vat_rate * 100).toFixed(0)}%</td>
                          <td className="text-right">{formatCurrency(subtotal)}</td>
                          <td>{item.note}</td>
                          {canEdit() && (
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-icon btn-edit-icon" onClick={() => openEditBom(item)} title="Sửa">✎</button>
                                {canDelete() && <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteBom(item.id)} title="Xóa">✕</button>}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {bomItems.length === 0 && (
                      <tr><td colSpan="10" className="empty-state">Chưa có linh kiện nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-large">Chọn một sản phẩm ở bên trái để xem định mức vật tư (BOM)</div>
            )}
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm sản phẩm mới</h3>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label>Tên sản phẩm</label>
                <input required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Mã sản phẩm</label>
                <input value={newProduct.code} onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Loại</label>
                <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddProduct(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add BOM Item Modal */}
      {showAddBom && (
        <div className="modal-overlay" onClick={() => setShowAddBom(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm linh kiện - {selectedProduct.name}</h3>
            <form onSubmit={handleAddBom}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên linh kiện</label>
                  <input required value={newBom.component_name} onChange={(e) => setNewBom({ ...newBom, component_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mã linh kiện</label>
                  <input value={newBom.component_code} onChange={(e) => setNewBom({ ...newBom, component_code: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng</label>
                  <input type="number" min="1" value={newBom.quantity} onChange={(e) => setNewBom({ ...newBom, quantity: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Đơn vị</label>
                  <input value={newBom.unit} onChange={(e) => setNewBom({ ...newBom, unit: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Đơn giá</label>
                  <input type="number" min="0" value={newBom.unit_price} onChange={(e) => setNewBom({ ...newBom, unit_price: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>VAT (%)</label>
                  <input type="number" min="0" max="1" step="0.01" value={newBom.vat_rate} onChange={(e) => setNewBom({ ...newBom, vat_rate: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input value={newBom.note} onChange={(e) => setNewBom({ ...newBom, note: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddBom(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy BOM Modal */}
      {showCopyBom && (
        <div className="modal-overlay" onClick={() => setShowCopyBom(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sao chép BOM cho: {selectedProduct.name}</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              Chọn sản phẩm nguồn để sao chép toàn bộ danh sách linh kiện sang <strong>{selectedProduct.name}</strong>.
              Sau khi sao chép, bạn có thể chỉnh sửa số lượng từng linh kiện.
            </p>
            <div className="form-group">
              <label>Sao chép BOM từ sản phẩm:</label>
              <select value={copySourceId} onChange={(e) => setCopySourceId(e.target.value)}>
                <option value="">-- Chọn sản phẩm nguồn --</option>
                {products.filter(p => p.id !== selectedProduct.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowCopyBom(false)}>Hủy</button>
              <button type="button" className="btn-primary" onClick={handleCopyBom} disabled={!copySourceId}>Sao chép</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit BOM Item Modal */}
      {showEditBom && editBom && (
        <div className="modal-overlay" onClick={() => setShowEditBom(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sửa linh kiện</h3>
            <form onSubmit={handleEditBom}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên linh kiện</label>
                  <input required value={editBom.component_name} onChange={(e) => setEditBom({ ...editBom, component_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mã linh kiện</label>
                  <input value={editBom.component_code || ''} onChange={(e) => setEditBom({ ...editBom, component_code: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng</label>
                  <input type="number" min="1" value={editBom.quantity} onChange={(e) => setEditBom({ ...editBom, quantity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="form-group">
                  <label>Đơn vị</label>
                  <input value={editBom.unit} onChange={(e) => setEditBom({ ...editBom, unit: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Đơn giá</label>
                  <input type="number" min="0" value={editBom.unit_price} onChange={(e) => setEditBom({ ...editBom, unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>VAT (tỷ lệ, VD: 0.08 = 8%)</label>
                  <input type="number" min="0" max="1" step="0.01" value={editBom.vat_rate} onChange={(e) => setEditBom({ ...editBom, vat_rate: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input value={editBom.note || ''} onChange={(e) => setEditBom({ ...editBom, note: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditBom(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
