const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Auth
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),

  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Products
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id, data) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),

  // BOM
  getBomByProduct: (productId) => ipcRenderer.invoke('bom:getByProduct', productId),
  createBomItem: (data) => ipcRenderer.invoke('bom:create', data),
  updateBomItem: (id, data) => ipcRenderer.invoke('bom:update', id, data),
  deleteBomItem: (id) => ipcRenderer.invoke('bom:delete', id),

  // Components (Master list of components)
  getComponents: () => ipcRenderer.invoke('components:getAll'),
  createComponent: (data) => ipcRenderer.invoke('components:create', data),
  updateComponent: (id, data) => ipcRenderer.invoke('components:update', id, data),
  deleteComponent: (id) => ipcRenderer.invoke('components:delete', id),

  // Inventory
  getInventory: () => ipcRenderer.invoke('inventory:getAll'),
  createInventoryItem: (data) => ipcRenderer.invoke('inventory:create', data),
  updateInventoryItem: (id, data) => ipcRenderer.invoke('inventory:update', id, data),
  deleteInventoryItem: (id) => ipcRenderer.invoke('inventory:delete', id),
  adjustInventory: (data) => ipcRenderer.invoke('inventory:adjust', data),
  autoStockInventory: (data) => ipcRenderer.invoke('inventory:autoStock', data),
  getPendingReservations: () => ipcRenderer.invoke('inventory:getPendingReservations'),

  // Orders
  getOrders: () => ipcRenderer.invoke('orders:getAll'),
  createOrder: (data) => ipcRenderer.invoke('orders:create', data),
  updateOrder: (id, data) => ipcRenderer.invoke('orders:update', id, data),
  deleteOrder: (id) => ipcRenderer.invoke('orders:delete', id),

  // Audit
  getAuditLogs: () => ipcRenderer.invoke('audit:getAll'),
  logAudit: (data) => ipcRenderer.invoke('audit:log', data),

  // Excel
  importExcel: () => ipcRenderer.invoke('excel:import'),
  exportOrders: () => ipcRenderer.invoke('excel:exportOrders'),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:stats'),

  // BOM Copy
  copyBomFromProduct: (sourceProductId, targetProductId) => ipcRenderer.invoke('bom:copyFromProduct', sourceProductId, targetProductId),

  // MRP
  calculateMRP: (planItems) => ipcRenderer.invoke('mrp:calculate', planItems),

  // Purchasing
  getPurchases: () => ipcRenderer.invoke('purchasing:getAll'),
  createPurchases: (items) => ipcRenderer.invoke('purchasing:createMultiple', items),
  updatePurchase: (id, data) => ipcRenderer.invoke('purchasing:update', id, data),
  deletePurchase: (id) => ipcRenderer.invoke('purchasing:delete', id),

  // Purchase Requests
  getPurchaseRequests: () => ipcRenderer.invoke('purchase_requests:getAll'),
  getPurchaseRequestsByProduct: (productId) => ipcRenderer.invoke('purchase_requests:getByProduct', productId),
  deletePurchaseRequest: (id) => ipcRenderer.invoke('purchase_requests:delete', id),
  updatePurchaseRequestStatus: (id, status) => ipcRenderer.invoke('purchase_requests:updateStatus', id, status),

  // Clear All Data
  clearAllData: () => ipcRenderer.invoke('data:clearAll'),
});
