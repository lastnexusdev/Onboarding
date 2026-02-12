import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

const CHECKLIST = [
  'ConfirmContactInfo', 'ReviewRequirements', 'ScheduleAppointment', 'DownloadSoftware', 'InformClient',
  'StartInstallation', 'EnterUserID', 'ConfigureSettings', 'ManageUserAccounts', 'RunSoftware',
  'ProvideWalkthrough', 'DemonstrateTasks', 'ContactSupport', 'OfferResources', 'ProvideTrainingInfo',
  'ScheduleFollowUp', 'VerifyPlanData', 'ExecuteConversion', 'VerifyIntegrity', 'TransferSetupData',
  'CompleteBankEnrollment', 'InstalledNewVersion',
];

const PROGRAMS = ['prog_1040','prog_Depreciation','prog_Proforma','prog_1120','prog_1120S','prog_1065','prog_1041','prog_706Estate','prog_709Gift','prog_990Exempt','prog_DocArk','prog_1099Acc'];

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const [payload, setPayload] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => api(`/clients/${clientId}`).then(setPayload);
  useEffect(() => { load(); }, [clientId]);

  if (!payload) return <div className="panel">Loading client detail...</div>;

  const { client, details, history, entitled } = payload;

  const toggleChecklist = async (item, checked) => {
    await api(`/clients/${clientId}/checklist`, { method: 'PATCH', body: JSON.stringify({ item, checked }) });
    load();
  };

  const saveDetails = async () => {
    await api(`/clients/${clientId}/details`, {
      method: 'PUT',
      body: JSON.stringify({
        firstCallout: details?.FirstCallout || '',
        followUpCalls: details?.FollowUpCalls || '',
        notes: details?.Notes || '',
      }),
    });
    setMsg('Details saved.');
    load();
  };

  const savePrograms = async () => {
    await api(`/clients/${clientId}/programs`, { method: 'PUT', body: JSON.stringify(entitled) });
    setMsg('Entitled programs updated.');
    load();
  };

  const setStatus = async (field, value) => {
    await api(`/clients/${clientId}/status`, { method: 'PATCH', body: JSON.stringify({ field, value }) });
    load();
  };

  const regenerateToken = async () => {
    const res = await api(`/clients/${clientId}/regenerate-upload-token`, { method: 'POST' });
    setMsg(`New upload token: ${res.uploadToken}`);
    load();
  };

  return (
    <>
      <section className="panel">
        <h2>{client.ClientName} ({client.ClientID})</h2>
        {msg && <div className="success">{msg}</div>}
        <div className="actions-row">
          <button className="fit" onClick={() => setStatus('Stalled', client.Stalled ? 0 : 1)}>{client.Stalled ? 'Unstall' : 'Mark Stalled'}</button>
          <button className="fit" onClick={() => setStatus('Cancelled', client.Cancelled ? 0 : 1)}>{client.Cancelled ? 'Uncancel' : 'Cancel'}</button>
          <button className="fit" onClick={() => setStatus('ReadyToCall', client.ReadyToCall ? 0 : 1)}>{client.ReadyToCall ? 'Ready Off' : 'Ready To Call'}</button>
          <button className="fit primary" onClick={regenerateToken}>Regenerate Upload Token</button>
        </div>
        <p className="note">Upload token: {client.UploadToken}</p>
      </section>

      <section className="panel">
        <h3>Checklist ({Math.round(client.Progress || 0)}%)</h3>
        <div className="checklist-grid">
          {CHECKLIST.map((item) => (
            <label key={item} className="check-item">
              <input type="checkbox" checked={Boolean(client[item])} onChange={(e) => toggleChecklist(item, e.target.checked)} />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Client Notes & Calls</h3>
        <label>First Callout</label>
        <textarea value={details?.FirstCallout || ''} onChange={(e) => setPayload({ ...payload, details: { ...(details || {}), FirstCallout: e.target.value } })} />
        <label>Follow Up Calls</label>
        <textarea value={details?.FollowUpCalls || ''} onChange={(e) => setPayload({ ...payload, details: { ...(details || {}), FollowUpCalls: e.target.value } })} />
        <label>Notes</label>
        <textarea value={details?.Notes || ''} onChange={(e) => setPayload({ ...payload, details: { ...(details || {}), Notes: e.target.value } })} />
        <button className="primary" onClick={saveDetails}>Save Details</button>
      </section>

      <section className="panel">
        <h3>Entitled Programs</h3>
        <div className="checklist-grid">
          {PROGRAMS.map((k) => (
            <label key={k} className="check-item">
              <input type="checkbox" checked={Boolean(entitled?.[k])} onChange={(e) => setPayload({ ...payload, entitled: { ...entitled, [k]: e.target.checked ? 1 : 0 } })} />
              <span>{k}</span>
            </label>
          ))}
        </div>
        <button className="primary" onClick={savePrograms}>Save Programs</button>
      </section>

      <section className="panel">
        <h3>Onboarding History</h3>
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Details</th><th>Edited By</th><th>Date</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.HistoryID}><td>{h.HistoryID}</td><td>{h.ActionType}</td><td>{h.ActionDetails}</td><td>{h.EditedBy}</td><td>{h.CreatedAt}</td></tr>
            ))}
            {history.length === 0 && <tr><td colSpan={5}>No history yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
