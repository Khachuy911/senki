import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', full_name: '' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => { setUsers(await window.api.getUsers()); };

  const handleAdd = async (e) => {
    e.preventDefault();
    const result = await window.api.createUser(newUser);
    if (result.success) {
      await window.api.logAudit({
        user_id: user.id, username: user.username,
        action: 'CREATE', table_name: 'users', record_id: null,
        old_values: null, new_values: JSON.stringify({ username: newUser.username, role: newUser.role, full_name: newUser.full_name })
      });
      setNewUser({ username: '', password: '', role: 'user', full_name: '' });
      setShowAdd(false);
      loadUsers();
    } else {
      alert(result.message || 'Lỗi khi tạo tài khoản');
    }
  };

  const handleDelete = async (id) => {
    if (id === user.id) { alert('Không thể xóa tài khoản đang đăng nhập!'); return; }
    if (!confirm('Xác nhận xóa tài khoản này?')) return;
    await window.api.deleteUser(id);
    await window.api.logAudit({
      user_id: user.id, username: user.username,
      action: 'DELETE', table_name: 'users', record_id: id,
      old_values: null, new_values: null
    });
    loadUsers();
  };

  const roleLabel = { admin: 'Quản trị viên', engineer: 'Kỹ sư', user: 'Nhân viên' };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Quản lý người dùng</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Thêm tài khoản</button>
        </div>
      </div>

      <div className="panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên đăng nhập</th>
                <th>Họ tên</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.full_name || '—'}</td>
                  <td><span className="badge badge-info">{roleLabel[u.role] || u.role}</span></td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td>
                    <button
                      className="btn-icon btn-danger-icon"
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === user.id}
                      title={u.id === user.id ? 'Không thể xóa chính mình' : 'Xóa'}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo tài khoản mới</h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group"><label>Tên đăng nhập</label><input required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} /></div>
                <div className="form-group"><label>Mật khẩu</label><input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Họ tên</label><input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} /></div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="admin">Quản trị viên</option>
                    <option value="engineer">Kỹ sư</option>
                    <option value="user">Nhân viên</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
