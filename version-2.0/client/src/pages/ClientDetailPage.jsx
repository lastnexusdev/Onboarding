import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

const CHECKLIST = [
  'ConfirmContactInfo', 'ReviewRequirements', 'ScheduleAppointment',
  'DownloadSoftware', 'InformClient', 'StartInstallation', 'InstalledNewVersion',
  'EnterUserID', 'ConfigureSettings', 'ManageUserAccounts',
  'RunSoftware', 'ProvideWalkthrough', 'DemonstrateTasks',
  'ContactSupport', 'OfferResources', 'ProvideTrainingInfo', 'ScheduleFollowUp',
  'VerifyPlanData', 'ExecuteConversion', 'VerifyIntegrity', 'TransferSetupData', 'CompleteBankEnrollment',
];

const PROGRAMS = ['prog_1040', 'prog_1120', 'prog_1120S', 'prog_1065', 'prog_1041', 'prog_Depreciation', 'prog_Proforma', 'prog_706Estate', 'prog_709Gift', 'prog_990Exempt', 'prog_DocArk', 'prog_1099Acc'];

function labelize(v) {
  return v.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase()).trim();
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const [payload, setPayload] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => api(`/clients/${clientId}`).then(setPayload);
  useEffect(() => { load(); }, [clientId]);

  const grouped = useMemo(() => {
    const pre = CHECKLIST.slice(0, 3);
    const download = CHECKLIST.slice(3, 7);
    const setup = CHECKLIST.slice(7, 10);
    const testing = CHECKLIST.slice(10, 13);
    const final = CHECKLIST.slice(13);
    return [
      ['Pre-Installation Preparation', pre],
      ['Download', download],
      ['Setup', setup],
      ['Testing', testing],
      ['Final Steps', final],
    ];
  }, []);

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
    setMsg('Additional information saved.');
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
        <h2 className="section-title">Onboarding Details for {client.ClientName}</h2>
        {msg && <div className="success">{msg}</div>}
      </section>

      <section className="panel">
        <h3 className="subheading">Progress Overview</h3>
        <div className="progress-bar" style={{ height: 18 }}><div className="progress-fill" style={{ width: `${Math.round(client.Progress || 0)}%` }} /></div>
        <p><strong>Progress:</strong> {Math.round(client.Progress || 0)}%</p>
      </section>

      <section className="detail-grid">
        <div className="panel">
          <h3 className="subheading">Client Information</h3>
          <div className="mini-grid">
            {[
              ['Client ID', client.ClientID],
              ['Client Name', client.ClientName],
              ['Phone Number', client.PhoneNumber || '-'],
              ['Email', client.Email || '-'],
              ['Sales Rep', client.SalesRep || '-'],
              ['Spanish Speaker', client.Spanish],
              ['Previous Software', client.PreviousSoftware || '-'],
              ['Conversion Needed', client.ConvertionNeeded],
              ['Bank Enrollment', client.BankEnrollment],
              ['Package', client.Package || '-'],
              ['Ready To Call', client.ReadyToCall ? 'Yes' : 'No'],
              ['Upload Token', client.UploadToken],
            ].map(([k, v]) => (
              <div className="mini-card" key={k}><label>{k}</label><span>{v}</span></div>
            ))}
          </div>

          <h3 className="subheading" style={{ marginTop: 18 }}>Entitled Programs</h3>
          <div className="program-grid">
            {PROGRAMS.map((k) => (
              <label key={k} className="program-pill">
                <input type="checkbox" checked={Boolean(entitled?.[k])} onChange={(e) => setPayload({ ...payload, entitled: { ...entitled, [k]: e.target.checked ? 1 : 0 } })} />
                <span>{k.replace('prog_', '')}</span>
              </label>
            ))}
          </div>
          <button className="primary full-width" onClick={savePrograms}>Save Programs</button>

          <section className="panel" style={{ marginTop: 14 }}>
            <h3 className="subheading">Additional Information</h3>
            <label>First Callout</label>
            <textarea value={details?.FirstCallout || ''} onChange={(e) => setPayload({ ...payload, details: { ...(details || {}), FirstCallout: e.target.value } })} />
            <label>Follow Up Calls</label>
            <textarea value={details?.FollowUpCalls || ''} onChange={(e) => setPayload({ ...payload, details: { ...(details || {}), FollowUpCalls: e.target.value } })} />
            <label>Notes</label>
            <textarea value={details?.Notes || ''} onChange={(e) => setPayload({ ...payload, details: { ...(details || {}), Notes: e.target.value } })} />
            <button className="primary full-width" onClick={saveDetails}>Save</button>
          </section>
        </div>

        <div className="panel">
          <h3 className="subheading">Onboarding Checklist</h3>
          <div className="actions-row" style={{ marginBottom: 10 }}>
            <button className="fit" onClick={() => setStatus('Stalled', client.Stalled ? 0 : 1)}>{client.Stalled ? 'Unstall' : 'Mark Stalled'}</button>
            <button className="fit" onClick={() => setStatus('Cancelled', client.Cancelled ? 0 : 1)}>{client.Cancelled ? 'Uncancel' : 'Cancel'}</button>
            <button className="fit" onClick={() => setStatus('ReadyToCall', client.ReadyToCall ? 0 : 1)}>{client.ReadyToCall ? 'Ready Off' : 'Ready To Call'}</button>
            <button className="fit primary" onClick={regenerateToken}>Regenerate Upload Token</button>
          </div>

          <div className="checklist-list">
            {grouped.map(([title, items]) => (
              <div key={title} style={{ marginBottom: 10 }}>
                <h4 style={{ color: '#7a3d2f', margin: '10px 0 6px' }}>{title}</h4>
                {items.map((item) => (
                  <label key={item} className="check-item">
                    <input type="checkbox" checked={Boolean(client[item])} onChange={(e) => toggleChecklist(item, e.target.checked)} />
                    <span>{labelize(item)}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 className="subheading">History</h3>
        <table>
          <thead><tr><th>Actions</th><th>Date</th><th>Action Details</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.HistoryID}><td>{h.ActionType}</td><td>{h.CreatedAt}</td><td>{h.ActionDetails}</td></tr>
            ))}
            {history.length === 0 && <tr><td colSpan={3}>No history records found.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
