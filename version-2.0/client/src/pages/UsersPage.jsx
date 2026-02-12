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
    setForm({ username: '', password: '', firstName: '', lastName: '', email: '', role: 'tech', department: 2, spanish: false });
    load();
  };

  const update = async (user) => {
    await api(`/users/${user.UserID}`, {
      method: 'PUT',
      body: JSON.stringify({
        username: user.Username,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        role: user.Role,
        department: user.Department,
        spanish: Boolean(user.Spanish),
      }),
    });
    setMessage('User updated');
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete user?')) return;
    await api(`/users/${id}`, { method: 'DELETE' });
    setMessage('User deleted');
    load();
  };

  return (
    <>
      <section className="panel">
        <h2>User Management</h2>
        {message && <div className="success">{message}</div>}
        <form onSubmit={create} className="form-grid">
          <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="admin">admin</option><option value="sales">sales</option><option value="tech">tech</option></select>
          <select value={form.department} onChange={(e) => setForm({ ...form, department: Number(e.target.value) })}><option value={0}>0-Admin</option><option value={1}>1-Sales</option><option value={2}>2-Tech</option></select>
          <button className="primary" type="submit">Create User</button>
        </form>
      </section>

      <section className="panel">
        <table>
          <thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Assigned</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.UserID}>
                <td><input value={u.Username} onChange={(e) => setUsers(users.map((x) => x.UserID === u.UserID ? { ...x, Username: e.target.value } : x))} /></td>
                <td>
                  <input value={u.FirstName} onChange={(e) => setUsers(users.map((x) => x.UserID === u.UserID ? { ...x, FirstName: e.target.value } : x))} />
                  <input value={u.LastName} onChange={(e) => setUsers(users.map((x) => x.UserID === u.UserID ? { ...x, LastName: e.target.value } : x))} />
                </td>
                <td><input value={u.Email || ''} onChange={(e) => setUsers(users.map((x) => x.UserID === u.UserID ? { ...x, Email: e.target.value } : x))} /></td>
                <td><select value={u.Role} onChange={(e) => setUsers(users.map((x) => x.UserID === u.UserID ? { ...x, Role: e.target.value } : x))}><option value="admin">admin</option><option value="sales">sales</option><option value="tech">tech</option></select></td>
                <td><select value={u.Department} onChange={(e) => setUsers(users.map((x) => x.UserID === u.UserID ? { ...x, Department: Number(e.target.value) } : x))}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></td>
                <td>{u.assigned_clients}</td>
                <td className="actions-row"><button className="fit" onClick={() => update(u)}>Save</button><button className="fit" onClick={() => remove(u.UserID)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
