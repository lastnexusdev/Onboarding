import { useState, useEffect } from 'react';
import { api } from '../api';

const ALL_PROGRAMS = [
  { key: 'prog_1040', label: '1040 - Individual' },
  { key: 'prog_Depreciation', label: 'Depreciation' },
  { key: 'prog_Proforma', label: 'Proforma' },
  { key: 'prog_1120', label: '1120 - C-Corp' },
  { key: 'prog_1120S', label: '1120S - S-Corp' },
  { key: 'prog_1065', label: '1065 - Partnership' },
  { key: 'prog_1041', label: '1041 - Trust/Estate' },
  { key: 'prog_706Estate', label: '706 - Estate Tax' },
  { key: 'prog_709Gift', label: '709 - Gift Tax' },
  { key: 'prog_990Exempt', label: '990 - Exempt Org' },
  { key: 'prog_DocArk', label: 'DocArk' },
  { key: 'prog_1099Acc', label: '1099 - Accounting' },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [packages, setPackages] = useState([]);
  const [newPkg, setNewPkg] = useState({ packageName: '', programs: [] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, pkgData] = await Promise.all([api.getSettings(), api.getPackages()]);
      setSettings(settingsData);
      setPackages(pkgData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleSetting = async (name) => {
    const currentVal = settings[name] || '0';
    const newVal = currentVal === '1' ? '0' : '1';
    try {
      await api.updateSetting(name, newVal);
      setSettings(prev => ({ ...prev, [name]: newVal }));
      setSuccess(`Setting "${name}" updated.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    if (!newPkg.packageName) return;
    try {
      await api.createPackage(newPkg);
      setNewPkg({ packageName: '', programs: [] });
      setSuccess('Package created!');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Delete this package?')) return;
    try {
      await api.deletePackage(id);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleNewPkgProgram = (key) => {
    setNewPkg(prev => ({
      ...prev,
      programs: prev.programs.includes(key) ? prev.programs.filter(p => p !== key) : [...prev.programs, key],
    }));
  };

  return (
    <div className="page-settings">
      <h1>Settings</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* System Settings */}
      <div className="form-card">
        <h2>System Settings</h2>

        <div className="setting-row">
          <div>
            <strong>New Software Release</strong>
            <p className="text-muted">When enabled, clients must have "Installed New Version" checked to be marked complete.</p>
          </div>
          <button
            className={`btn ${settings.NewSoftwareRelease === '1' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => handleToggleSetting('NewSoftwareRelease')}
          >
            {settings.NewSoftwareRelease === '1' ? 'Disable' : 'Enable'}
          </button>
        </div>

        <div className="setting-row">
          <div>
            <strong>Default Ready to Call</strong>
            <p className="text-muted">New clients will be marked as "Ready to Call" by default.</p>
          </div>
          <button
            className={`btn ${settings.DefaultReadyToCall === '1' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => handleToggleSetting('DefaultReadyToCall')}
          >
            {settings.DefaultReadyToCall === '1' ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Custom Packages */}
      <div className="form-card">
        <h2>Custom Packages</h2>

        {packages.length > 0 && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Programs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(p => (
                  <tr key={p.PackageID}>
                    <td>{p.PackageName}</td>
                    <td>{Array.isArray(p.Programs) ? p.Programs.join(', ') : ''}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeletePackage(p.PackageID)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>Create New Package</h3>
        <form onSubmit={handleCreatePackage}>
          <div className="form-group">
            <label>Package Name</label>
            <input
              type="text"
              value={newPkg.packageName}
              onChange={(e) => setNewPkg(prev => ({ ...prev, packageName: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>Select Programs</label>
            <div className="checkbox-grid">
              {ALL_PROGRAMS.map(p => (
                <label key={p.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPkg.programs.includes(p.key)}
                    onChange={() => toggleNewPkgProgram(p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Create Package</button>
        </form>
      </div>
    </div>
  );
}
