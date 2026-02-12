import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/reports').then(setData); }, []);
  if (!data) return <div className="container">Loading reports...</div>;

  return (
    <div className="container">
      <h2>Reports</h2>
      <div className="grid">
        <div className="card">Total: {data.statusSummary.total_clients}</div>
        <div className="card">Completed: {data.statusSummary.completed}</div>
        <div className="card">In Progress: {data.statusSummary.in_progress}</div>
      </div>
      <h3>Tech Assignments</h3>
      <table>
        <thead><tr><th>Tech</th><th>Assigned Clients</th></tr></thead>
        <tbody>{data.techAssignments.map((t, i) => <tr key={i}><td>{t.FirstName} {t.LastName}</td><td>{t.AssignedClients}</td></tr>)}</tbody>
      </table>
      <h3>Package Mix</h3>
      <table>
        <thead><tr><th>Package</th><th>Count</th></tr></thead>
        <tbody>{data.packageMix.map((p, i) => <tr key={i}><td>{p.Package || '(none)'}</td><td>{p.count}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
