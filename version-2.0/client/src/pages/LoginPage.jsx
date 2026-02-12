import { useState } from 'react';
import { api } from '../api';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123!');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 520, margin: '70px auto' }}>
      <h2>Login - Taxware Systems</h2>
      <p className="note">Use your onboarding credentials to continue.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <label>Password</label>
        <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button className="primary" type="submit">Login</button>
      </form>
    </div>
  );
}
