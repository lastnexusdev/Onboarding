import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const CHECKLIST_SECTIONS = [
  {
    title: 'Pre-Installation Preparation',
    items: [
      { field: 'ConfirmContactInfo', label: "Confirm client's name and contact information" },
      { field: 'ReviewRequirements', label: 'Specific requirements and configuration' },
      { field: 'ScheduleAppointment', label: "Schedule Appointment if they don't have time for install at this moment" },
    ],
  },
  {
    title: 'Download',
    items: [
      { field: 'DownloadSoftware', label: 'Download the latest version of Taxware software' },
      { field: 'InformClient', label: 'Inform Client Of New Version And Possible Time Frames' },
      { field: 'StartInstallation', label: 'Complete Installation' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { field: 'EnterUserID', label: 'Enter User-ID into all Software Installed' },
      { field: 'ConfigureSettings', label: "Configure the basic settings as per the client's requirements (SETUP ERO AND PREPARER INFO)" },
      { field: 'ManageUserAccounts', label: 'Provide instructions on how to manage user accounts (Winuser, Passwords)' },
    ],
  },
  {
    title: 'Testing',
    items: [
      { field: 'RunSoftware', label: 'Run the software to ensure it starts correctly' },
      { field: 'ProvideWalkthrough', label: 'Provide a brief walkthrough of the software features' },
      { field: 'DemonstrateTasks', label: 'Demonstrate how to perform basic tasks and use essential functions (Taxware Connect, Videos, Website, Updates)' },
    ],
  },
  {
    title: 'Client Data Conversion',
    conditional: 'ConversionNeeded',
    items: [
      { field: 'VerifyPlanData', label: 'Verify and plan data for conversion' },
      { field: 'ExecuteConversion', label: 'Execute conversion of client data' },
      { field: 'VerifyIntegrity', label: 'Verify the integrity of converted data' },
      { field: 'TransferSetupData', label: 'Transfer and setup data on Client side' },
    ],
  },
  {
    title: 'Final Steps',
    items: [
      { field: 'ContactSupport', label: 'Ensure the client knows how to contact support for further assistance' },
      { field: 'OfferResources', label: 'Offer links to online resources and tutorials' },
      { field: 'ProvideTrainingInfo', label: 'Provide information on upcoming training sessions or webinars' },
      { field: 'ScheduleFollowUp', label: 'Schedule a follow-up call to address any new questions they might have' },
    ],
  },
];

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

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function OnboardingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpCalls, setFollowUpCalls] = useState('');
  const [firstCallout, setFirstCallout] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    loadClient();
  }, [id]);

  const loadClient = async () => {
    try {
      const data = await api.getClient(id);
      setClient(data);
      setNotes(data.details?.Notes || '');
      setFollowUpCalls(data.details?.FollowUpCalls || '');
      setFirstCallout(data.details?.FirstCallout || '');
      setUnlocked(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const isOwner = client && (
    user.role === 'admin' ||
    client.AssignedTech === user.userId ||
    client.SalesRep === user.userId
  );

  const canEdit = isOwner || unlocked;

  const handleUnlock = async () => {
    if (window.confirm('Are you sure? This is not your client. An entry will be added to the client history noting that you unlocked this client.')) {
      try {
        await api.unlockClient(id);
        setUnlocked(true);
        setSuccessMsg('Client unlocked for editing.');
        setTimeout(() => setSuccessMsg(''), 3000);
        loadClient();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleChecklistChange = async (field, currentValue) => {
    if (!canEdit) return;
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

  const handleSaveFirstCallout = async () => {
    if (!firstCallout) return;
    setSaving(true);
    try {
      await api.updateClientDetails(id, { firstCallout });
      setSuccessMsg('First Callout saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadClient();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleSaveFollowUp = async () => {
    setSaving(true);
    try {
      await api.updateClientDetails(id, { followUpCalls });
      setSuccessMsg('Follow Up Calls saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadClient();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await api.updateClientDetails(id, { notes });
      setSuccessMsg('Notes saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadClient();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleCopyUploadLink = () => {
    if (!client?.UploadToken) return;
    const link = `${window.location.origin}/upload/${client.UploadToken}`;
    navigator.clipboard.writeText(link).then(() => {
      const btn = document.getElementById('copy-upload-link-btn');
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

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!client) return <div className="loading">Loading client details...</div>;

  const enabledPrograms = client.programs
    ? Object.entries(PROGRAM_LABELS).filter(([key]) => client.programs[key]).map(([, label]) => label)
    : [];

  const progressPercent = client.Progress || 0;

  return (
    <div className="page-onboarding-detail">
      {/* Page Header */}
      <div className="progress-section" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ marginBottom: 10, color: '#8B4513', borderBottom: '2px solid #8B4513', paddingBottom: 10, flex: 1 }}>
            Onboarding Details for {client.ClientName}
          </h2>
          {!isOwner && !unlocked && (
            <button className="btn btn-danger" onClick={handleUnlock}>
              Unlock for Editing
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {client.Spanish ? <span className="badge badge-spanish">Spanish Speaker</span> : null}
          {client.ConversionNeeded ? <span className="badge badge-conversion">Conversion Needed</span> : null}
          {client.BankEnrollment ? <span className="badge badge-bank">Bank Enrollment</span> : null}
          {unlocked && <span className="badge" style={{ background: '#dc3545', color: 'white' }}>Unlocked</span>}
        </div>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Upload Link & Files */}
      {client.UploadToken && (
        <div className="progress-section" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, color: '#8B4513' }}>File Upload</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <strong>Upload Link:</strong>
            <code style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: 4, fontSize: 13, wordBreak: 'break-all' }}>
              {`${window.location.origin}/upload/${client.UploadToken}`}
            </code>
            <button id="copy-upload-link-btn" className="btn btn-sm" onClick={handleCopyUploadLink} type="button">
              Copy Upload Link
            </button>
          </div>
          {client.uploadedFiles && client.uploadedFiles.length > 0 && (
            <div>
              <strong>Uploaded Files ({client.uploadedFiles.length}):</strong>
              <table className="tech-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {client.uploadedFiles.map((f, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                      <td>{f.name}</td>
                      <td>{formatFileSize(f.size)}</td>
                      <td>{new Date(f.modified).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(!client.uploadedFiles || client.uploadedFiles.length === 0) && (
            <p style={{ color: '#6c757d', margin: 0 }}>No files uploaded yet.</p>
          )}
        </div>
      )}

      {/* Progress Overview */}
      <div className="progress-section">
        <h3 style={{ marginTop: 0, color: '#8B4513' }}>Progress Overview</h3>
        <div className="progress-bar-large">
          <div className="progress-bar-inner" style={{ width: `${progressPercent}%` }}>
            {progressPercent > 10 ? `${progressPercent.toFixed(1)}%` : ''}
          </div>
        </div>
        <p className="progress-percentage">Progress: {progressPercent.toFixed(1)}%</p>
      </div>

      {/* Dual Column: Client Info + Checklist */}
      <div className="dual-column">
        {/* Left: Client Information */}
        <div className="client-info-panel">
          <h3>Client Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Client ID</strong>
              <span className="value">{client.ClientID}</span>
            </div>
            <div className="info-item">
              <strong>Client Name</strong>
              <span className="value">{client.ClientName}</span>
            </div>
            <div className="info-item">
              <strong>Phone Number</strong>
              <span className="value">{client.PhoneNumber || 'N/A'}</span>
            </div>
            <div className="info-item">
              <strong>Email</strong>
              <span className="value">{client.Email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <strong>Sales Rep</strong>
              <span className="value">{client.SalesRepName || 'N/A'}</span>
            </div>
            <div className="info-item">
              <strong>Assigned Tech</strong>
              <span className="value">{client.TechName || 'Unassigned'}</span>
            </div>
            <div className="info-item">
              <strong>Previous Software</strong>
              <span className="value">{client.PreviousSoftware || 'N/A'}</span>
            </div>
            <div className="info-item">
              <strong>Package</strong>
              <span className="value">{client.Package}</span>
            </div>
          </div>

          {/* Entitled Programs */}
          <div className="entitled-programs">
            <h3>Entitled Programs</h3>
            {enabledPrograms.length === 0 ? (
              <p style={{ color: '#6c757d' }}>No entitled programs found.</p>
            ) : (
              <ul className="programs-grid">
                {enabledPrograms.map(p => <li key={p}>{p}</li>)}
              </ul>
            )}
          </div>

          {/* Additional Information */}
          <div className="additional-info">
            <h3>Additional Information</h3>
            <div className="form-group">
              <label>First Callout</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="date"
                  value={firstCallout}
                  onChange={(e) => setFirstCallout(e.target.value)}
                  disabled={!canEdit || !!client.details?.FirstCallout}
                />
                {canEdit && !client.details?.FirstCallout && (
                  <button onClick={handleSaveFirstCallout} className="btn btn-sm" disabled={saving || !firstCallout}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
                {client.details?.FirstCallout && (
                  <span style={{ color: '#28a745', fontWeight: 600, fontSize: 13 }}>Completed</span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Follow Up Calls</label>
              <textarea
                value={followUpCalls}
                onChange={(e) => setFollowUpCalls(e.target.value)}
                placeholder="Enter follow-up call notes..."
                disabled={!canEdit}
              />
              {canEdit && (
                <button onClick={handleSaveFollowUp} className="btn btn-sm" disabled={saving} style={{ marginTop: 8 }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this client..."
                disabled={!canEdit}
              />
              {canEdit && (
                <button onClick={handleSaveNotes} className="btn btn-sm" disabled={saving} style={{ marginTop: 8 }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Onboarding Checklist */}
        <div className="checklist-panel">
          <h3>Onboarding Checklist</h3>
          {!canEdit && (
            <div className="alert alert-info" style={{ marginBottom: 15 }}>
              You can view this checklist but cannot make changes. Click "Unlock for Editing" to edit.
            </div>
          )}
          {CHECKLIST_SECTIONS.map(section => {
            if (section.conditional && !client[section.conditional]) return null;
            return (
              <div key={section.title}>
                <h4 className="checklist-section-header">{section.title}</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {section.items.map(item => (
                    <li
                      key={item.field}
                      className={`checklist-item ${client[item.field] ? 'checked' : ''}`}
                      onClick={() => handleChecklistChange(item.field, client[item.field])}
                      style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={!!client[item.field]}
                        readOnly
                        disabled={!canEdit}
                      />
                      <span className="checklist-label">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Bank Enrollment */}
          {client.BankEnrollment ? (
            <div>
              <h4 className="checklist-section-header">Bank Enrollment</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li
                  className={`checklist-item ${client.CompleteBankEnrollment ? 'checked' : ''}`}
                  onClick={() => handleChecklistChange('CompleteBankEnrollment', client.CompleteBankEnrollment)}
                  style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
                >
                  <input type="checkbox" checked={!!client.CompleteBankEnrollment} readOnly disabled={!canEdit} />
                  <span className="checklist-label">Complete Bank Enrollment</span>
                </li>
              </ul>
            </div>
          ) : null}

          {/* Software Update */}
          <div>
            <h4 className="checklist-section-header">Software Update</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li
                className={`checklist-item ${client.InstalledNewVersion ? 'checked' : ''}`}
                onClick={() => handleChecklistChange('InstalledNewVersion', client.InstalledNewVersion)}
                style={!canEdit ? { cursor: 'default', opacity: 0.7 } : undefined}
              >
                <input type="checkbox" checked={!!client.InstalledNewVersion} readOnly disabled={!canEdit} />
                <span className="checklist-label">Installed New Version</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Client History */}
      {client.history && client.history.length > 0 && (
        <div className="progress-section" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0, color: '#8B4513', borderBottom: '2px solid #8B4513', paddingBottom: 10 }}>
            Client History
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="tech-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Edited By</th>
                </tr>
              </thead>
              <tbody>
                {client.history.map(h => (
                  <tr key={h.HistoryID} style={{ cursor: 'default' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(h.DateEdited).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${
                        h.ActionType === 'Client Unlocked' ? 'status-cancelled' :
                        h.ActionType === 'Client Added' ? 'status-completed' :
                        h.ActionType === 'Checklist Updated' ? 'status-inprogress' :
                        'status-notstarted'
                      }`}>
                        {h.ActionType}
                      </span>
                    </td>
                    <td>{h.ActionDetails}</td>
                    <td>{h.EditedByName || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: 10 }}>
        <Link to="/dashboard" className="btn">Back to Dashboard</Link>
        <Link to={`/edit-client?id=${encodeURIComponent(client.ClientID)}`} className="btn btn-secondary">Edit Client</Link>
      </div>
    </div>
  );
}
