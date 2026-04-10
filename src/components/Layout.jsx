import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../pages/Dashboard';
import BOMManagement from '../pages/BOMManagement';
import Inventory from '../pages/Inventory';
import Orders from '../pages/Orders';
import AuditLog from '../pages/AuditLog';
import UserManagement from '../pages/UserManagement';
import ProductionPlanning from '../pages/ProductionPlanning';
import Purchasing from '../pages/Purchasing';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { id: 'orders', label: 'Đơn hàng', icon: '🛒' },
  { id: 'planning', label: 'Kế hoạch', icon: '⚙️' },
  { id: 'purchasing', label: 'Mua hàng', icon: '🛒' },
  { id: 'bom', label: 'BOM', icon: '📋', hasSubmenu: true },
  { id: 'inventory', label: 'Kho', icon: '📦' },
  { id: 'audit', label: 'Lịch sử', icon: '📝' },
  { id: 'users', label: 'Người dùng', icon: '👥', adminOnly: true },
];

const BOM_SUBMENU = [
  { id: 'products', label: 'Sản phẩm', icon: '📦' },
  { id: 'components', label: 'Linh kiện', icon: '🔧' },
];

export default function Layout() {
  const [activePage, setActivePage] = useState('dashboard');
  const [bomSubmenu, setBomSubmenu] = useState('products');
  const [bomExpanded, setBomExpanded] = useState(true);
  const { user, logout, canManageUsers } = useAuth();

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || canManageUsers()
  );

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'bom': return <BOMManagement defaultTab={bomSubmenu} hideTabs />;
      case 'inventory': return <Inventory />;
      case 'orders': return <Orders />;
      case 'planning': return <ProductionPlanning />;
      case 'purchasing': return <Purchasing />;
      case 'audit': return <AuditLog />;
      case 'users': return <UserManagement />;
      default: return <Dashboard />;
    }
  };

  const roleLabel = {
    admin: 'Quản trị viên',
    engineer: 'Kỹ sư',
    user: 'Nhân viên',
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>SENKI</h2>
          <span className="sidebar-subtitle">BOM Manager</span>
        </div>

        <nav className="sidebar-nav">
          {filteredNav.map((item) => (
            <div key={item.id} className="nav-group">
              <button
                className={`nav-item ${activePage === item.id ? 'active' : ''} ${item.hasSubmenu ? 'has-submenu' : ''}`}
                onClick={() => {
                  if (item.hasSubmenu) {
                    setBomExpanded(!bomExpanded);
                  } else {
                    setActivePage(item.id);
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.hasSubmenu && (
                  <span className="nav-arrow">{bomExpanded ? '▼' : '▶'}</span>
                )}
              </button>

              {item.hasSubmenu && bomExpanded && (
                <div className="submenu">
                  {BOM_SUBMENU.map((sub) => (
                    <button
                      key={sub.id}
                      className={`submenu-item ${activePage === 'bom' && bomSubmenu === sub.id ? 'active' : ''}`}
                      onClick={() => {
                        setBomSubmenu(sub.id);
                        setActivePage('bom');
                      }}
                    >
                      <span className="nav-icon">{sub.icon}</span>
                      <span className="nav-label">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user.full_name || user.username}</div>
            <div className="user-role">{roleLabel[user.role]}</div>
          </div>
          <button className="btn-logout" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
