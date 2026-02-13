import { useState, useEffect } from 'react';
import { api } from '../api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ clientId: '', userId: '', limit: 50, offset: 0 });
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ actionType: '', actionDetails: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
    api.getUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const loadHistory = async () => {
    try {
      const params = {};
      if (filters.clientId) params.clientId = filters.clientId;
      if (filters.userId) params.userId = filters.userId;
      params.limit = filters.limit;
      params.offset = filters.offset;

      const data = await api.getHistory(params);
      setHistory(data.history);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.HistoryID);
    setEditForm({ actionType: entry.ActionType, actionDetails: entry.ActionDetails });
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateHistory(editingId, editForm);
      setEditingId(null);
      loadHistory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this history entry?')) return;
    try {
      await api.deleteHistory(id);
      loadHistory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePageChange = (direction) => {
    setFilters(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset + (direction * prev.limit)),
    }));
  };

  return (
    <div className="page-history">
      <h1>Audit History</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-bar">
        <div className="form-group">
          <label>Filter by Client</label>
          <select value={filters.clientId} onChange={e => setFilters(prev => ({ ...prev, clientId: e.target.value, offset: 0 }))}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.ClientID} value={c.ClientID}>{c.ClientID} - {c.ClientName}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Filter by User</label>
          <select value={filters.userId} onChange={e => setFilters(prev => ({ ...prev, userId: e.target.value, offset: 0 }))}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.UserID} value={u.UserID}>{u.FirstName} {u.LastName}</option>)}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Action</th>
              <th>Details</th>
              <th>Edited By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.HistoryID}>
                <td>{new Date(h.DateEdited).toLocaleString()}</td>
                <td>{h.ClientID}</td>
                <td>
                  {editingId === h.HistoryID ? (
                    <input value={editForm.actionType} onChange={e => setEditForm(prev => ({ ...prev, actionType: e.target.value }))} />
                  ) : h.ActionType}
                </td>
                <td>
                  {editingId === h.HistoryID ? (
                    <input value={editForm.actionDetails} onChange={e => setEditForm(prev => ({ ...prev, actionDetails: e.target.value }))} style={{ width: '100%' }} />
                  ) : h.ActionDetails}
                </td>
                <td>{h.EditedByName || 'System'}</td>
                <td>
                  {editingId === h.HistoryID ? (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>Save</button>
                      <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-sm" onClick={() => handleEdit(h)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(h.HistoryID)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan="6" className="text-center">No history entries found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm" disabled={filters.offset === 0} onClick={() => handlePageChange(-1)}>Previous</button>
        <span>Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, total)} of {total}</span>
        <button className="btn btn-sm" disabled={filters.offset + filters.limit >= total} onClick={() => handlePageChange(1)}>Next</button>
      </div>
    </div>
  );
}
