import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const ALL_PROGRAMS = [
  { key: 'prog_1040', label: '1040 - Individual Tax Returns' },
  { key: 'prog_Depreciation', label: 'Depreciation' },
  { key: 'prog_Proforma', label: 'Proforma' },
  { key: 'prog_1120', label: '1120 - C-Corp Returns' },
  { key: 'prog_1120S', label: '1120S - S-Corp Returns' },
  { key: 'prog_1065', label: '1065 - Partnership Returns' },
  { key: 'prog_1041', label: '1041 - Trust/Estate Returns' },
  { key: 'prog_706Estate', label: '706 - Estate Tax' },
  { key: 'prog_709Gift', label: '709 - Gift Tax' },
  { key: 'prog_990Exempt', label: '990 - Exempt Organization' },
  { key: 'prog_DocArk', label: 'DocArk - Document Management' },
  { key: 'prog_1099Acc', label: '1099 - Accounting' },
];

export default function AddClient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [techs, setTechs] = useState([]);
  const [users, setUsers] = useState([]);
  const [customPackages, setCustomPackages] = useState([]);
  const [success, setSuccess] = useState('');
  const [uploadToken, setUploadToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    dateAdded: new Date().toISOString().split('T')[0],
    assignedTech: '',
    salesRep: '',
    email: '',
    phoneNumber: '',
    previousSoftware: '',
    conversionNeeded: false,
    spanish: false,
    bankEnrollment: false,
    package: 'Individual',
    readyToCall: false,
    calledPaygo: false,
    notes: '',
    customPrograms: [],
  });

  useEffect(() => {
    api.getTechs().then(setTechs).catch(() => {});
    api.getUsers().then(setUsers).catch(() => {});
    api.getPackages().then(setCustomPackages).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'package') {
      // When selecting a saved custom package, pre-populate the programs
      const pkg = customPackages.find(p => p.PackageName === value);
      if (pkg) {
        setForm(prev => ({ ...prev, package: value, customPrograms: pkg.Programs || [] }));
        return;
      }
    }
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProgramToggle = (progKey) => {
    setForm(prev => ({
      ...prev,
      customPrograms: prev.customPrograms.includes(progKey)
        ? prev.customPrograms.filter(p => p !== progKey)
        : [...prev.customPrograms, progKey],
    }));
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/upload/${uploadToken}`;
    navigator.clipboard.writeText(link).then(() => {
      const btn = document.getElementById('copy-link-btn');
      if (btn) {
        btn.textContent = 'Copied!';
        btn.style.background = '#28a745';
        setTimeout(() => {
          btn.textContent = 'Copy Upload Link';
          btn.style.background = '';
        }, 2000);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploadToken('');
    setLoading(true);
    try {
      const result = await api.createClient({
        ...form,
        assignedTech: form.assignedTech ? parseInt(form.assignedTech) : null,
        salesRep: form.salesRep ? parseInt(form.salesRep) : user.userId,
      });
      setSuccess(`Client "${form.clientName}" added successfully!`);
      setUploadToken(result.uploadToken);
      setForm({
        clientId: '', clientName: '', dateAdded: new Date().toISOString().split('T')[0],
        assignedTech: '', salesRep: '', email: '', phoneNumber: '',
        previousSoftware: '', conversionNeeded: false, spanish: false,
        bankEnrollment: false, package: 'Individual', readyToCall: false,
        calledPaygo: false, notes: '', customPrograms: [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isStandardPackage = ['Individual', 'Business', 'Professional'].includes(form.package);
  const showProgramCheckboxes = form.package === 'Custom' || (!isStandardPackage && form.package !== 'Individual');

  return (
    <div className="page-add-client">
      <h1>Add New Client</h1>

      {success && (
        <div className="alert alert-success">
          <div>{success}</div>
          {uploadToken && (
            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>Upload Link:</strong>
              <code style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: 4, fontSize: 13 }}>
                {`${window.location.origin}/upload/${uploadToken}`}
              </code>
              <button id="copy-link-btn" className="btn btn-sm" onClick={handleCopyLink} type="button">
                Copy Upload Link
              </button>
            </div>
          )}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-row">
          <div className="form-group">
            <label>Date Added</label>
            <input type="date" name="dateAdded" value={form.dateAdded} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Client ID *</label>
            <input type="text" name="clientId" value={form.clientId} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Client Name *</label>
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
            <label>Assigned Technician</label>
            <select name="assignedTech" value={form.assignedTech} onChange={handleChange}>
              <option value="">Auto-assign (Round Robin)</option>
              {techs.map(t => (
                <option key={t.UserID} value={t.UserID}>
                  {t.FirstName} {t.LastName} {t.Spanish ? '(Spanish)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Sales Rep</label>
            <select name="salesRep" value={form.salesRep} onChange={handleChange}>
              <option value="">Current User</option>
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
              <optgroup label="Standard Packages">
                <option value="Individual">Individual</option>
                <option value="Business">Business</option>
                <option value="Professional">Professional</option>
              </optgroup>
              {customPackages.length > 0 && (
                <optgroup label="Custom Packages">
                  {customPackages.map(p => (
                    <option key={p.PackageID} value={p.PackageName}>{p.PackageName}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Other">
                <option value="Custom">Custom (One-time Selection)</option>
              </optgroup>
            </select>
          </div>
        </div>

        {showProgramCheckboxes && (
          <div className="form-group">
            <label>Select Programs</label>
            <div className="checkbox-grid">
              {ALL_PROGRAMS.map(p => (
                <label key={p.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.customPrograms.includes(p.key)}
                    onChange={() => handleProgramToggle(p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="form-row">
          <label className="checkbox-label">
            <input type="checkbox" name="conversionNeeded" checked={form.conversionNeeded} onChange={handleChange} />
            Data Conversion Needed
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="spanish" checked={form.spanish} onChange={handleChange} />
            Spanish Speaking
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="bankEnrollment" checked={form.bankEnrollment} onChange={handleChange} />
            Bank Enrollment
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="readyToCall" checked={form.readyToCall} onChange={handleChange} />
            Ready to Call
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="calledPaygo" checked={form.calledPaygo} onChange={handleChange} />
            Called Paygo
          </label>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows="4"></textarea>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Adding Client...' : 'Add Client'}
        </button>
      </form>
    </div>
  );
}
