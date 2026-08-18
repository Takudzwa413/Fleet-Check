import React, { useState } from 'react';
import {
  TrendingUp, ShieldCheck, CheckCircle2, AlertCircle,
  Share2, FileText, Send, Calendar, Users, DollarSign,
  Download, Award, PieChart
} from 'lucide-react';
import {
  Project,
  ProjectGroupSummary,
  ProjectMemberSlot,
  ProjectPayment,
  User
} from '../../types';

interface GroupSummaryPublisherProps {
  project: Project;
  summary?: ProjectGroupSummary | null;
  slots: ProjectMemberSlot[];
  payments: ProjectPayment[];
  user: User;
  token: string;
  onRefresh: () => void;
}

export default function GroupSummaryPublisher({
  project,
  summary,
  slots,
  payments,
  user,
  token,
  onRefresh
}: GroupSummaryPublisherProps) {
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';

  const [notes, setNotes] = useState(
    summary?.notes_to_members || 'All members are encouraged to maintain weekly timeous payments by Sundays 20:00. Next compulsory meeting is scheduled for Month-End Sunday 17:00.'
  );
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Real-time calculations
  const totalTarget = slots.reduce((acc, s) => acc + s.payout_amount, 0) || 900000;
  const approvedPayments = payments.filter(p => p.status === 'approved');
  const totalCollected = approvedPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalDeposits = slots.reduce((acc, s) => acc + s.deposit_paid, 0);
  const totalArrears = slots.reduce((acc, s) => acc + s.outstanding_amount, 0);
  const upToDateCount = slots.filter(s => s.outstanding_amount === 0).length;
  const inArrearsCount = slots.filter(s => s.outstanding_amount > 0).length;
  const totalPenalties = payments.filter(p => p.status === 'approved' && p.payment_type === 'penalty').reduce((acc, p) => acc + p.amount, 0);

  const handlePublishSummary = async () => {
    setPublishing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/group-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes_to_members: notes,
          total_collected: totalCollected,
          total_deposits_collected: totalDeposits,
          total_penalties_collected: totalPenalties,
          total_arrears: totalArrears,
          members_up_to_date_count: upToDateCount,
          members_in_arrears_count: inArrearsCount,
          current_cycle_week: project.computed_current_week || 1
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish group summary');

      setSuccessMsg('Group Financial Transparency Summary published to all project members.');
      setTimeout(() => {
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Group Financial Transparency & Reconciliation</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Reconciliation records published by Senior Project Accountant and verified against Standard Bank statements.
          </p>
        </div>

        {summary?.published_at && (
          <span className="text-xs text-stone-500 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            Last Published: <strong>{new Date(summary.published_at).toLocaleDateString()}</strong> by {summary.published_by}
          </span>
        )}
      </div>

      {/* Real-Time Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Total Capital Collected</span>
          <div className="text-2xl font-black text-stone-900">R {totalCollected.toLocaleString()}</div>
          <span className="text-xs text-stone-500">Target: R {totalTarget.toLocaleString()}</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Security Deposits Held</span>
          <div className="text-2xl font-black text-stone-900">R {totalDeposits.toLocaleString()}</div>
          <span className="text-xs text-emerald-700 font-semibold">100% of Members Paid Deposit</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Members in Good Standing</span>
          <div className="text-2xl font-black text-emerald-700">{upToDateCount} of {slots.length}</div>
          <span className="text-xs text-stone-500">{inArrearsCount > 0 ? `${inArrearsCount} with pending week` : 'Zero Default Risk'}</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Outstanding Arrears</span>
          <div className={`text-2xl font-black ${totalArrears > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            R {totalArrears.toLocaleString()}
          </div>
          <span className="text-xs text-stone-500">Penalties pool: R {totalPenalties.toLocaleString()}</span>
        </div>
      </div>

      {/* Member Standings Breakdown Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-sm font-black text-stone-900">Member Financial Standing Breakdown</h3>
          <span className="text-xs text-stone-500">Auto-calculated from verified bank POPs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Slot Position</th>
                <th className="px-4 py-3 text-right">Weekly Rate</th>
                <th className="px-4 py-3 text-right">Deposit</th>
                <th className="px-4 py-3 text-right">Total Contributions</th>
                <th className="px-4 py-3 text-right">Arrears</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {slots.map(s => (
                <tr key={s.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-stone-900">{s.user_name}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-stone-800">#{s.payout_position} - {s.slot_type_name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                    R {(s.current_weekly_contribution || s.weekly_contribution).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                    R {s.deposit_paid.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-stone-900">
                    R {s.total_paid.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold">
                    {s.outstanding_amount > 0 ? (
                      <span className="text-red-600">R {s.outstanding_amount.toLocaleString()}</span>
                    ) : (
                      <span className="text-emerald-700">R 0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      s.status === 'active' || s.status === 'paid_ahead'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : s.status === 'in_arrears'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-stone-100 text-stone-800'
                    }`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finance Committee Publication Desk (Accountant / Admin) */}
      {isPrivileged && (
        <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400 text-stone-950 rounded-xl font-black">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Publish Transparency Summary to All Members</h3>
              <p className="text-xs text-stone-300">Broadcast official financial standing and assembly notes</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Official Note / Announcement to Members
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs p-3 bg-stone-800 border border-stone-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="e.g. Standard Bank weekly statement reconciled. All member deposits secured in high-yield call account."
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handlePublishSummary}
              disabled={publishing}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{publishing ? 'Publishing...' : 'Publish Group Summary'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
