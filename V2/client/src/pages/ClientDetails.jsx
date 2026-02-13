import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

const PROGRAM_LABELS = {
  prog_1040: '1040',
  prog_Depreciation: 'Depreciation',
  prog_Proforma: 'Proforma',
  prog_1120: '1120',
  prog_1120S: '1120S',
  prog_1065: '1065',
  prog_1041: '1041',
  prog_706Estate: '706Estate',
  prog_709Gift: '709Gift',
  prog_990Exempt: '990Exempt',
  prog_DocArk: 'DocArk',
  prog_1099Acc: '1099Acc',
};

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

  const enabledPrograms = client.programs
    ? Object.entries(PROGRAM_LABELS).filter(([key]) => client.programs[key]).map(([, label]) => label)
    : [];

  return (
    <div className="page-client-details">
      <div className="progress-section" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 10, color: '#8B4513', borderBottom: '2px solid #8B4513', paddingBottom: 10 }}>
          {client.ClientName}
        </h2>
        <p className="detail-subtitle">Client ID: {client.ClientID}</p>
      </div>

      <div className="client-info-panel">
        <h3>Client Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Date Added</strong>
            <span className="value">{client.DateAdded || 'N/A'}</span>
          </div>
          <div className="info-item">
            <strong>Assigned Tech</strong>
            <span className="value">{client.TechName || 'Unassigned'}</span>
          </div>
          <div className="info-item">
            <strong>Sales Rep</strong>
            <span className="value">{client.SalesRepName || 'N/A'}</span>
          </div>
          <div className="info-item">
            <strong>Email</strong>
            <span className="value">{client.Email || 'N/A'}</span>
          </div>
          <div className="info-item">
            <strong>Phone</strong>
            <span className="value">{client.PhoneNumber || 'N/A'}</span>
          </div>
          <div className="info-item">
            <strong>Previous Software</strong>
            <span className="value">{client.PreviousSoftware || 'N/A'}</span>
          </div>
          <div className="info-item">
            <strong>Package</strong>
            <span className="value">{client.Package}</span>
          </div>
          <div className="info-item">
            <strong>Conversion Needed</strong>
            <span className="value">{client.ConversionNeeded ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <strong>Spanish</strong>
            <span className="value">{client.Spanish ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <strong>Bank Enrollment</strong>
            <span className="value">{client.BankEnrollment ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <strong>Ready to Call</strong>
            <span className="value">{client.ReadyToCall ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <strong>Progress</strong>
            <span className="value">{client.Progress}%</span>
          </div>
        </div>
      </div>

      {enabledPrograms.length > 0 && (
        <div className="entitled-programs" style={{ background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.1)', marginBottom: 20 }}>
          <h3>Entitled Programs</h3>
          <ul className="programs-grid">
            {enabledPrograms.map(p => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {client.details?.Notes && (
        <div className="additional-info" style={{ marginTop: 0, marginBottom: 20 }}>
          <h3>Notes</h3>
          <p>{client.details.Notes}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Link to={`/onboarding/${encodeURIComponent(client.ClientID)}`} className="btn">View Checklist</Link>
        <Link to={`/edit-client?id=${encodeURIComponent(client.ClientID)}`} className="btn btn-secondary">Edit Client</Link>
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    </div>
  );
}
