import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';

function Private({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      api('/auth/me').then(setMe).catch(() => {
        localStorage.removeItem('token');
      });
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div>
      {localStorage.getItem('token') && (
        <nav className="nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/clients">Clients</Link>
          <Link to="/reports">Reports</Link>
          {(me?.role === 'admin' || me?.role === 'sales') && <Link to="/settings">Settings</Link>}
          {me?.role === 'admin' && <Link to="/users">Users</Link>}
          <button onClick={logout}>Logout</button>
        </nav>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Private><DashboardPage /></Private>} />
        <Route path="/clients" element={<Private><ClientsPage /></Private>} />
        <Route path="/reports" element={<Private><ReportsPage /></Private>} />
        <Route path="/settings" element={<Private><SettingsPage /></Private>} />
        <Route path="/users" element={<Private><UsersPage /></Private>} />
        <Route path="*" element={<Navigate to={localStorage.getItem('token') ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </div>
  );
}
