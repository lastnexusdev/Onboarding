import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = {
  clientId: '', clientName: '', assignedTech: '', salesRep: '', email: '', phoneNumber: '', previousSoftware: '',
  conversionNeeded: 'No', spanish: 'No', bankEnrollment: 'No', packageName: 'Individual Package', readyToCall: true,
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [techs, setTechs] = useState([]);
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [cs, us] = await Promise.all([api('/clients'), api('/users/directory')]);
    setClients(cs);
    setTechs(us.filter((u) => Number(u.Department) === 2));
    setSales(us.filter((u) => Number(u.Department) === 1));
  };

  useEffect(() => { load(); }, []);

  const addClient = async (e) => {
    e.preventDefault();
    try {
      await api('/clients', { method: 'POST', body: JSON.stringify(form) });
      setForm(emptyForm);
      setMessage('Client created.');
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="container">
      <h2>Clients</h2>
      {message && <div className="success">{message}</div>}
      <form onSubmit={addClient}>
        <div className="form-row">
          <input placeholder="Client ID" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
          <input placeholder="Client Name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
          <input placeholder="Previous Software" value={form.previousSoftware} onChange={(e) => setForm({ ...form, previousSoftware: e.target.value })} />
          <select value={form.assignedTech} onChange={(e) => setForm({ ...form, assignedTech: e.target.value })}>
            <option value="">Assign Tech</option>
            {techs.map((t) => <option key={t.UserID} value={t.UserID}>{t.FirstName} {t.LastName}</option>)}
          </select>
          <select value={form.salesRep} onChange={(e) => setForm({ ...form, salesRep: e.target.value })}>
            <option value="">Sales Rep</option>
            {sales.map((s) => <option key={s.UserID} value={s.UserID}>{s.FirstName} {s.LastName}</option>)}
          </select>
        </div>
        <button type="submit">Add Client</button>
      </form>

      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Progress</th><th>Package</th></tr></thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.ClientID}><td>{c.ClientID}</td><td>{c.ClientName}</td><td>{c.Progress}%</td><td>{c.Package}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
