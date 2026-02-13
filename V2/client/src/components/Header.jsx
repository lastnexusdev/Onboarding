import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <img src="https://kb.taxwaresystems.com/logo.png" alt="Taxware" className="header-logo" />
        <span>Onboarding System</span>
      </div>
      <nav className="header-nav">
        <NavLink to="/dashboard">Dashboard</NavLink>
        {hasRole('admin', 'sales') && <NavLink to="/add-client">Add Client</NavLink>}
        {hasRole('admin', 'sales') && <NavLink to="/remove-clients">Remove Clients</NavLink>}
        {hasRole('admin', 'sales') && <NavLink to="/edit-client">Edit Clients</NavLink>}
        {hasRole('admin', 'sales') && <NavLink to="/settings">Settings</NavLink>}
        {hasRole('admin', 'sales') && <NavLink to="/reports">Reports</NavLink>}
        {hasRole('admin') && <NavLink to="/users">Manage Users</NavLink>}
        {hasRole('admin') && <NavLink to="/history">History</NavLink>}
      </nav>
      <div className="header-user">
        <span>{user.firstName} {user.lastName} ({user.role})</span>
        <button onClick={handleLogout} className="btn btn-sm">Logout</button>
      </div>
    </header>
  );
}
