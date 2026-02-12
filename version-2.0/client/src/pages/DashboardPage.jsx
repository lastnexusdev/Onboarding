import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function statusBadge(c) {
  if (c.Cancelled) return <span className="badge cancelled">Cancelled</span>;
  if (c.Stalled) return <span className="badge stalled">Stalled</span>;
  if (c.Completed) return <span className="badge completed">Completed</span>;
  return <span className="badge active">In Progress</span>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);

  const load = () => api('/dashboard').then(setData);
  useEffect(() => { load(); }, []);

  const byTech = useMemo(() => {
    if (!data) return [];
    return data.techs.map((t) => ({
      tech: t,
      clients: data.clients.filter((c) => Number(c.AssignedTech) === Number(t.UserID)),
    }));
  }, [data]);

  if (!data) return <div className="panel">Loading dashboard...</div>;

  const { stats } = data;
  return (
    <>
      <section className="panel">
        <h2>Onboarding Dashboard</h2>
        <div className="grid-stats">
          <div className="stat-card"><div className="stat-title">Total Clients</div><div className="stat-number">{stats.total_clients || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Completed</div><div className="stat-number">{stats.completed || 0}</div></div>
          <div className="stat-card"><div className="stat-title">In Progress</div><div className="stat-number">{stats.in_progress || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Not Started</div><div className="stat-number">{stats.not_started || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Stalled</div><div className="stat-number">{stats.stalled || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Cancelled</div><div className="stat-number">{stats.cancelled || 0}</div></div>
        </div>
      </section>

      <section className="panel">
        <div className="legend">
          <span><i style={{ background: '#eee' }} />Cancelled</span>
          <span><i style={{ background: '#d7f4db' }} />Completed</span>
          <span><i style={{ background: '#dce9ff' }} />In Progress</span>
          <span><i style={{ background: '#ffd7d7' }} />Stalled</span>
        </div>
      </section>

      {byTech.map(({ tech, clients }) => (
        <section className="panel" key={tech.UserID}>
          <h3>{tech.FirstName} {tech.LastName} ({clients.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Client ID</th><th>Client Name</th><th>Phone</th><th>Progress</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.ClientID}>
                  <td>{c.ClientID}</td>
                  <td>{c.ClientName}</td>
                  <td>{c.PhoneNumber || '-'}</td>
                  <td className="progress-wrap">
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.round(c.Progress || 0)}%` }} /></div>
                    <small>{Math.round(c.Progress || 0)}%</small>
                  </td>
                  <td>{statusBadge(c)}</td>
                  <td><Link to={`/clients/${c.ClientID}`}>Open</Link></td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={6}>No clients assigned.</td></tr>}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
