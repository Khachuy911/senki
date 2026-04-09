import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BOMManagement() {
  const { user, canEdit, canDelete } = useAuth();
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'components'
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bomItems, setBomItems] = useState([]);
  const [bomCountMap, setBomCountMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [showAddBom, setShowAddBom] = useState(false);
  const [showCopyBom, setShowCopyBom] = useState(false);
  const [copySourceId, setCopySourceId] = useState('');
  const [showEditBom, setShowEditBom] = useState(false);
  const [editBom, setEditBom] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', code: '', category: '' });
  const [newBom, setNewBom] = useState({
    component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: '',
    material: '', specification: '', color: '', identifying_features: '', pic_standard: '', contract_no: '', payment_status: '', order_date: '', needed_date: ''
  });

  // Component state
  const [components, setComponents] = useState([]);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState(null);
  const [newComponent, setNewComponent] = useState({
    component_name: '', component_code: '', unit: 'pcs', unit_price: 0,
    material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: ''
  });
  // BOM add modal - component search
  const [bomComponentSearch, setBomComponentSearch] = useState('');

  useEffect(() => { loadProductsWithBomCount(); }, []);
  useEffect(() => { if (activeTab === 'components') loadComponents(); }, [activeTab]);

  const loadComponents = async () => {
    const data = await window.api.getComponents();
    setComponents(data);
  };

  const loadProductsWithBomCount = async () => {
    const data = await window.api.getProducts();
    setProducts(data);
    // Load BOM count for each product
    const counts = {};
    for (const p of data) {
      const items = await window.api.getBomByProduct(p.id);
      counts[p.id] = items.length;
    }
    setBomCountMap(counts);
  };

  const loadBom = async (productId) => {
    const data = await window.api.getBomByProduct(productId);
    setBomItems(data);
  };

  const handleAddComponent = async (e) => {
    e.preventDefault();
    const result = await window.api.createComponent(newComponent);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'CREATE', table_name: 'components', record_id: result.id,
        old_values: null, new_values: JSON.stringify(newComponent)
      });
      setNewComponent({ component_name: '', component_code: '', unit: 'pcs', unit_price: 0, material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: '' });
      setShowAddComponent(false);
      loadComponents();
    } else {
      alert(result.message || 'Lỗi khi thêm linh kiện');
    }
  };

  const handleEditComponent = async (e) => {
    e.preventDefault();
    const result = await window.api.updateComponent(editingComponentId, newComponent);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'UPDATE', table_name: 'components', record_id: editingComponentId,
        old_values: null, new_values: JSON.stringify(newComponent)
      });
      setEditingComponentId(null);
      setNewComponent({ component_name: '', component_code: '', unit: 'pcs', unit_price: 0, material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: '' });
      loadComponents();
    } else {
      alert(result.message || 'Lỗi khi cập nhật linh kiện');
    }
  };

  const handleDeleteComponent = async (id) => {
    if (!confirm('Xác nhận xóa linh kiện này?')) return;
    await window.api.deleteComponent(id);
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'DELETE', table_name: 'components', record_id: id,
      old_values: null, new_values: null
    });
    loadComponents();
  };

  const openEditComponent = (comp) => {
    setNewComponent({
      component_name: comp.component_name,
      component_code: comp.component_code,
      unit: comp.unit || 'pcs',
      unit_price: comp.unit_price || 0,
      material: comp.material || '',
      specification: comp.specification || '',
      color: comp.color || '',
      identifying_features: comp.identifying_features || '',
      pic_standard: comp.pic_standard || '',
      note: comp.note || ''
    });
    setEditingComponentId(comp.id);
    setShowAddComponent(true);
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    loadBom(product.id);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (editingProductId) {
      // Edit existing product
      await window.api.updateProduct(editingProductId, newProduct);
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'UPDATE', table_name: 'products', record_id: editingProductId,
        old_values: null, new_values: JSON.stringify(newProduct)
      });
      setEditingProductId(null);
    } else {
      // Add new product
      const result = await window.api.createProduct(newProduct);
      if (result.success) {
        await window.api.logAudit({
          user_id: user.id, username: user.username,
          action: 'CREATE', table_name: 'products', record_id: result.id,
          old_values: null, new_values: JSON.stringify(newProduct)
        });
      }
    }
    setNewProduct({ name: '', code: '', category: '' });
    setShowAddProduct(false);
    loadProductsWithBomCount();
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
      setNewBom({ component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: '', material: '', specification: '', color: '', identifying_features: '', pic_standard: '', contract_no: '', payment_status: '', order_date: '', needed_date: '' });
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
    loadProductsWithBomCount();
  };

  const editProduct = (product) => {
    setNewProduct({ name: product.name, code: product.code, category: product.category || '' });
    setEditingProductId(product.id);
    setShowAddProduct(true);
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
      material: editBom.material || '',
      specification: editBom.specification || '',
      color: editBom.color || '',
      identifying_features: editBom.identifying_features || '',
      pic_standard: editBom.pic_standard || '',
      contract_no: editBom.contract_no || '',
      payment_status: editBom.payment_status || '',
      order_date: editBom.order_date || '',
      needed_date: editBom.needed_date || '',
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
    loadProductsWithBomCount();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Quản lý BOM</h1>
        <div className="page-actions">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginRight: 16 }}>
            <button
              className={`btn-sm ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('products')}
            >
              📦 Sản phẩm
            </button>
            <button
              className={`btn-sm ${activeTab === 'components' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('components')}
            >
              🔧 Linh kiện
            </button>
          </div>
          {canEdit() && activeTab === 'products' && (
            <>
              <button className="btn-success" onClick={handleImportExcel}>📥 Import Excel</button>
              <button className="btn-primary" onClick={() => { setEditingProductId(null); setNewProduct({ name: '', code: '', category: '' }); setShowAddProduct(true); }}>+ Thêm sản phẩm</button>
              <button className="btn-secondary" disabled={!selectedProduct} onClick={() => { if (selectedProduct) { setEditingProductId(selectedProduct.id); setNewProduct({ name: selectedProduct.name, code: selectedProduct.code || '', category: selectedProduct.category || '' }); setShowAddProduct(true); } }}>✏️ Sửa sản phẩm</button>
            </>
          )}
          {canEdit() && activeTab === 'components' && (
            <button className="btn-primary" onClick={() => { setEditingComponentId(null); setNewComponent({ component_name: '', component_code: '', unit: 'pcs', unit_price: 0, material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: '' }); setShowAddComponent(true); }}>+ Thêm linh kiện</button>
          )}
        </div>
      </div>

      {activeTab === 'products' && (
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
                  <div className="product-name">{p.name} {p.code ? <span className="product-code">({p.code})</span> : null}</div>
                  <span className="bom-count">{bomCountMap[p.id] || 0} LK</span>
                  <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    {canEdit() && (
                      <button className="btn-icon" onClick={() => editProduct(p)} title="Sửa">✎</button>
                    )}
                    {canDelete() && (
                      <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteProduct(p.id)} title="Xóa">✕</button>
                    )}
                  </div>
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
                  <button className="btn-primary btn-sm" onClick={() => { loadComponents(); setBomComponentSearch(''); setShowAddBom(true); }}>+ Thêm linh kiện</button>
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
                      <th>Vật liệu</th>
                      <th>Quy cách</th>
                      <th>Màu sắc</th>
                      <th>Đặc điểm</th>
                      <th>Tiêu chuẩn</th>
                      <th>Hợp đồng</th>
                      <th>Thanh toán</th>
                      <th>Ngày đặt</th>
                      <th>Ngày cần về</th>
                      <th>SL</th>
                      {canEdit() && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bomItems.map((item, i) => {
                      // Color coding for needed_date
                      const getStatusColor = () => {
                        if (!item.needed_date) return '';
                        const needed = new Date(item.needed_date);
                        const today = new Date();
                        const diffDays = Math.ceil((needed - today) / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) return '#dc2626'; // ĐỎ - quá hạn
                        if (diffDays <= 7) return '#eab308'; // VÀNG - còn ≤ 7 ngày
                        return '#16a34a'; // XANH - còn nhiều hơn 7 ngày
                      };
                      const getStatusLabel = () => {
                        if (!item.needed_date) return '';
                        const needed = new Date(item.needed_date);
                        const today = new Date();
                        const diffDays = Math.ceil((needed - today) / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) return 'ĐỎ';
                        if (diffDays <= 7) return 'VÀNG';
                        return 'XANH';
                      };
                      return (
                        <tr key={item.id}>
                          <td>{i + 1}</td>
                          <td>{item.component_name}</td>
                          <td>{item.component_code}</td>
                          <td>{item.material || '-'}</td>
                          <td>{item.specification || '-'}</td>
                          <td>{item.color || '-'}</td>
                          <td>{item.identifying_features || '-'}</td>
                          <td>{item.pic_standard || '-'}</td>
                          <td>{item.contract_no || '-'}</td>
                          <td>{item.payment_status || '-'}</td>
                          <td>{item.order_date || '-'}</td>
                          <td>
                            {item.needed_date ? (
                              <span style={{ background: getStatusColor(), color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                {item.needed_date.split('T')[0]} {getStatusLabel()}
                              </span>
                            ) : '-'}
                          </td>
                          <td>{item.quantity} {item.unit}</td>
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
                      <tr><td colSpan={canEdit() ? 14 : 13} className="empty-state">Chưa có linh kiện nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-large">Chọn một sản phẩm ở danh sách trên để xem định mức vật tư (BOM)</div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Components Tab */}
      {activeTab === 'components' && (
        <div className="panel">
          <div className="panel-header">
            <h3>Danh sách linh kiện ({components.length})</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên linh kiện</th>
                  <th>Mã LK</th>
                  <th>Vật liệu</th>
                  <th>Quy cách</th>
                  <th>Màu sắc</th>
                  <th>Đặc điểm</th>
                  <th>Tiêu chuẩn</th>
                  <th>SL</th>
                  <th>Đơn vị</th>
                  <th>Đơn giá</th>
                  <th>Ghi chú</th>
                  {canEdit() && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {components.map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td><strong>{c.component_name}</strong></td>
                    <td><span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{c.component_code}</span></td>
                    <td>{c.material || '-'}</td>
                    <td>{c.specification || '-'}</td>
                    <td>{c.color || '-'}</td>
                    <td>{c.identifying_features || '-'}</td>
                    <td>{c.pic_standard || '-'}</td>
                    <td>{c.quantity || '-'}</td>
                    <td>{c.unit || 'pcs'}</td>
                    <td>{c.unit_price ? c.unit_price.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                    <td>{c.note || '-'}</td>
                    {canEdit() && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon btn-edit-icon" onClick={() => openEditComponent(c)} title="Sửa">✎</button>
                          {canDelete() && <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteComponent(c.id)} title="Xóa">✕</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {components.length === 0 && (
                  <tr><td colSpan={canEdit() ? 12 : 11} className="empty-state">Chưa có linh kiện nào. Nhấn "+ Thêm linh kiện" để tạo mới.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={() => { setShowAddProduct(false); setEditingProductId(null); setNewProduct({ name: '', code: '', category: '' }); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1001 }}>
            <h3>{editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3>Thêm linh kiện - {selectedProduct.name}</h3>

            {/* Search Component */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Tìm linh kiện theo tên hoặc mã..."
                value={bomComponentSearch}
                onChange={(e) => setBomComponentSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
              />
            </div>

            {/* Component List */}
            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
              {components.filter(c =>
                c.component_name.toLowerCase().includes(bomComponentSearch.toLowerCase()) ||
                (c.component_code && c.component_code.toLowerCase().includes(bomComponentSearch.toLowerCase()))
              ).length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                  {components.length === 0 ? 'Chưa có linh kiện nào. Hãy thêm linh kiện trong tab "Linh kiện" trước.' : 'Không tìm thấy linh kiện'}
                </div>
              ) : (
                components.filter(c =>
                  c.component_name.toLowerCase().includes(bomComponentSearch.toLowerCase()) ||
                  (c.component_code && c.component_code.toLowerCase().includes(bomComponentSearch.toLowerCase()))
                ).map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      // Populate newBom with component data
                      setNewBom({
                        ...newBom,
                        component_name: c.component_name,
                        component_code: c.component_code,
                        unit: c.unit || 'pcs',
                        unit_price: c.unit_price || 0,
                        material: c.material || '',
                        specification: c.specification || '',
                        color: c.color || '',
                        identifying_features: c.identifying_features || '',
                        pic_standard: c.pic_standard || '',
                        note: c.note || ''
                      });
                      setBomComponentSearch(''); // Clear search after selection
                    }}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong>{c.component_name}</strong>
                      <span style={{ marginLeft: 8, fontFamily: 'monospace', color: '#2563eb', fontSize: 12 }}>{c.component_code}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{c.material || '-'}</span>
                  </div>
                ))
              )}
            </div>

            {/* Selected Component Info */}
            {newBom.component_code && (
              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #bbf7d0' }}>
                <div style={{ fontWeight: 600, color: '#166534', marginBottom: 8 }}>✓ Đã chọn: {newBom.component_name} ({newBom.component_code})</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {newBom.material && `Vật liệu: ${newBom.material}`}
                  {newBom.specification && ` | Quy cách: ${newBom.specification}`}
                  {newBom.color && ` | Màu: ${newBom.color}`}
                </div>
              </div>
            )}

            <form onSubmit={handleAddBom}>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng</label>
                  <input type="number" min="1" value={newBom.quantity} onChange={(e) => setNewBom({ ...newBom, quantity: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Ngày cần lk về</label>
                  <input type="date" value={newBom.needed_date} onChange={(e) => setNewBom({ ...newBom, needed_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input value={newBom.note} onChange={(e) => setNewBom({ ...newBom, note: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddBom(false); setNewBom({ component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: '', material: '', specification: '', color: '', identifying_features: '', pic_standard: '', contract_no: '', payment_status: '', order_date: '', needed_date: '' }); }}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={!newBom.component_code}>Lưu</button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3>Sửa linh kiện</h3>
            <form onSubmit={handleEditBom}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên linh kiện</label>
                  <input required value={editBom.component_name} onChange={(e) => setEditBom({ ...editBom, component_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mã linh kiện <span style={{color:'red'}}>*</span></label>
                  <input required value={editBom.component_code || ''} onChange={(e) => setEditBom({ ...editBom, component_code: e.target.value })} placeholder="Bắt buộc" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vật liệu</label>
                  <input value={editBom.material || ''} onChange={(e) => setEditBom({ ...editBom, material: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Quy cách (KTx / Độ dày mm)</label>
                  <input value={editBom.specification || ''} onChange={(e) => setEditBom({ ...editBom, specification: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Màu sắc</label>
                  <input value={editBom.color || ''} onChange={(e) => setEditBom({ ...editBom, color: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Đặc điểm nhận dạng</label>
                  <input value={editBom.identifying_features || ''} onChange={(e) => setEditBom({ ...editBom, identifying_features: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tiêu chuẩn (P.I.C / Tình trạng)</label>
                  <input value={editBom.pic_standard || ''} onChange={(e) => setEditBom({ ...editBom, pic_standard: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Hợp đồng</label>
                  <input value={editBom.contract_no || ''} onChange={(e) => setEditBom({ ...editBom, contract_no: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Thanh toán</label>
                  <input value={editBom.payment_status || ''} onChange={(e) => setEditBom({ ...editBom, payment_status: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ngày đặt hàng</label>
                  <input type="date" value={editBom.order_date || ''} onChange={(e) => setEditBom({ ...editBom, order_date: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày cần lk về</label>
                  <input type="date" value={editBom.needed_date || ''} onChange={(e) => setEditBom({ ...editBom, needed_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Số lượng</label>
                  <input type="number" min="1" value={editBom.quantity} onChange={(e) => setEditBom({ ...editBom, quantity: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Đơn vị</label>
                  <input value={editBom.unit} onChange={(e) => setEditBom({ ...editBom, unit: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Đơn giá</label>
                  <input type="number" min="0" value={editBom.unit_price} onChange={(e) => setEditBom({ ...editBom, unit_price: parseFloat(e.target.value) || 0 })} />
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

      {/* Add/Edit Component Modal */}
      {showAddComponent && (
        <div className="modal-overlay" onClick={() => { setShowAddComponent(false); setEditingComponentId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3>{editingComponentId ? 'Sửa linh kiện' : 'Thêm linh kiện mới'}</h3>
            <form onSubmit={editingComponentId ? handleEditComponent : handleAddComponent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên linh kiện</label>
                  <input required value={newComponent.component_name} onChange={(e) => setNewComponent({ ...newComponent, component_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mã linh kiện <span style={{ color: 'red' }}>*</span></label>
                  <input required value={newComponent.component_code} onChange={(e) => setNewComponent({ ...newComponent, component_code: e.target.value })} placeholder="Bắt buộc, duy nhất" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vật liệu</label>
                  <input value={newComponent.material} onChange={(e) => setNewComponent({ ...newComponent, material: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Quy cách (KTx / Độ dày mm)</label>
                  <input value={newComponent.specification} onChange={(e) => setNewComponent({ ...newComponent, specification: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Màu sắc</label>
                  <input value={newComponent.color} onChange={(e) => setNewComponent({ ...newComponent, color: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Đặc điểm nhận dạng</label>
                  <input value={newComponent.identifying_features} onChange={(e) => setNewComponent({ ...newComponent, identifying_features: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tiêu chuẩn (P.I.C / Tình trạng)</label>
                  <input value={newComponent.pic_standard} onChange={(e) => setNewComponent({ ...newComponent, pic_standard: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Đơn vị</label>
                  <input value={newComponent.unit} onChange={(e) => setNewComponent({ ...newComponent, unit: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Đơn giá</label>
                  <input type="number" min="0" value={newComponent.unit_price} onChange={(e) => setNewComponent({ ...newComponent, unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input value={newComponent.note} onChange={(e) => setNewComponent({ ...newComponent, note: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddComponent(false); setEditingComponentId(null); }}>Hủy</button>
                <button type="submit" className="btn-primary">{editingComponentId ? 'Lưu thay đổi' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
