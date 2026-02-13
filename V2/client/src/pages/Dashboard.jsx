import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function getRowColor(client) {
  if (client.Cancelled) return '#D3D3D3';
  if (client.Completed) return '#d4edda';
  if (client.CompletedUntilNewVersion) return '#cfe2ff';
  if (client.Stalled) return '#FFB5B3';
  if (client.Progress > 0) return '#fff3cd';
  return '';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [techRoster, setTechRoster] = useState([]);
  const [newSoftwareRelease, setNewSoftwareRelease] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getClients()])
      .then(([dashData, clientsData]) => {
        setStats(dashData.stats);
        setTechRoster(dashData.techRoster || []);
        setNewSoftwareRelease(dashData.newSoftwareRelease);
        setClients(clientsData);
      })
      .catch(err => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <div className="loading">Loading dashboard...</div>;

  // Group clients by assigned tech
  const clientsByTech = {};
  clients.forEach(c => {
    const techId = c.AssignedTech || 'unassigned';
    if (!clientsByTech[techId]) clientsByTech[techId] = [];
    clientsByTech[techId].push(c);
  });

  // Build tech sections from techRoster
  const techSections = techRoster.map(tech => {
    const techClients = clientsByTech[tech.UserID] || [];
    const completedCount = techClients.filter(c => c.Progress === 100).length;
    const activeCount = techClients.filter(c => c.Progress > 0 && c.Progress < 100).length;
    return {
      id: tech.UserID,
      name: `${tech.FirstName} ${tech.LastName}`,
      totalCount: techClients.length,
      completedCount,
      activeCount,
      clients: techClients,
    };
  });

  // For tech users, show a single section with their clients
  const isTech = user.role === 'tech';
  const sectionsToRender = isTech
    ? [{ id: user.userId, name: `${user.firstName} ${user.lastName}`, totalCount: clients.length, completedCount: clients.filter(c => c.Progress === 100).length, activeCount: clients.filter(c => c.Progress > 0 && c.Progress < 100).length, clients }]
    : techSections;

  const totalPercent = (val) => stats.totalClients > 0 ? ((val / stats.totalClients) * 100).toFixed(1) + '% of total' : '0%';

  return (
    <div className="page-dashboard">
      <h2>Tech Dashboard</h2>

      {newSoftwareRelease && (
        <div className="alert alert-info">New software version has been released. Clients may need to install the update.</div>
      )}

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card total">
          <div className="stat-label-text">Total Clients</div>
          <div className="number">{stats.totalClients}</div>
          <div className="percentage">All active clients</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-label-text">Completed</div>
          <div className="number">{stats.completed}</div>
          <div className="percentage">{totalPercent(stats.completed)}</div>
        </div>
        <div className="stat-card in-progress">
          <div className="stat-label-text">In Progress</div>
          <div className="number">{stats.inProgress}</div>
          <div className="percentage">{totalPercent(stats.inProgress)}</div>
        </div>
        <div className="stat-card not-started">
          <div className="stat-label-text">Not Started</div>
          <div className="number">{stats.notStarted}</div>
          <div className="percentage">{totalPercent(stats.notStarted)}</div>
        </div>
        <div className="stat-card stalled">
          <div className="stat-label-text">Stalled</div>
          <div className="number">{stats.stalled}</div>
          <div className="percentage">Needs attention</div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-label-text">Cancelled</div>
          <div className="number">{stats.cancelled}</div>
          <div className="percentage">Inactive</div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="legend">
        <h4>Status Legend:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#D3D3D3' }}></div>
            <span className="legend-label">Cancelled</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#d4edda' }}></div>
            <span className="legend-label">Completed</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#cfe2ff' }}></div>
            <span className="legend-label">Completed Until New Version</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fff3cd' }}></div>
            <span className="legend-label">In Progress</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FFB5B3' }}></div>
            <span className="legend-label">Stalled</span>
          </div>
        </div>
      </div>

      {/* Tech Sections */}
      <div className="tech-container">
        {sectionsToRender.map(section => (
          <div key={section.id} className="tech-box">
            <div className="tech-header">
              <h3>{section.name}</h3>
              <div className="tech-stats">
                <span className="tech-stat">{section.totalCount} Total</span>
                <span className="tech-stat">{section.completedCount} Complete</span>
                <span className="tech-stat">{section.activeCount} Active</span>
              </div>
            </div>
            <table className="tech-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Client Name</th>
                  <th>Phone</th>
                  <th>Progress</th>
                  <th>Completed</th>
                  <th>Conversion</th>
                  <th>Sales Rep</th>
                  <th>Package</th>
                </tr>
              </thead>
              <tbody>
                {section.clients.length > 0 ? (
                  section.clients.map(c => {
                    const rowColor = getRowColor(c);
                    return (
                      <tr
                        key={c.ClientID}
                        style={rowColor ? { backgroundColor: rowColor } : undefined}
                        onClick={() => navigate(`/onboarding/${encodeURIComponent(c.ClientID)}`)}
                      >
                        <td><strong>{c.ClientID}</strong></td>
                        <td>{c.ClientName}</td>
                        <td>{c.PhoneNumber}</td>
                        <td>
                          <div className="progress-cell">
                            <div className="mini-progress-bar">
                              <div className="mini-progress-fill" style={{ width: `${c.Progress}%` }}></div>
                            </div>
                            <span className="progress-text">{c.Progress}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${c.Completed ? 'status-yes' : 'status-no'}`}>
                            {c.Completed ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>{c.ConversionNeeded ? 'Yes' : 'No'}</td>
                        <td>{c.SalesRepName || 'N/A'}</td>
                        <td>{c.Package}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8">
                      <div className="no-clients">
                        <h4>No Clients Assigned</h4>
                        <p>This technician has no active clients.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
