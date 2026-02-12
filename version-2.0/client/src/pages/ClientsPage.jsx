import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const emptyForm = {
  clientId: '',
  clientName: '',
  dateAdded: new Date().toISOString().slice(0, 10),
  assignedTech: '',
  salesRep: '',
  email: '',
  phoneNumber: '',
  previousSoftware: '',
  conversionNeeded: 'No',
  spanish: 'No',
  bankEnrollment: 'No',
  packageName: 'Individual Package',
  readyToCall: true,
  notes: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [techs, setTechs] = useState([]);
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({});

  const load = async () => {
    const [cs, us] = await Promise.all([api('/clients'), api('/users/directory')]);
    setClients(cs);
    setTechs(us.filter((u) => Number(u.Department) === 2));
    setSales(us.filter((u) => Number(u.Department) === 1));
  };

  useEffect(() => { load(); }, []);

  const addClient = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api('/clients', { method: 'POST', body: JSON.stringify(form) });
      setForm(emptyForm);
      setMessage('Client added successfully.');
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      String(c.ClientID).toLowerCase().includes(q)
      || String(c.ClientName || '').toLowerCase().includes(q)
      || String(c.PhoneNumber || '').toLowerCase().includes(q)
      || String(c.SalesRep || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected clients?`)) return;
    await api('/clients/bulk-delete', { method: 'POST', body: JSON.stringify({ clientIds: selectedIds }) });
    setSelected({});
    setMessage(`${selectedIds.length} clients deleted.`);
    load();
  };

  return (
    <>
      <section className="panel">
        <h2>Sales Intake - Add Client</h2>
        {message && <div className={message.includes('deleted') || message.includes('success') ? 'success' : 'error'}>{message}</div>}
        <form onSubmit={addClient}>
          <div className="form-grid">
            <input placeholder="Client ID" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required />
            <input placeholder="Client Name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
            <input type="date" value={form.dateAdded} onChange={(e) => setForm({ ...form, dateAdded: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
            <input placeholder="Previous Software" value={form.previousSoftware} onChange={(e) => setForm({ ...form, previousSoftware: e.target.value })} />
            <select value={form.assignedTech} onChange={(e) => setForm({ ...form, assignedTech: e.target.value })} required>
              <option value="">Assign Tech</option>
              {techs.map((t) => <option key={t.UserID} value={t.UserID}>{t.FirstName} {t.LastName}</option>)}
            </select>
            <select value={form.salesRep} onChange={(e) => setForm({ ...form, salesRep: e.target.value })}>
              <option value="">Sales Rep</option>
              {sales.map((s) => <option key={s.UserID} value={s.UserID}>{s.FirstName} {s.LastName}</option>)}
            </select>
            <select value={form.packageName} onChange={(e) => setForm({ ...form, packageName: e.target.value })}>
              <option>Individual Package</option>
              <option>Business Package</option>
              <option>Professional Package</option>
              <option>Custom Package</option>
            </select>
            <select value={form.conversionNeeded} onChange={(e) => setForm({ ...form, conversionNeeded: e.target.value })}><option>No</option><option>Yes</option></select>
            <select value={form.bankEnrollment} onChange={(e) => setForm({ ...form, bankEnrollment: e.target.value })}><option>No</option><option>Yes</option></select>
            <select value={form.spanish} onChange={(e) => setForm({ ...form, spanish: e.target.value })}><option>No</option><option>Yes</option></select>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="primary" type="submit">Add Client</button>
        </form>
      </section>

      <section className="panel">
        <div className="actions-row">
          <input className="fit" style={{ maxWidth: 360 }} placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="fit" onClick={() => setSelected(Object.fromEntries(filtered.map((c) => [c.ClientID, true])))}>Select All</button>
          <button className="fit" onClick={() => setSelected({})}>Clear</button>
          <button className="fit primary" onClick={bulkDelete}>Delete Selected ({selectedIds.length})</button>
        </div>

        <table>
          <thead>
            <tr><th></th><th>Client ID</th><th>Name</th><th>Tech</th><th>Sales</th><th>Progress</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.ClientID}>
                <td><input type="checkbox" checked={Boolean(selected[c.ClientID])} onChange={(e) => setSelected({ ...selected, [c.ClientID]: e.target.checked })} /></td>
                <td>{c.ClientID}</td>
                <td>{c.ClientName}</td>
                <td>{c.AssignedTech || '-'}</td>
                <td>{c.SalesRep || '-'}</td>
                <td>{Math.round(c.Progress || 0)}%</td>
                <td>{c.Cancelled ? 'Cancelled' : c.Stalled ? 'Stalled' : c.Completed ? 'Completed' : 'Active'}</td>
                <td><Link to={`/clients/${c.ClientID}`}>Detail / Edit</Link></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8}>No clients found.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
