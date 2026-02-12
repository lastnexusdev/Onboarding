import { useEffect, useState } from 'react';
import { api } from '../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [newRelease, setNewRelease] = useState('0');
  const [pkg, setPkg] = useState({ packageName: '', packageDescription: '', programs: '' });
  const [msg, setMsg] = useState('');

  const load = async () => {
    const data = await api('/settings');
    setSettings(data.settings);
    setPackages(data.packages);
    const nr = data.settings.find((s) => s.Setting_Name === 'NewSoftwareRelease');
    setNewRelease(nr?.Setting_Value || '0');
  };
  useEffect(() => { load(); }, []);

  const saveRelease = async () => {
    await api('/settings/NewSoftwareRelease', { method: 'PUT', body: JSON.stringify({ value: newRelease }) });
    setMsg('Software release setting updated.');
    load();
  };

  const addPackage = async (e) => {
    e.preventDefault();
    await api('/settings/packages', {
      method: 'POST',
      body: JSON.stringify({
        packageName: pkg.packageName,
        packageDescription: pkg.packageDescription,
        programs: pkg.programs.split(',').map((x) => x.trim()).filter(Boolean),
      }),
    });
    setPkg({ packageName: '', packageDescription: '', programs: '' });
    setMsg('Custom package added.');
    load();
  };

  const removePackage = async (id) => {
    await api(`/settings/packages/${id}`, { method: 'DELETE' });
    setMsg('Package deleted.');
    load();
  };

  return (
    <>
      <section className="panel">
        <h2>Settings</h2>
        {msg && <div className="success">{msg}</div>}
        <div className="actions-row">
          <label className="fit">New Software Release</label>
          <select className="fit" style={{ maxWidth: 180 }} value={newRelease} onChange={(e) => setNewRelease(e.target.value)}>
            <option value="0">Off</option>
            <option value="1">On</option>
          </select>
          <button className="fit primary" onClick={saveRelease}>Save</button>
        </div>
      </section>

      <section className="panel">
        <h3>Add Custom Package</h3>
        <form onSubmit={addPackage} className="form-grid">
          <input placeholder="Package Name" value={pkg.packageName} onChange={(e) => setPkg({ ...pkg, packageName: e.target.value })} required />
          <input placeholder="Description" value={pkg.packageDescription} onChange={(e) => setPkg({ ...pkg, packageDescription: e.target.value })} />
          <input placeholder="Programs comma-separated (e.g. prog_1040, prog_1120)" value={pkg.programs} onChange={(e) => setPkg({ ...pkg, programs: e.target.value })} />
          <button className="primary" type="submit">Add Package</button>
        </form>
      </section>

      <section className="panel">
        <h3>Custom Packages</h3>
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Programs</th><th>Action</th></tr></thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.PackageID}>
                <td>{p.PackageName}</td><td>{p.PackageDescription}</td><td>{p.Programs}</td>
                <td><button className="fit" onClick={() => removePackage(p.PackageID)}>Delete</button></td>
              </tr>
            ))}
            {packages.length === 0 && <tr><td colSpan={4}>No custom packages.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Raw Settings</h3>
        <table>
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody>{settings.map((s) => <tr key={s.Setting_Name}><td>{s.Setting_Name}</td><td>{s.Setting_Value}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
