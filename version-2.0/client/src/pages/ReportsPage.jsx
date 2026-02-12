import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/reports').then(setData); }, []);
  if (!data) return <div className="panel">Loading reports...</div>;

  return (
    <>
      <section className="panel">
        <h2>Reports</h2>
        <div className="grid-stats">
          <div className="stat-card"><div className="stat-title">Total</div><div className="stat-number">{data.statusSummary.total_clients || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Completed</div><div className="stat-number">{data.statusSummary.completed || 0}</div></div>
          <div className="stat-card"><div className="stat-title">In Progress</div><div className="stat-number">{data.statusSummary.in_progress || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Not Started</div><div className="stat-number">{data.statusSummary.not_started || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Stalled</div><div className="stat-number">{data.statusSummary.stalled || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Cancelled</div><div className="stat-number">{data.statusSummary.cancelled || 0}</div></div>
        </div>
      </section>

      <section className="panel">
        <h3>Tech Assignments</h3>
        <table>
          <thead><tr><th>Tech</th><th>Assigned Clients</th></tr></thead>
          <tbody>{data.techAssignments.map((t, i) => <tr key={i}><td>{t.FirstName} {t.LastName}</td><td>{t.AssignedClients}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Package Mix</h3>
        <table>
          <thead><tr><th>Package</th><th>Count</th></tr></thead>
          <tbody>{data.packageMix.map((p, i) => <tr key={i}><td>{p.Package || '(none)'}</td><td>{p.count}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
