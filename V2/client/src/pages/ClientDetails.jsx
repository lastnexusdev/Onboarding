import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ClientDetails() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClient(id)
      .then(setClient)
      .catch(err => setError(err.message));
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!client) return <div className="loading">Loading...</div>;

  const programLabels = {
    prog_1040: '1040 - Individual Tax Returns',
    prog_Depreciation: 'Depreciation',
    prog_Proforma: 'Proforma',
    prog_1120: '1120 - C-Corp Returns',
    prog_1120S: '1120S - S-Corp Returns',
    prog_1065: '1065 - Partnership Returns',
    prog_1041: '1041 - Trust/Estate Returns',
    prog_706Estate: '706 - Estate Tax',
    prog_709Gift: '709 - Gift Tax',
    prog_990Exempt: '990 - Exempt Organization',
    prog_DocArk: 'DocArk - Document Management',
    prog_1099Acc: '1099 - Accounting',
  };

  const enabledPrograms = client.programs
    ? Object.entries(programLabels).filter(([key]) => client.programs[key]).map(([, label]) => label)
    : [];

  return (
    <div className="page-client-details">
      <h1>{client.ClientName}</h1>
      <p className="detail-subtitle">Client ID: {client.ClientID}</p>

      <div className="detail-card">
        <div className="detail-info-grid">
          <div><strong>Date Added:</strong> {client.DateAdded}</div>
          <div><strong>Assigned Tech:</strong> {client.TechName || 'Unassigned'}</div>
          <div><strong>Sales Rep:</strong> {client.SalesRepName || 'N/A'}</div>
          <div><strong>Email:</strong> {client.Email || 'N/A'}</div>
          <div><strong>Phone:</strong> {client.PhoneNumber || 'N/A'}</div>
          <div><strong>Previous Software:</strong> {client.PreviousSoftware || 'N/A'}</div>
          <div><strong>Package:</strong> {client.Package}</div>
          <div><strong>Conversion Needed:</strong> {client.ConversionNeeded ? 'Yes' : 'No'}</div>
          <div><strong>Spanish:</strong> {client.Spanish ? 'Yes' : 'No'}</div>
          <div><strong>Bank Enrollment:</strong> {client.BankEnrollment ? 'Yes' : 'No'}</div>
          <div><strong>Ready to Call:</strong> {client.ReadyToCall ? 'Yes' : 'No'}</div>
          <div><strong>Progress:</strong> {client.Progress}%</div>
        </div>
      </div>

      {enabledPrograms.length > 0 && (
        <div className="detail-card">
          <h3>Entitled Programs</h3>
          <ul>
            {enabledPrograms.map(p => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {client.details?.Notes && (
        <div className="detail-card">
          <h3>Notes</h3>
          <p>{client.details.Notes}</p>
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <Link to={`/onboarding/${encodeURIComponent(client.ClientID)}`} className="btn btn-primary">View Checklist</Link>
        <Link to={`/edit-client?id=${encodeURIComponent(client.ClientID)}`} className="btn">Edit Client</Link>
        <Link to="/dashboard" className="btn">Back to Dashboard</Link>
      </div>
    </div>
  );
}
