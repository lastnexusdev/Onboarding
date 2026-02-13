import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function getStatusLabel(client) {
  if (client.Cancelled) return { text: 'Cancelled', cls: 'status-cancelled' };
  if (client.Stalled) return { text: 'Stalled', cls: 'status-stalled' };
  if (client.Completed) return { text: 'Completed', cls: 'status-completed' };
  if (client.CompletedUntilNewVersion) return { text: 'Pending New Version', cls: 'status-pending' };
  if (client.Progress > 0) return { text: 'In Progress', cls: 'status-inprogress' };
  return { text: 'Not Started', cls: 'status-notstarted' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard().then(setData).catch(err => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="loading">Loading dashboard...</div>;

  const { stats, clients, techRoster, newSoftwareRelease } = data;

  return (
    <div className="page-dashboard">
      <h1>Dashboard</h1>
      {newSoftwareRelease && (
        <div className="alert alert-info">New software version has been released. Clients may need to install the update.</div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalClients}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="stat-card stat-completed">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card stat-inprogress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card stat-notstarted">
          <div className="stat-value">{stats.notStarted}</div>
          <div className="stat-label">Not Started</div>
        </div>
        <div className="stat-card stat-stalled">
          <div className="stat-value">{stats.stalled}</div>
          <div className="stat-label">Stalled</div>
        </div>
        <div className="stat-card stat-cancelled">
          <div className="stat-value">{stats.cancelled}</div>
          <div className="stat-label">Cancelled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgProgress}%</div>
          <div className="stat-label">Avg Progress</div>
        </div>
        {stats.pendingNewVersion > 0 && (
          <div className="stat-card stat-pending">
            <div className="stat-value">{stats.pendingNewVersion}</div>
            <div className="stat-label">Pending New Version</div>
          </div>
        )}
      </div>

      <h2>Clients</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Client Name</th>
              <th>Tech</th>
              <th>Phone</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const status = getStatusLabel(c);
              return (
                <tr key={c.ClientID} style={c.RowColor ? { backgroundColor: c.RowColor } : undefined}>
                  <td>{c.ClientID}</td>
                  <td>{c.ClientName}</td>
                  <td>{c.TechName || 'Unassigned'}</td>
                  <td>{c.PhoneNumber}</td>
                  <td>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${c.Progress}%` }}></div>
                      <span>{c.Progress}%</span>
                    </div>
                  </td>
                  <td><span className={`status-badge ${status.cls}`}>{status.text}</span></td>
                  <td>
                    <Link to={`/onboarding/${encodeURIComponent(c.ClientID)}`} className="btn btn-sm">View</Link>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && (
              <tr><td colSpan="7" className="text-center">No clients found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {user.role !== 'tech' && techRoster.length > 0 && (
        <>
          <h2>Tech Roster</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Spanish</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {techRoster.map(t => (
                  <tr key={t.UserID}>
                    <td>{t.FirstName} {t.LastName}</td>
                    <td>{t.Spanish ? 'Yes' : 'No'}</td>
                    <td>{t.clientCount}</td>
                    <td>{t.completedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
