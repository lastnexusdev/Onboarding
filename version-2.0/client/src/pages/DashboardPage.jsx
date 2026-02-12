import { useEffect, useState } from 'react';
import { api } from '../api';

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => { api('/dashboard').then(setData); }, []);
  if (!data) return <div className="container">Loading...</div>;

  const { stats, clients } = data;
  return (
    <div className="container">
      <h2>Dashboard</h2>
      <div className="grid">
        <div className="card">Total: {stats.total_clients || 0}</div>
        <div className="card">Completed: {stats.completed || 0}</div>
        <div className="card">In Progress: {stats.in_progress || 0}</div>
        <div className="card">Not Started: {stats.not_started || 0}</div>
        <div className="card">Stalled: {stats.stalled || 0}</div>
        <div className="card">Cancelled: {stats.cancelled || 0}</div>
      </div>
      <h3>Recent Clients</h3>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Progress</th><th>Assigned Tech</th><th>Status</th></tr></thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.ClientID}>
              <td>{c.ClientID}</td>
              <td>{c.ClientName}</td>
              <td>{c.Progress}%</td>
              <td>{c.AssignedTech}</td>
              <td>{c.Cancelled ? 'Cancelled' : c.Stalled ? 'Stalled' : c.Completed ? 'Completed' : 'Active'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
