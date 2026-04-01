import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../pages/Dashboard';
import BOMManagement from '../pages/BOMManagement';
import Inventory from '../pages/Inventory';
import Orders from '../pages/Orders';
import AuditLog from '../pages/AuditLog';
import UserManagement from '../pages/UserManagement';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { id: 'bom', label: 'BOM', icon: '📋' },
  { id: 'inventory', label: 'Kho', icon: '📦' },
  { id: 'orders', label: 'Đơn hàng', icon: '🛒' },
  { id: 'audit', label: 'Lịch sử', icon: '📝' },
  { id: 'users', label: 'Người dùng', icon: '👥', adminOnly: true },
];

export default function Layout() {
  const [activePage, setActivePage] = useState('dashboard');
  const { user, logout, canManageUsers } = useAuth();

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || canManageUsers()
  );

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'bom': return <BOMManagement />;
      case 'inventory': return <Inventory />;
      case 'orders': return <Orders />;
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
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
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
