import { useEffect, useState } from 'react';
import { api } from '../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [newRelease, setNewRelease] = useState('0');

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
    load();
  };

  return (
    <div className="container">
      <h2>Settings</h2>
      <div className="card">
        <h4>New Software Release</h4>
        <select value={newRelease} onChange={(e) => setNewRelease(e.target.value)}>
          <option value="0">Off</option>
          <option value="1">On</option>
        </select>
        <button onClick={saveRelease}>Save</button>
      </div>

      <h3>Custom Packages</h3>
      <table>
        <thead><tr><th>Name</th><th>Description</th><th>Programs</th></tr></thead>
        <tbody>{packages.map((p) => <tr key={p.PackageID}><td>{p.PackageName}</td><td>{p.PackageDescription}</td><td>{p.Programs}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
