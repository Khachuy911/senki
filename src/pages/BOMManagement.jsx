import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BOMManagement({ defaultTab = 'products', hideTabs = false }) {
  const { user, canEdit, canDelete } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab); // 'products' or 'components'
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
  const [newProduct, setNewProduct] = useState({ name: '', code: '' });
  const [newBom, setNewBom] = useState({
    component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: '',
    material: '', specification: '', color: '', identifying_features: '', pic_standard: '', contract_no: '', payment_status: '', order_date: ''
  });

  // Component state
  const [components, setComponents] = useState([]);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState(null);
  const [newComponent, setNewComponent] = useState({
    component_name: '', component_code: '', unit: 'pcs',
    material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: ''
  });
  // BOM add modal - component search
  const [bomComponentSearch, setBomComponentSearch] = useState('');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

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
      setNewComponent({ component_name: '', component_code: '', unit: 'pcs', material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: '' });
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
      setShowAddComponent(false);
      setNewComponent({ component_name: '', component_code: '', unit: 'pcs', material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: '' });
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
    setNewProduct({ name: '', code: '' });
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
      setNewBom({ component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: '', material: '', specification: '', color: '', identifying_features: '', pic_standard: '', contract_no: '', payment_status: '', order_date: '' });
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
    setNewProduct({ name: product.name, code: product.code });
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
      quantity: editBom.quantity,
    });
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'UPDATE', table_name: 'bom_items', record_id: editBom.id,
      old_values: JSON.stringify(oldItem),
      new_values: JSON.stringify({ quantity: editBom.quantity })
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

  // Determine which tab to show when hideTabs is true
  const effectiveTab = hideTabs ? defaultTab : activeTab;

  const showTabs = !hideTabs;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{effectiveTab === 'products' ? 'Sản phẩm & BOM' : 'Linh kiện'}</h1>
        <div className="page-actions">
          {/* Tabs */}
          {showTabs && (
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
          )}
          {canEdit() && effectiveTab === 'products' && (
            <>
              <button className="btn-success" onClick={handleImportExcel}>📥 Import Excel</button>
              <button className="btn-primary" onClick={() => { setEditingProductId(null); setNewProduct({ name: '', code: '' }); setShowAddProduct(true); }}>+ Thêm sản phẩm</button>
              <button className="btn-secondary" disabled={!selectedProduct} onClick={() => { if (selectedProduct) { setEditingProductId(selectedProduct.id); setNewProduct({ name: selectedProduct.name, code: selectedProduct.code || '' }); setShowAddProduct(true); } }}>✏️ Sửa sản phẩm</button>
            </>
          )}
          {canEdit() && effectiveTab === 'components' && (
            <button className="btn-primary" onClick={() => { setEditingComponentId(null); setNewComponent({ component_name: '', component_code: '', unit: 'pcs', unit_price: 0, material: '', specification: '', color: '', identifying_features: '', pic_standard: '', note: '' }); setShowAddComponent(true); }}>+ Thêm linh kiện</button>
          )}
        </div>
      </div>

      {effectiveTab === 'products' && (
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
                      <th>SL</th>
                      <th>Đơn vị</th>
                      <th>Đặc điểm</th>
                      {canEdit() && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bomItems.map((item, i) => (
                        <tr key={item.id}>
                          <td>{i + 1}</td>
                          <td>{item.component_name}</td>
                          <td>{item.component_code}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>
                            {item.identifying_features ? (
                              <img src={item.identifying_features} alt="Đặc điểm" style={{ width: 40, cursor: 'pointer' }} onClick={() => window.open(item.identifying_features)} />
                            ) : '-'}
                          </td>
                          {canEdit() && (
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-icon btn-edit-icon" onClick={() => openEditBom(item)} title="Sửa">✎</button>
                                {canDelete() && <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteBom(item.id)} title="Xóa">✕</button>}
                              </div>
                            </td>
                          )}
                        </tr>
                    ))}
                    {bomItems.length === 0 && (
                      <tr><td colSpan={canEdit() ? 7 : 6} className="empty-state">Chưa có linh kiện nào</td></tr>
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
      {effectiveTab === 'components' && (
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
                  <th>Đơn vị</th>
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
                    <td>
                      {c.identifying_features ? (
                        <img src={c.identifying_features} alt="Đặc điểm" style={{ width: 50, cursor: 'pointer' }} onClick={() => window.open(c.identifying_features)} />
                      ) : '-'}
                    </td>
                    <td>{c.pic_standard || '-'}</td>
                    <td>{c.unit || 'pcs'}</td>
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
                  <tr><td colSpan={canEdit() ? 11 : 10} className="empty-state">Chưa có linh kiện nào. Nhấn "+ Thêm linh kiện" để tạo mới.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={() => { setShowAddProduct(false); setEditingProductId(null); setNewProduct({ name: '', code: '' }); }}>
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

            {/* Component List - Loc bo nhung lk da co trong BOM */}
            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
              {components.filter(c =>
                !bomItems.some(b => b.component_code === c.component_code) &&
                (c.component_name.toLowerCase().includes(bomComponentSearch.toLowerCase()) ||
                (c.component_code && c.component_code.toLowerCase().includes(bomComponentSearch.toLowerCase())))
              ).length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                  {components.length === 0 ? 'Chưa có linh kiện nào. Hãy thêm linh kiện trong tab "Linh kiện" trước.' : 'Không tìm thấy linh kiện'}
                </div>
              ) : (
                components.filter(c =>
                  !bomItems.some(b => b.component_code === c.component_code) &&
                  (c.component_name.toLowerCase().includes(bomComponentSearch.toLowerCase()) ||
                  (c.component_code && c.component_code.toLowerCase().includes(bomComponentSearch.toLowerCase())))
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
              <div className="form-group">
                <label>Số lượng</label>
                <input type="number" min="1" value={newBom.quantity} onChange={(e) => setNewBom({ ...newBom, quantity: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input value={newBom.note} onChange={(e) => setNewBom({ ...newBom, note: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddBom(false); setNewBom({ component_name: '', component_code: '', quantity: 1, unit: 'pcs', unit_price: 0, vat_rate: 0.08, note: '', material: '', specification: '', color: '', identifying_features: '', pic_standard: '', contract_no: '', payment_status: '', order_date: '' }); }}>Hủy</button>
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

      {/* Edit BOM Item Modal - Chi cho phep update so luong */}
      {showEditBom && editBom && (
        <div className="modal-overlay" onClick={() => setShowEditBom(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sửa số lượng linh kiện</h3>
            <div style={{ marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
              <div><strong>{editBom.component_name}</strong></div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Mã: {editBom.component_code}</div>
              <div style={{ fontSize: 13 }}>Đơn vị: {editBom.unit} | Đặc điểm: {editBom.identifying_features ? 'Có hình' : '-'}</div>
            </div>
            <form onSubmit={handleEditBom}>
              <div className="form-group">
                <label>Số lượng</label>
                <input type="number" min="1" value={editBom.quantity} onChange={(e) => setEditBom({ ...editBom, quantity: parseInt(e.target.value) || 1 })} />
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setNewComponent({ ...newComponent, identifying_features: ev.target.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {newComponent.identifying_features && (
                    <img src={newComponent.identifying_features} alt="Preview" style={{ width: 100, marginTop: 8 }} />
                  )}
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
