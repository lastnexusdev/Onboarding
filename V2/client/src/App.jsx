import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddClient from './pages/AddClient';
import EditClient from './pages/EditClient';
import RemoveClients from './pages/RemoveClients';
import OnboardingDetail from './pages/OnboardingDetail';
import ClientDetails from './pages/ClientDetails';
import Reports from './pages/Reports';
import History from './pages/History';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Upload from './pages/Upload';

function AppLayout({ children }) {
  const { user } = useAuth();
  return (
    <>
      {user && <Header />}
      <main className={user ? 'app-main' : ''}>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/upload/:token" element={<Upload />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/add-client" element={<ProtectedRoute roles={['admin', 'sales']}><AddClient /></ProtectedRoute>} />
            <Route path="/edit-client" element={<ProtectedRoute roles={['admin', 'sales']}><EditClient /></ProtectedRoute>} />
            <Route path="/remove-clients" element={<ProtectedRoute roles={['admin', 'sales']}><RemoveClients /></ProtectedRoute>} />
            <Route path="/onboarding/:id" element={<ProtectedRoute><OnboardingDetail /></ProtectedRoute>} />
            <Route path="/client/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={['admin', 'sales']}><Reports /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute roles={['admin']}><History /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute roles={['admin', 'sales']}><Settings /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}
