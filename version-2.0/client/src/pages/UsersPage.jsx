import { useEffect, useState } from 'react';
import { api } from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', firstName: '', lastName: '', email: '', role: 'tech', department: 2, spanish: false });
  const [message, setMessage] = useState('');

  const load = () => api('/users').then(setUsers).catch((e) => setMessage(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api('/users', { method: 'POST', body: JSON.stringify(form) });
    setMessage('User created');
    load();
  };

  return (
    <div className="container">
      <h2>User Management</h2>
      {message && <div>{message}</div>}
      <form onSubmit={create} className="form-row">
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="admin">admin</option><option value="sales">sales</option><option value="tech">tech</option>
        </select>
        <button type="submit">Create</button>
      </form>
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Assigned Clients</th></tr></thead>
        <tbody>{users.map((u) => <tr key={u.UserID}><td>{u.FirstName} {u.LastName}</td><td>{u.Role}</td><td>{u.Department}</td><td>{u.assigned_clients}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
