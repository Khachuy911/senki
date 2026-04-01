import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const result = await window.api.login(username, password);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const logout = () => setUser(null);

  const canEdit = () => user && (user.role === 'admin' || user.role === 'engineer');
  const canDelete = () => user && user.role === 'admin';
  const canManageUsers = () => user && user.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, canEdit, canDelete, canManageUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
