import { useState, useEffect } from 'react';
import { api } from '../api';

function getStatusLabel(client) {
  if (client.Cancelled) return 'Cancelled';
  if (client.Stalled) return 'Stalled';
  if (client.Completed) return 'Completed';
  if (client.CompletedUntilNewVersion) return 'Pending';
  if (client.Progress > 0) return 'In Progress';
  return 'Not Started';
}

export default function RemoveClients() {
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    api.getClients().then(setClients).catch(err => setError(err.message));
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === clients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map(c => c.ClientID)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selected.size} client(s)? This cannot be undone.`)) return;

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.deleteClients([...selected]);
      setSuccess(`${selected.size} client(s) deleted successfully.`);
      setSelected(new Set());
      loadClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-remove-clients">
      <h1>Remove Clients</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {selected.size > 0 && (
        <div className="action-bar">
          <span>{selected.size} selected</span>
          <button onClick={handleDelete} className="btn btn-danger" disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" checked={selected.size === clients.length && clients.length > 0} onChange={toggleAll} /></th>
              <th>Client ID</th>
              <th>Client Name</th>
              <th>Status</th>
              <th>Tech</th>
              <th>Phone</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.ClientID} className={selected.has(c.ClientID) ? 'row-selected' : ''}>
                <td><input type="checkbox" checked={selected.has(c.ClientID)} onChange={() => toggleSelect(c.ClientID)} /></td>
                <td>{c.ClientID}</td>
                <td>{c.ClientName}</td>
                <td>{getStatusLabel(c)}</td>
                <td>{c.TechName || 'Unassigned'}</td>
                <td>{c.PhoneNumber}</td>
                <td>{c.Progress}%</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan="7" className="text-center">No clients found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
