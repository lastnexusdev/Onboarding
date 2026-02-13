import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    username: '', password: '', firstName: '', lastName: '',
    email: '', role: 'tech', department: 2, spanish: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    api.getUsers().then(setUsers).catch(err => setError(err.message));
  };

  const resetForm = () => {
    setForm({ username: '', password: '', firstName: '', lastName: '', email: '', role: 'tech', department: 2, spanish: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEdit = (user) => {
    setEditingId(user.UserID);
    setForm({
      username: user.Username,
      password: '',
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      role: user.Role,
      department: user.Department,
      spanish: !!user.Spanish,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        const updateData = { ...form };
        if (!updateData.password) delete updateData.password;
        await api.updateUser(editingId, updateData);
        setSuccess('User updated successfully!');
      } else {
        await api.createUser(form);
        setSuccess('User created successfully!');
      }
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id);
      setSuccess('User deleted.');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-users">
      <h1>Manage Users</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }} style={{ marginBottom: '1rem' }}>
        {showForm ? 'Cancel' : 'Add New User'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <h2>{editingId ? 'Edit User' : 'Add New User'}</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Username *</label>
              <input type="text" name="username" value={form.username} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{editingId ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required={!editingId} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="admin">Admin</option>
                <option value="sales">Sales</option>
                <option value="tech">Technician</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <select name="department" value={form.department} onChange={handleChange}>
                <option value={1}>Sales</option>
                <option value={2}>Tech/Implementation</option>
              </select>
            </div>
            <label className="checkbox-label" style={{ alignSelf: 'flex-end', paddingBottom: '0.5rem' }}>
              <input type="checkbox" name="spanish" checked={form.spanish} onChange={handleChange} />
              Spanish Speaking
            </label>
          </div>
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Update User' : 'Create User'}
          </button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Spanish</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.UserID}>
                <td>{u.UserID}</td>
                <td>{u.Username}</td>
                <td>{u.FirstName} {u.LastName}</td>
                <td>{u.Email}</td>
                <td>{u.Role}</td>
                <td>{u.Department === 1 ? 'Sales' : 'Tech'}</td>
                <td>{u.Spanish ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => handleEdit(u)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.UserID)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
