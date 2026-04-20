const { registerAuthHandlers } = require('./auth');
const { registerUserHandlers } = require('./users');
const { registerProductHandlers } = require('./products');
const { registerBomHandlers } = require('./bom');
const { registerInventoryHandlers } = require('./inventory');
const { registerOrderHandlers } = require('./orders');
const { registerPurchasingHandlers } = require('./purchasing');
const { registerMrpHandlers } = require('./mrp');
const { registerAuditHandlers } = require('./audit');
const { registerMiscHandlers } = require('./misc');
const { registerComponentHandlers } = require('./components');
const { registerCcdcHandlers } = require('./ccdc');

function registerAllHandlers(ipcMain, db, app) {
  registerAuthHandlers(ipcMain, db);
  registerUserHandlers(ipcMain, db);
  registerProductHandlers(ipcMain, db);
  registerBomHandlers(ipcMain, db);
  registerInventoryHandlers(ipcMain, db);
  registerOrderHandlers(ipcMain, db);
  registerPurchasingHandlers(ipcMain, db);
  registerMrpHandlers(ipcMain, db);
  registerAuditHandlers(ipcMain, db);
  registerMiscHandlers(ipcMain, db, app);
  registerComponentHandlers(ipcMain, db);
  registerCcdcHandlers(ipcMain, db);
}

module.exports = { registerAllHandlers };
