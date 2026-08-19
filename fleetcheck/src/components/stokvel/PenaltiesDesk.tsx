import React, { useState } from 'react';
import {
  AlertTriangle, ShieldAlert, CheckCircle2, DollarSign,
  Plus, RefreshCw, AlertCircle, XCircle, FileText
} from 'lucide-react';
import {
  Project,
  ProjectPenalty,
  ProjectMemberSlot,
  User
} from '../../types';

interface PenaltiesDeskProps {
  project: Project;
  penalties: ProjectPenalty[];
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  onRefresh: () => void;
}

export default function PenaltiesDesk({
  project,
  penalties,
  slots,
  user,
  token,
  onRefresh
}: PenaltiesDeskProps) {
  const isAdmin = user.role === 'admin';
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id || '');
  const [penaltyType, setPenaltyType] = useState<string>('late_weekly_payment');
  const [amount, setAmount] = useState(900); // 30% of R3,000 default
  const [reason, setReason] = useState('Payment missed Sunday 20:00 deadline by >24 hours.');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Waiver Modal
  const [waivingPenaltyId, setWaivingPenaltyId] = useState<string | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [waiverLoading, setWaiverLoading] = useState(false);

  const handlePenaltyTypeChange = (type: string) => {
    setPenaltyType(type);
    const targetSlot = slots.find(s => s.id === selectedSlotId);
    const weeklyRate = targetSlot ? (targetSlot.current_weekly_contribution || targetSlot.weekly_contribution) : 3000;

    if (type === 'late_weekly_payment') {
      setAmount(Math.round(weeklyRate * 0.30));
      setReason('Payment missed Sunday 20:00 cutoff by >24 hours.');
    } else if (type === 'withdrawal') {
      const deposit = targetSlot?.deposit_required || 15000;
      setAmount(Math.round(deposit * 0.30));
      setReason('Voluntary withdrawal penalty pursuant to Stokvel Constitution Section 8.');
    } else if (type === 'inspection_failure') {
      setAmount(2500);
      setReason('Vehicle failed mandatory quarterly safety inspection checklist.');
    } else if (type === 'late_insurance_premium') {
      setAmount(1000);
      setReason('Monthly insurance premium not cleared before the 1st of the month.');
    } else if (type === 'misconduct') {
      setAmount(500);
      setReason('Missed compulsory member assembly meeting.');
    }
  };

  const handleApplyPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetSlot = slots.find(s => s.id === selectedSlotId);
      if (!targetSlot) throw new Error('Select a valid member slot before applying a penalty.');

      const res = await fetch(`/api/stokvel/projects/${project.id}/penalties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          slot_id: selectedSlotId,
          user_id: targetSlot.user_id,
          user_name: targetSlot.user_name,
          penalty_type: penaltyType,
          penalty_amount: Number(amount),
          reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply penalty');

      setSuccessMsg('Penalty applied and recorded in slot obligations.');
      setTimeout(() => {
        setIsApplyModalOpen(false);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteWaiver = async () => {
    if (!waivingPenaltyId) return;
    if (!waiverReason || waiverReason.trim().length < 4) {
      alert('Mandatory written reason required for administrative waiver.');
      return;
    }

    setWaiverLoading(true);
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/penalties/${waivingPenaltyId}/waive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: waiverReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to waive penalty');

      alert('Penalty waived and recorded in audit log.');
      setWaivingPenaltyId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWaiverLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Compliance, Penalties & Discipline Desk</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Governed by Action Pack Stokvel Constitution Section 7: 30% late fee, 30% withdrawal charge, and inspection fines.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setIsApplyModalOpen(true);
            }}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-red-400" />
            <span>Apply Compliance Penalty</span>
          </button>
        )}
      </div>

      {/* Penalties List */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-sm font-black text-stone-900">Recorded Penalties ({penalties.length})</h3>
          <span className="text-xs text-stone-500">Penalties hold Priority #1 on payment allocation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Violation Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Reason / Details</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {penalties.length > 0 ? (
                penalties.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-stone-900">
                      {p.user_name}
                      <span className="block text-[10px] text-stone-400 font-normal">#{p.slot_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-800 capitalize">
                      {p.penalty_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-red-700">
                      R {p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600 max-w-xs">
                      {p.reason}
                      {p.waiver_reason && (
                        <span className="block text-[10px] text-amber-800 font-medium mt-0.5">
                          Waived Note: {p.waiver_reason} (by {p.waived_by})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        p.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : p.status === 'waived'
                          ? 'bg-stone-100 text-stone-700 border border-stone-300'
                          : 'bg-red-100 text-red-800 border border-red-200 font-black'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isAdmin && (p.status === 'applied' || p.status === 'pending' || p.status === 'partially_paid') && (
                        <button
                          onClick={() => {
                            setWaivingPenaltyId(p.id);
                            setWaiverReason('');
                          }}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Waive Penalty
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400 text-xs">
                    No compliance penalties recorded for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Penalty Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">Apply Compliance Penalty</h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleApplyPenalty} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 uppercase">Target Member Slot</label>
                <select
                  value={selectedSlotId}
                  onChange={e => setSelectedSlotId(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                >
                  {slots.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.payout_position} - {s.user_name} ({s.slot_type_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 uppercase">Penalty Type</label>
                <select
                  value={penaltyType}
                  onChange={e => handlePenaltyTypeChange(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                >
                  <option value="late_weekly_payment">Late Weekly Payment (30% fine)</option>
                  <option value="withdrawal">Voluntary Early Withdrawal (30% forfeiture)</option>
                  <option value="inspection_failure">Vehicle Inspection Failure (R2,500 fine)</option>
                  <option value="late_insurance_premium">Late Insurance Premium (R1,000 fine)</option>
                  <option value="misconduct">Missed Compulsory Assembly Meeting (R500 fine)</option>
                  <option value="default">Default Threshold Breach</option>
                  <option value="manual">Manual / Other Penalty</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 uppercase">Penalty Amount (ZAR)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-stone-300 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 uppercase">Reason / Constitutional Clause</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-xl"
                />
              </div>

              {errorMsg && <div className="p-3 bg-red-50 text-red-800 font-semibold rounded-xl">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 text-emerald-800 font-semibold rounded-xl">{successMsg}</div>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsApplyModalOpen(false)} className="flex-1 py-2.5 bg-stone-100 font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-md">
                  {loading ? 'Applying...' : 'Apply Penalty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waive Penalty Modal */}
      {waivingPenaltyId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Administrator Penalty Waiver</h3>
                <p className="text-xs text-stone-500">Recorded in immutable audit trail</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Mandatory Written Waiver Reason *
              </label>
              <textarea
                rows={3}
                required
                value={waiverReason}
                onChange={e => setWaiverReason(e.target.value)}
                placeholder="e.g. Bank downtime confirmed via Standard Bank notice; grace period extension granted by executive committee."
                className="w-full text-xs p-3 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWaivingPenaltyId(null)}
                className="flex-1 py-2.5 bg-stone-100 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={waiverLoading}
                onClick={handleExecuteWaiver}
                className="flex-1 py-2.5 bg-stone-900 text-white font-bold rounded-xl text-xs shadow-md"
              >
                {waiverLoading ? 'Waiving...' : 'Execute Waiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
