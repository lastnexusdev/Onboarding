import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function EditClient() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('id') || '');
  const [form, setForm] = useState(null);
  const [techs, setTechs] = useState([]);
  const [users, setUsers] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
    api.getTechs().then(setTechs).catch(() => {});
    api.getUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadClient(selectedId);
    }
  }, [selectedId]);

  const loadClient = async (id) => {
    try {
      const client = await api.getClient(id);
      setForm({
        clientId: client.ClientID,
        clientName: client.ClientName,
        assignedTech: client.AssignedTech || '',
        salesRep: client.SalesRep || '',
        email: client.Email,
        phoneNumber: client.PhoneNumber,
        previousSoftware: client.PreviousSoftware,
        conversionNeeded: !!client.ConversionNeeded,
        spanish: !!client.Spanish,
        bankEnrollment: !!client.BankEnrollment,
        package: client.Package,
        readyToCall: !!client.ReadyToCall,
        stalled: !!client.Stalled,
        cancelled: !!client.Cancelled,
        programs: client.programs || {},
      });
      setSearchParams({ id });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProgramToggle = (key) => {
    setForm(prev => ({
      ...prev,
      programs: { ...prev.programs, [key]: prev.programs[key] ? 0 : 1 },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.updateClient(selectedId, {
        clientName: form.clientName,
        assignedTech: form.assignedTech ? parseInt(form.assignedTech) : null,
        salesRep: form.salesRep ? parseInt(form.salesRep) : null,
        email: form.email,
        phoneNumber: form.phoneNumber,
        previousSoftware: form.previousSoftware,
        conversionNeeded: form.conversionNeeded,
        spanish: form.spanish,
        bankEnrollment: form.bankEnrollment,
        package: form.package,
        readyToCall: form.readyToCall,
        stalled: form.stalled,
        cancelled: form.cancelled,
        newClientId: form.clientId !== selectedId ? form.clientId : undefined,
      });

      if (form.programs) {
        await api.updatePrograms(form.clientId || selectedId, form.programs);
      }

      setSuccess('Client updated successfully!');
      const updated = await api.getClients();
      setClients(updated);
      if (form.clientId !== selectedId) {
        setSelectedId(form.clientId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-edit-client">
      <h1>Edit Client</h1>

      <div className="form-group">
        <label>Select Client</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          <option value="">-- Select a client --</option>
          {clients.map(c => (
            <option key={c.ClientID} value={c.ClientID}>
              {c.ClientID} - {c.ClientName}
            </option>
          ))}
        </select>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {form && (
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Client ID</label>
              <input type="text" name="clientId" value={form.clientId} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Client Name</label>
              <input type="text" name="clientName" value={form.clientName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assigned Tech</label>
              <select name="assignedTech" value={form.assignedTech} onChange={handleChange}>
                <option value="">Unassigned</option>
                {techs.map(t => (
                  <option key={t.UserID} value={t.UserID}>{t.FirstName} {t.LastName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Sales Rep</label>
              <select name="salesRep" value={form.salesRep} onChange={handleChange}>
                <option value="">None</option>
                {users.filter(u => u.Role === 'sales' || u.Role === 'admin').map(u => (
                  <option key={u.UserID} value={u.UserID}>{u.FirstName} {u.LastName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Previous Software</label>
              <input type="text" name="previousSoftware" value={form.previousSoftware} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Package</label>
              <select name="package" value={form.package} onChange={handleChange}>
                <option value="Individual">Individual</option>
                <option value="Business">Business</option>
                <option value="Professional">Professional</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input type="checkbox" name="conversionNeeded" checked={form.conversionNeeded} onChange={handleChange} />
              Conversion Needed
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="spanish" checked={form.spanish} onChange={handleChange} />
              Spanish
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="bankEnrollment" checked={form.bankEnrollment} onChange={handleChange} />
              Bank Enrollment
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="readyToCall" checked={form.readyToCall} onChange={handleChange} />
              Ready to Call
            </label>
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input type="checkbox" name="stalled" checked={form.stalled} onChange={handleChange} />
              Stalled
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="cancelled" checked={form.cancelled} onChange={handleChange} />
              Cancelled
            </label>
          </div>

          <div className="form-group">
            <label>Entitled Programs</label>
            <div className="checkbox-grid">
              {ALL_PROGRAMS.map(p => (
                <label key={p.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!form.programs[p.key]}
                    onChange={() => handleProgramToggle(p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
}
