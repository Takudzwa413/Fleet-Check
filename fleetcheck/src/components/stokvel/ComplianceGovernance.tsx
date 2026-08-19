import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, FileText, Gavel, LogOut, Plus, X, AlertCircle,
  CheckCircle2, RefreshCw, Paperclip, Eye
} from 'lucide-react';
import {
  Project, ProjectMemberSlot, User,
  ProjectSecurityIncident, ProjectDocument, ProjectDispute, ProjectExitRecord
} from '../../types';
import { compressImageFile } from '../../utils/imageCompressor';

interface ComplianceGovernanceProps {
  project: Project;
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  onRefresh: () => void;
}

type SubTab = 'incidents' | 'documents' | 'disputes' | 'exits';

export default function ComplianceGovernance({ project, slots, user, token, onRefresh }: ComplianceGovernanceProps) {
  const isAdmin = user.role === 'admin';
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';

  const [subTab, setSubTab] = useState<SubTab>('incidents');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [incidents, setIncidents] = useState<ProjectSecurityIncident[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [disputes, setDisputes] = useState<ProjectDispute[]>([]);
  const [exitRecords, setExitRecords] = useState<ProjectExitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeader = { 'Authorization': `Bearer ${token}` };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [incRes, docRes, dispRes, exitRes] = await Promise.all([
        fetch(`/api/stokvel/projects/${project.id}/security-incidents`, { headers: authHeader }),
        fetch(`/api/stokvel/projects/${project.id}/documents`, { headers: authHeader }),
        fetch(`/api/stokvel/projects/${project.id}/disputes`, { headers: authHeader }),
        fetch(`/api/stokvel/projects/${project.id}/exit-records`, { headers: authHeader })
      ]);
      const [incData, docData, dispData, exitData] = await Promise.all([
        incRes.json(), docRes.json(), dispRes.json(), exitRes.json()
      ]);
      setIncidents(incData.incidents || []);
      setDocuments(docData.documents || []);
      setDisputes(dispData.disputes || []);
      setExitRecords(exitData.exitRecords || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const refreshAll = () => { loadAll(); onRefresh(); };

  // ==================== Security Incidents ====================
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    slot_id: '',
    vehicle_reg: '',
    incident_type: 'suspected_misuse',
    description: ''
  });

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    const slot = slots.find(s => s.id === incidentForm.slot_id) || slots.find(s => s.user_id === user.id);
    if (!slot) { setErrorMsg('Please select the affected member slot.'); return; }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/security-incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          user_id: slot.user_id,
          user_name: slot.user_name,
          vehicle_reg: incidentForm.vehicle_reg,
          incident_type: incidentForm.incident_type,
          description: incidentForm.description
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to report incident');
      setSuccessMsg('Security incident reported.');
      setShowIncidentForm(false);
      setIncidentForm({ slot_id: '', vehicle_reg: '', incident_type: 'suspected_misuse', description: '' });
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIncidentStatus = async (incidentId: string, status: string) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/security-incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update incident');
      setSuccessMsg('Incident updated.');
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== Documents ====================
  const [showDocForm, setShowDocForm] = useState(false);
  const [docType, setDocType] = useState('other');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFileData, setDocFileData] = useState('');
  const [compressing, setCompressing] = useState(false);

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    setCompressing(true);
    try {
      const result = await compressImageFile(file, 300 * 1024);
      setDocFileData(result.base64);
    } catch (err) {
      console.error('Document processing error:', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFileData || !docFile) { setErrorMsg('Please select a file to upload.'); return; }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          document_type: docType,
          file_name: docFile.name,
          file_data: docFileData,
          file_type: docFile.type
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');
      setSuccessMsg('Document uploaded and pending review.');
      setShowDocForm(false);
      setDocFile(null);
      setDocFileData('');
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewDocument = async (documentId: string, status: 'approved' | 'rejected') => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/documents/${documentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review document');
      setSuccessMsg(`Document ${status}.`);
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== Disputes ====================
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    against_type: 'project' as 'member' | 'project' | 'admin' | 'accountant',
    against_name: '',
    dispute_type: 'general',
    description: ''
  });

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeForm.description.trim()) { setErrorMsg('Please describe the dispute.'); return; }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(disputeForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to file dispute');
      setSuccessMsg('Dispute filed. The committee has been notified.');
      setShowDisputeForm(false);
      setDisputeForm({ against_type: 'project', against_name: '', dispute_type: 'general', description: '' });
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDispute = async (disputeId: string, status: string, outcome?: string) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/disputes/${disputeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status, outcome })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update dispute');
      setSuccessMsg('Dispute updated.');
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== Exit Records ====================
  const [showExitForm, setShowExitForm] = useState(false);
  const [exitForm, setExitForm] = useState({
    slot_id: '',
    exit_type: 'voluntary_withdrawal' as 'voluntary_withdrawal' | 'dismissal' | 'death' | 'incapacity' | 'project_completion',
    penalty_amount: 0,
    refund_amount: 0,
    next_of_kin_details: '',
    settlement_notes: ''
  });

  const handleCreateExit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slot = slots.find(s => s.id === exitForm.slot_id);
    if (!slot) { setErrorMsg('Please select the exiting member slot.'); return; }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/exit-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          user_id: slot.user_id,
          user_name: slot.user_name,
          slot_id: slot.id,
          exit_type: exitForm.exit_type,
          penalty_amount: Number(exitForm.penalty_amount) || 0,
          refund_amount: Number(exitForm.refund_amount) || 0,
          next_of_kin_details: exitForm.next_of_kin_details,
          settlement_notes: exitForm.settlement_notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start exit process');
      setSuccessMsg('Exit process started, pending admin approval.');
      setShowExitForm(false);
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecideExit = async (exitId: string, approve: boolean) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/exit-records/${exitId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ approve })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record decision');
      setSuccessMsg(`Exit ${approve ? 'approved' : 'rejected'}.`);
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'incidents', label: 'Security Incidents', icon: <ShieldAlert className="w-3.5 h-3.5" />, count: incidents.length },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-3.5 h-3.5" />, count: documents.filter(d => d.status === 'pending').length },
    { id: 'disputes', label: 'Disputes', icon: <Gavel className="w-3.5 h-3.5" />, count: disputes.filter(d => d.status !== 'closed' && d.status !== 'resolved_internally').length },
    { id: 'exits', label: 'Exit / Withdrawal', icon: <LogOut className="w-3.5 h-3.5" />, count: exitRecords.filter(e => e.admin_approval === 'pending').length }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h2 className="text-xl font-black text-stone-900">Compliance & Governance</h2>
        <p className="text-xs text-stone-500 mt-1">
          Security incidents, member documents, disputes, and exit / withdrawal workflows.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs overflow-x-auto w-fit">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              subTab === t.id ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.icon} {t.label} {t.count > 0 && <span className="px-1.5 py-0.1 bg-amber-500 text-stone-950 rounded-full text-[10px] font-black">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-stone-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading compliance records...
        </div>
      ) : (
        <>
          {/* SECURITY INCIDENTS */}
          {subTab === 'incidents' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowIncidentForm(true)} className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Report Incident
                </button>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {incidents.length > 0 ? incidents.map(inc => (
                      <tr key={inc.id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3.5 font-bold text-stone-900">{inc.user_name}</td>
                        <td className="px-4 py-3.5 capitalize text-stone-700">{inc.incident_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3.5 font-mono text-stone-600">{inc.vehicle_reg || '-'}</td>
                        <td className="px-4 py-3.5 text-stone-600 max-w-xs truncate">{inc.description}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-stone-100 text-stone-700">{inc.status.replace(/_/g, ' ')}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3.5 text-right space-x-1">
                            {inc.status !== 'resolved' && inc.status !== 'closed' && (
                              <button disabled={submitting} onClick={() => handleUpdateIncidentStatus(inc.id, 'resolved')} className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px] cursor-pointer">Resolve</button>
                            )}
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-stone-400 text-xs">No security incidents reported.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {subTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowDocForm(true)} className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Upload Document
                </button>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">File</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {isPrivileged && <th className="px-4 py-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {documents.length > 0 ? documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3.5 font-bold text-stone-900">{doc.user_name}</td>
                        <td className="px-4 py-3.5 capitalize text-stone-700">{doc.document_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3.5">
                          <a href={doc.file_data} download={doc.file_name} className="text-stone-700 hover:text-stone-900 font-medium flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> {doc.file_name}
                          </a>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            doc.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : doc.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>{doc.status}</span>
                        </td>
                        {isPrivileged && (
                          <td className="px-4 py-3.5 text-right space-x-1">
                            {doc.status === 'pending' && (
                              <>
                                <button disabled={submitting} onClick={() => handleReviewDocument(doc.id, 'approved')} className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px] cursor-pointer">Approve</button>
                                <button disabled={submitting} onClick={() => handleReviewDocument(doc.id, 'rejected')} className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg text-[11px] cursor-pointer">Reject</button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr><td colSpan={isPrivileged ? 5 : 4} className="px-4 py-8 text-center text-stone-400 text-xs">No documents uploaded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DISPUTES */}
          {subTab === 'disputes' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowDisputeForm(true)} className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> File Dispute
                </button>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Filed By</th>
                      <th className="px-4 py-3">Against</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {isPrivileged && <th className="px-4 py-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {disputes.length > 0 ? disputes.map(d => (
                      <tr key={d.id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3.5 font-bold text-stone-900">{d.reported_by_name}</td>
                        <td className="px-4 py-3.5 capitalize text-stone-700">{d.against_name || d.against_type}</td>
                        <td className="px-4 py-3.5 text-stone-600 max-w-xs truncate">{d.description}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-stone-100 text-stone-700">{d.status.replace(/_/g, ' ')}</span>
                        </td>
                        {isPrivileged && (
                          <td className="px-4 py-3.5 text-right space-x-1">
                            {d.status !== 'resolved_internally' && d.status !== 'closed' && (
                              <button disabled={submitting} onClick={() => handleUpdateDispute(d.id, 'resolved_internally', 'Resolved by committee.')} className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px] cursor-pointer">Resolve</button>
                            )}
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr><td colSpan={isPrivileged ? 5 : 4} className="px-4 py-8 text-center text-stone-400 text-xs">No disputes filed.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EXIT RECORDS */}
          {subTab === 'exits' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end">
                  <button onClick={() => setShowExitForm(true)} className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Start Exit Process
                  </button>
                </div>
              )}
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Exit Type</th>
                      <th className="px-4 py-3 text-right">Refund</th>
                      <th className="px-4 py-3 text-center">Approval</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {exitRecords.length > 0 ? exitRecords.map(ex => (
                      <tr key={ex.id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3.5 font-bold text-stone-900">{ex.user_name}</td>
                        <td className="px-4 py-3.5 capitalize text-stone-700">{ex.exit_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-stone-900">R {ex.refund_amount.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            ex.admin_approval === 'approved' ? 'bg-emerald-100 text-emerald-800' : ex.admin_approval === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>{ex.admin_approval}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3.5 text-right space-x-1">
                            {ex.admin_approval === 'pending' && (
                              <>
                                <button disabled={submitting} onClick={() => handleDecideExit(ex.id, true)} className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px] cursor-pointer">Approve</button>
                                <button disabled={submitting} onClick={() => handleDecideExit(ex.id, false)} className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg text-[11px] cursor-pointer">Reject</button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-stone-400 text-xs">No exit records.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Report Incident Modal */}
      {showIncidentForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">Report Security Incident</h3>
              <button onClick={() => setShowIncidentForm(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleReportIncident} className="space-y-3">
              <select required value={incidentForm.slot_id} onChange={e => setIncidentForm({ ...incidentForm, slot_id: e.target.value })} className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl outline-none">
                <option value="">-- Select affected member slot --</option>
                {slots.map(s => <option key={s.id} value={s.id}>{s.user_name} (Pos #{s.payout_position})</option>)}
              </select>
              <input type="text" placeholder="Vehicle Registration" value={incidentForm.vehicle_reg} onChange={e => setIncidentForm({ ...incidentForm, vehicle_reg: e.target.value })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
              <select value={incidentForm.incident_type} onChange={e => setIncidentForm({ ...incidentForm, incident_type: e.target.value })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none">
                <option value="vehicle_not_presented">Vehicle Not Presented</option>
                <option value="vehicle_left_wc">Vehicle Left Province</option>
                <option value="suspected_misuse">Suspected Misuse</option>
                <option value="attempted_fraud">Attempted Fraud</option>
                <option value="accident">Accident</option>
                <option value="tracking_issue">Tracking Issue</option>
                <option value="other">Other</option>
              </select>
              <textarea required rows={3} placeholder="Describe the incident..." value={incidentForm.description} onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
              <button type="submit" disabled={submitting} className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer">
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showDocForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">Upload Document</h3>
              <button onClick={() => setShowDocForm(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUploadDocument} className="space-y-3">
              <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none">
                <option value="signed_constitution">Signed Constitution</option>
                <option value="id_passport">ID / Passport</option>
                <option value="driver_licence">Driver Licence</option>
                <option value="proof_of_address">Proof of Address</option>
                <option value="proof_of_deposit">Proof of Deposit</option>
                <option value="bank_confirmation">Bank Confirmation</option>
                <option value="next_of_kin_form">Next of Kin Form</option>
                <option value="vehicle_documents">Vehicle Documents</option>
                <option value="insurance_documents">Insurance Documents</option>
                <option value="other">Other</option>
              </select>
              <input type="file" accept="image/*,application/pdf" onChange={handleDocFileChange} className="w-full text-xs p-2 border border-stone-300 rounded-xl bg-stone-50" />
              {compressing && <span className="text-[10px] text-amber-600 animate-pulse">Processing file...</span>}
              <button type="submit" disabled={submitting || compressing} className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer">
                {submitting ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* File Dispute Modal */}
      {showDisputeForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">File a Dispute</h3>
              <button onClick={() => setShowDisputeForm(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleFileDispute} className="space-y-3">
              <select value={disputeForm.against_type} onChange={e => setDisputeForm({ ...disputeForm, against_type: e.target.value as any })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none">
                <option value="project">Project / General</option>
                <option value="member">Another Member</option>
                <option value="admin">Administration</option>
                <option value="accountant">Accountant</option>
              </select>
              <input type="text" placeholder="Name (if applicable)" value={disputeForm.against_name} onChange={e => setDisputeForm({ ...disputeForm, against_name: e.target.value })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
              <textarea required rows={3} placeholder="Describe the dispute..." value={disputeForm.description} onChange={e => setDisputeForm({ ...disputeForm, description: e.target.value })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
              <button type="submit" disabled={submitting} className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer">
                {submitting ? 'Filing...' : 'File Dispute'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Start Exit Process Modal */}
      {showExitForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">Start Exit / Withdrawal Process</h3>
              <button onClick={() => setShowExitForm(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateExit} className="space-y-3">
              <select required value={exitForm.slot_id} onChange={e => setExitForm({ ...exitForm, slot_id: e.target.value })} className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl outline-none">
                <option value="">-- Select exiting member --</option>
                {slots.map(s => <option key={s.id} value={s.id}>{s.user_name} (Pos #{s.payout_position})</option>)}
              </select>
              <select value={exitForm.exit_type} onChange={e => setExitForm({ ...exitForm, exit_type: e.target.value as any })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none">
                <option value="voluntary_withdrawal">Voluntary Withdrawal</option>
                <option value="dismissal">Dismissal</option>
                <option value="death">Death</option>
                <option value="incapacity">Incapacity</option>
                <option value="project_completion">Project Completion</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Penalty Amount (R)" value={exitForm.penalty_amount} onChange={e => setExitForm({ ...exitForm, penalty_amount: Number(e.target.value) })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
                <input type="number" placeholder="Refund Amount (R)" value={exitForm.refund_amount} onChange={e => setExitForm({ ...exitForm, refund_amount: Number(e.target.value) })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
              </div>
              <input type="text" placeholder="Next of Kin Details (if applicable)" value={exitForm.next_of_kin_details} onChange={e => setExitForm({ ...exitForm, next_of_kin_details: e.target.value })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
              <textarea rows={2} placeholder="Settlement notes..." value={exitForm.settlement_notes} onChange={e => setExitForm({ ...exitForm, settlement_notes: e.target.value })} className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none" />
              <button type="submit" disabled={submitting} className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer">
                {submitting ? 'Starting...' : 'Start Exit Process'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
