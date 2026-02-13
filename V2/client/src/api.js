const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Clients
  getClients: () => request('/clients'),
  getClient: (id) => request(`/clients/${encodeURIComponent(id)}`),
  createClient: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => request(`/clients/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClients: (clientIds) => request('/clients', { method: 'DELETE', body: JSON.stringify({ clientIds }) }),
  updateChecklist: (id, field, value) => request(`/clients/${encodeURIComponent(id)}/checklist`, { method: 'PATCH', body: JSON.stringify({ field, value }) }),
  updateClientStatus: (id, field, value) => request(`/clients/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ field, value }) }),
  updateClientDetails: (id, data) => request(`/clients/${encodeURIComponent(id)}/details`, { method: 'PATCH', body: JSON.stringify(data) }),
  unlockClient: (id) => request(`/clients/${encodeURIComponent(id)}/unlock`, { method: 'POST' }),

  // Users
  getUsers: () => request('/users'),
  getTechs: () => request('/users/techs'),
  getUser: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Reports
  getReports: () => request('/reports'),

  // History
  getHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/history${qs ? `?${qs}` : ''}`);
  },
  updateHistory: (id, data) => request(`/history/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHistory: (id) => request(`/history/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request('/settings'),
  updateSetting: (name, value) => request(`/settings/${name}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  getPackages: () => request('/settings/packages'),
  createPackage: (data) => request('/settings/packages', { method: 'POST', body: JSON.stringify(data) }),
  updatePackage: (id, data) => request(`/settings/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePackage: (id) => request(`/settings/packages/${id}`, { method: 'DELETE' }),

  // Programs
  getPrograms: (clientId) => request(`/programs/${encodeURIComponent(clientId)}`),
  updatePrograms: (clientId, programs) => request(`/programs/${encodeURIComponent(clientId)}`, { method: 'PUT', body: JSON.stringify({ programs }) }),

  // Uploads (public - no auth needed)
  getUploadInfo: (token) => fetch(`${API_BASE}/uploads/${token}`).then(r => r.json()),
  uploadFiles: (token, formData) => fetch(`${API_BASE}/uploads/${token}`, { method: 'POST', body: formData }),
};
