import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import HistoryPage from './pages/HistoryPage';

function Private({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      api('/auth/me').then(setMe).catch(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const authed = Boolean(localStorage.getItem('token'));

  return (
    <div>
      {authed && (
        <header className="top-header">
          <div className="brand">Taxware Onboarding v2</div>
          <nav className="nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/clients">Sales / Clients</Link>
            <Link to="/reports">Reports</Link>
            <Link to="/history">History</Link>
            {(me?.role === 'admin' || me?.role === 'sales') && <Link to="/settings">Settings</Link>}
            {me?.role === 'admin' && <Link to="/users">Users</Link>}
            <button onClick={logout}>Logout</button>
          </nav>
        </header>
      )}

      <main className="page-container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Private><DashboardPage /></Private>} />
          <Route path="/clients" element={<Private><ClientsPage /></Private>} />
          <Route path="/clients/:clientId" element={<Private><ClientDetailPage /></Private>} />
          <Route path="/reports" element={<Private><ReportsPage /></Private>} />
          <Route path="/history" element={<Private><HistoryPage /></Private>} />
          <Route path="/settings" element={<Private><SettingsPage /></Private>} />
          <Route path="/users" element={<Private><UsersPage /></Private>} />
          <Route path="*" element={<Navigate to={authed ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
