import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../api';

const COLORS = ['#4caf50', '#2196f3', '#9e9e9e', '#ff9800', '#f44336', '#9c27b0'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getReports().then(setData).catch(err => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="loading">Loading reports...</div>;

  const { techAssignments, clientSummary, statusDistribution, packageDistribution } = data;

  const pieData = [
    { name: 'Completed', value: statusDistribution.completed || 0 },
    { name: 'In Progress', value: statusDistribution.inProgress || 0 },
    { name: 'Not Started', value: statusDistribution.notStarted || 0 },
    { name: 'Stalled', value: statusDistribution.stalled || 0 },
    { name: 'Cancelled', value: statusDistribution.cancelled || 0 },
    { name: 'Pending Update', value: statusDistribution.pendingNewVersion || 0 },
  ].filter(d => d.value > 0);

  const barData = techAssignments.map(t => ({
    name: `${t.FirstName} ${t.LastName}`,
    Total: t.totalClients,
    Completed: t.completed || 0,
    'In Progress': t.inProgress || 0,
    Stalled: t.stalled || 0,
  }));

  return (
    <div className="page-reports">
      <h1>Reports</h1>

      {/* Tech Assignments */}
      <div className="report-section">
        <h2>Tech Assignments</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Technician</th>
                <th>Total Clients</th>
                <th>Completed</th>
                <th>In Progress</th>
                <th>Stalled</th>
                <th>Cancelled</th>
                <th>Avg Progress</th>
              </tr>
            </thead>
            <tbody>
              {techAssignments.map(t => (
                <tr key={t.UserID}>
                  <td>{t.FirstName} {t.LastName}</td>
                  <td>{t.totalClients}</td>
                  <td>{t.completed || 0}</td>
                  <td>{t.inProgress || 0}</td>
                  <td>{t.stalled || 0}</td>
                  <td>{t.cancelled || 0}</td>
                  <td>{t.avgProgress || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center">No data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Tech Workload</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total" fill="#2196f3" />
                <Bar dataKey="Completed" fill="#4caf50" />
                <Bar dataKey="In Progress" fill="#ff9800" />
                <Bar dataKey="Stalled" fill="#f44336" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center">No data available</p>
          )}
        </div>
      </div>

      {/* Client Summary */}
      <div className="report-section">
        <h2>Client Summary</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Client ID</th>
                <th>Name</th>
                <th>Tech</th>
                <th>Sales Rep</th>
                <th>Package</th>
                <th>Progress</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {clientSummary.map(c => (
                <tr key={c.ClientID}>
                  <td>{c.ClientID}</td>
                  <td>{c.ClientName}</td>
                  <td>{c.TechName || 'Unassigned'}</td>
                  <td>{c.SalesRepName || 'N/A'}</td>
                  <td>{c.Package}</td>
                  <td>{c.Progress}%</td>
                  <td>{c.DateAdded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
