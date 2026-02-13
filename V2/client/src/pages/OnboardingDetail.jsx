import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const CHECKLIST_SECTIONS = [
  {
    title: 'Pre-Installation Preparation',
    items: [
      { field: 'ConfirmContactInfo', label: 'Confirm Contact Information', description: 'Verify client email, phone number, and preferred contact method' },
      { field: 'ReviewRequirements', label: 'Review Requirements', description: 'Review software and hardware requirements with the client' },
      { field: 'ScheduleAppointment', label: 'Schedule Appointment', description: 'Schedule the installation appointment with the client' },
    ],
  },
  {
    title: 'Download & Installation',
    items: [
      { field: 'DownloadSoftware', label: 'Download Software', description: 'Download the latest software version' },
      { field: 'InformClient', label: 'Inform Client', description: 'Inform the client about the download and installation process' },
      { field: 'StartInstallation', label: 'Start Installation', description: 'Begin the software installation process' },
    ],
  },
  {
    title: 'Setup & Configuration',
    items: [
      { field: 'EnterUserID', label: 'Enter User ID', description: 'Enter the client User ID in the software' },
      { field: 'ConfigureSettings', label: 'Configure Settings', description: 'Configure software settings according to client needs' },
      { field: 'ManageUserAccounts', label: 'Manage User Accounts', description: 'Set up user accounts within the software' },
    ],
  },
  {
    title: 'Testing & Demonstration',
    items: [
      { field: 'RunSoftware', label: 'Run Software', description: 'Run the software to ensure it works properly' },
      { field: 'ProvideWalkthrough', label: 'Provide Walkthrough', description: 'Walk the client through the software interface' },
      { field: 'DemonstrateTasks', label: 'Demonstrate Tasks', description: 'Demonstrate common tasks and workflows' },
    ],
  },
  {
    title: 'Client Data Conversion',
    conditional: 'ConversionNeeded',
    items: [
      { field: 'VerifyPlanData', label: 'Verify Plan Data', description: 'Verify the data conversion plan with the client' },
      { field: 'ExecuteConversion', label: 'Execute Conversion', description: 'Execute the data conversion process' },
      { field: 'VerifyIntegrity', label: 'Verify Integrity', description: 'Verify data integrity after conversion' },
      { field: 'TransferSetupData', label: 'Transfer Setup Data', description: 'Transfer setup data from previous software' },
    ],
  },
  {
    title: 'Final Steps',
    items: [
      { field: 'ContactSupport', label: 'Contact Support', description: 'Provide support contact information to the client' },
      { field: 'OfferResources', label: 'Offer Resources', description: 'Offer additional resources and documentation' },
      { field: 'ProvideTrainingInfo', label: 'Provide Training Info', description: 'Provide information about training opportunities' },
      { field: 'ScheduleFollowUp', label: 'Schedule Follow-Up', description: 'Schedule a follow-up call or meeting' },
    ],
  },
];

export default function OnboardingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClient();
  }, [id]);

  const loadClient = async () => {
    try {
      const data = await api.getClient(id);
      setClient(data);
      setNotes(data.details?.Notes || '');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChecklistChange = async (field, currentValue) => {
    try {
      const result = await api.updateChecklist(id, field, !currentValue);
      setClient(prev => ({
        ...prev,
        [field]: !currentValue ? 1 : 0,
        Progress: result.progress,
        Completed: result.completed,
        CompletedUntilNewVersion: result.completedUntilNewVersion,
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await api.updateClientDetails(id, { notes });
      setSaving(false);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!client) return <div className="loading">Loading client details...</div>;

  return (
    <div className="page-onboarding-detail">
      <div className="detail-header">
        <div>
          <h1>{client.ClientName}</h1>
          <p className="detail-subtitle">Client ID: {client.ClientID} | Tech: {client.TechName || 'Unassigned'} | Package: {client.Package}</p>
        </div>
        <div className="detail-progress">
          <div className="progress-circle">
            <span className="progress-value">{client.Progress}%</span>
          </div>
        </div>
      </div>

      <div className="detail-info-grid">
        <div><strong>Email:</strong> {client.Email || 'N/A'}</div>
        <div><strong>Phone:</strong> {client.PhoneNumber || 'N/A'}</div>
        <div><strong>Date Added:</strong> {client.DateAdded}</div>
        <div><strong>Previous Software:</strong> {client.PreviousSoftware || 'N/A'}</div>
        <div><strong>Conversion Needed:</strong> {client.ConversionNeeded ? 'Yes' : 'No'}</div>
        <div><strong>Spanish:</strong> {client.Spanish ? 'Yes' : 'No'}</div>
        <div><strong>Bank Enrollment:</strong> {client.BankEnrollment ? 'Yes' : 'No'}</div>
        <div><strong>Upload Token:</strong> {client.UploadToken}</div>
      </div>

      {/* Checklist */}
      <div className="checklist-sections">
        {CHECKLIST_SECTIONS.map(section => {
          if (section.conditional && !client[section.conditional]) return null;

          return (
            <div key={section.title} className="checklist-section">
              <h3>{section.title}</h3>
              {section.items.map(item => (
                <div
                  key={item.field}
                  className={`checklist-item ${client[item.field] ? 'checked' : ''}`}
                  onClick={() => handleChecklistChange(item.field, client[item.field])}
                >
                  <input
                    type="checkbox"
                    checked={!!client[item.field]}
                    readOnly
                  />
                  <div>
                    <div className="checklist-label">{item.label}</div>
                    <div className="checklist-desc">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Conditional items */}
        {client.BankEnrollment && (
          <div className="checklist-section">
            <h3>Bank Enrollment</h3>
            <div
              className={`checklist-item ${client.CompleteBankEnrollment ? 'checked' : ''}`}
              onClick={() => handleChecklistChange('CompleteBankEnrollment', client.CompleteBankEnrollment)}
            >
              <input type="checkbox" checked={!!client.CompleteBankEnrollment} readOnly />
              <div>
                <div className="checklist-label">Complete Bank Enrollment</div>
                <div className="checklist-desc">Complete the bank enrollment process for the client</div>
              </div>
            </div>
          </div>
        )}

        <div className="checklist-section">
          <h3>Software Update</h3>
          <div
            className={`checklist-item ${client.InstalledNewVersion ? 'checked' : ''}`}
            onClick={() => handleChecklistChange('InstalledNewVersion', client.InstalledNewVersion)}
          >
            <input type="checkbox" checked={!!client.InstalledNewVersion} readOnly />
            <div>
              <div className="checklist-label">Installed New Version</div>
              <div className="checklist-desc">Client has installed the latest software version</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="form-card" style={{ marginTop: '1.5rem' }}>
        <h3>Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="4"
          placeholder="Add notes about this client..."
        />
        <button onClick={handleSaveNotes} className="btn btn-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/dashboard" className="btn">Back to Dashboard</Link>
      </div>
    </div>
  );
}
