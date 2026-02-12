import { useEffect, useState } from 'react';
import { api } from '../api';

export default function HistoryPage() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/clients').then((rows) => {
      setClients(rows);
      if (rows[0]) setClientId(rows[0].ClientID);
    });
  }, []);

  useEffect(() => {
    if (clientId) api(`/history/${clientId}`).then(setHistory);
  }, [clientId]);

  const updateRow = async (row) => {
    await api(`/history/${row.HistoryID}`, {
      method: 'PUT',
      body: JSON.stringify({ actionType: row.ActionType, actionDetails: row.ActionDetails, editedBy: row.EditedBy }),
    });
    setMsg('History row updated.');
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Delete history row?')) return;
    await api(`/history/${id}`, { method: 'DELETE' });
    setHistory(history.filter((h) => h.HistoryID !== id));
    setMsg('History row deleted.');
  };

  return (
    <section className="panel">
      <h2>History Manager</h2>
      {msg && <div className="success">{msg}</div>}
      <select style={{ maxWidth: 460 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
        {clients.map((c) => <option key={c.ClientID} value={c.ClientID}>{c.ClientName} ({c.ClientID})</option>)}
      </select>

      <table>
        <thead><tr><th>ID</th><th>Action Type</th><th>Details</th><th>Edited By</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.HistoryID}>
              <td>{h.HistoryID}</td>
              <td><input value={h.ActionType || ''} onChange={(e) => setHistory(history.map((r) => r.HistoryID === h.HistoryID ? { ...r, ActionType: e.target.value } : r))} /></td>
              <td><input value={h.ActionDetails || ''} onChange={(e) => setHistory(history.map((r) => r.HistoryID === h.HistoryID ? { ...r, ActionDetails: e.target.value } : r))} /></td>
              <td><input value={h.EditedBy || ''} onChange={(e) => setHistory(history.map((r) => r.HistoryID === h.HistoryID ? { ...r, EditedBy: e.target.value } : r))} /></td>
              <td>{h.CreatedAt}</td>
              <td className="actions-row"><button className="fit" onClick={() => updateRow(h)}>Save</button><button className="fit" onClick={() => deleteRow(h.HistoryID)}>Delete</button></td>
            </tr>
          ))}
          {history.length === 0 && <tr><td colSpan={6}>No history rows.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
