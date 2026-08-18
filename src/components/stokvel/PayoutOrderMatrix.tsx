import React, { useState } from 'react';
import {
  Lock, Unlock, AlertTriangle, ShieldCheck, ArrowUpDown,
  CheckCircle2, RefreshCw, AlertCircle, Save, Info, Award
} from 'lucide-react';
import {
  Project,
  ProjectMemberSlot,
  User
} from '../../types';

interface PayoutOrderMatrixProps {
  project: Project;
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  onRefresh: () => void;
}

export default function PayoutOrderMatrix({
  project,
  slots,
  user,
  token,
  onRefresh
}: PayoutOrderMatrixProps) {
  const isAdmin = user.role === 'admin';
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [reorderedSlots, setReorderedSlots] = useState<{ slot_id: string; payout_position: number; user_name: string }[]>([]);
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sortedSlots = [...slots].sort((a, b) => (a.payout_position || 99) - (b.payout_position || 99));

  const handleOpenOverride = () => {
    setReorderedSlots(sortedSlots.map(s => ({
      slot_id: s.id,
      payout_position: s.payout_position,
      user_name: s.user_name
    })));
    setOverrideReason('');
    setError('');
    setSuccess('');
    setIsOverrideModalOpen(true);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= reorderedSlots.length) return;

    const copy = [...reorderedSlots];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    // Reassign sequence
    copy.forEach((item, i) => {
      item.payout_position = i + 1;
    });

    setReorderedSlots(copy);
  };

  const handleSaveOverride = async () => {
    if (!overrideReason || overrideReason.trim().length < 5) {
      setError('A mandatory written justification reason is required for emergency payout order changes.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/override-payout-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newOrder: reorderedSlots.map(s => ({ slot_id: s.slot_id, payout_position: s.payout_position })),
          reason: overrideReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply payout override');

      setSuccess('Payout order updated and audited successfully.');
      setTimeout(() => {
        setIsOverrideModalOpen(false);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockOrder = async () => {
    if (!window.confirm('Are you sure you want to lock the payout order? Once locked, alterations require emergency administrator audit override.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/lock-payout-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to lock payout order');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-stone-900">Payout Order & Slot Allocation Matrix</h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
              project.payout_order_locked
                ? 'bg-stone-900 text-white'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {project.payout_order_locked ? 'Locked by Constitution' : 'Draft / Unlocked'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Governs the sequential order in which each member slot receives vehicle acquisition capital disbursement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && !project.payout_order_locked && (
            <button
              onClick={handleLockOrder}
              disabled={loading}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Payout Order
            </button>
          )}

          {isAdmin && project.payout_order_locked && (
            <button
              onClick={handleOpenOverride}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Emergency Order Override
            </button>
          )}
        </div>
      </div>

      {/* Slots Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-sm font-black text-stone-900">Configured Member Slots ({slots.length})</h3>
          <span className="text-xs text-stone-500">Sorted by Payout Sequence</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-center">Position</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Slot Type</th>
                <th className="px-4 py-3 text-right">Weekly Rate</th>
                <th className="px-4 py-3 text-right">Deposit</th>
                <th className="px-4 py-3 text-right">Target Payout</th>
                <th className="px-4 py-3 text-right">Total Paid</th>
                <th className="px-4 py-3 text-right">Arrears</th>
                <th className="px-4 py-3 text-center">Benefit Status</th>
                <th className="px-4 py-3 text-center">Member Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {sortedSlots.map(slot => (
                <tr key={slot.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-stone-900 text-white font-black rounded-lg text-xs">
                      #{slot.payout_position}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-stone-900">{slot.user_name}</div>
                    <div className="text-[11px] text-stone-400">ID: {slot.id.slice(0, 10)}</div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-stone-700">
                    {slot.slot_type_name}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                    R {slot.current_weekly_contribution?.toLocaleString() || slot.weekly_contribution.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-bold ${slot.deposit_paid >= slot.deposit_required ? 'text-emerald-700' : 'text-amber-700'}`}>
                      R {slot.deposit_paid.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-400 block">req: R{slot.deposit_required.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-stone-900">
                    R {slot.payout_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-stone-800">
                    R {slot.total_paid.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold">
                    {slot.outstanding_amount > 0 ? (
                      <span className="text-red-600">R {slot.outstanding_amount.toLocaleString()}</span>
                    ) : (
                      <span className="text-emerald-600">R 0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {slot.benefit_received ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        <Award className="w-3 h-3" /> Handed Over
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-600">
                        Pending Turn
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      slot.status === 'active' || slot.status === 'paid_ahead'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : slot.status === 'in_arrears'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : slot.status === 'dismissal_review'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-stone-100 text-stone-700'
                    }`}>
                      {slot.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Emergency Payout Order Override</h3>
                  <p className="text-xs text-stone-500">Administrator Authorization & Audit Required</p>
                </div>
              </div>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold">Constitutional Notice:</p>
              <p>Re-arranging payout positions alters the vehicle distribution sequence. This action is permanently recorded in the immutable project audit log with your name and justification.</p>
            </div>

            {/* Re-order list */}
            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
              {reorderedSlots.map((item, idx) => (
                <div
                  key={item.slot_id}
                  className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-stone-900 text-white font-bold flex items-center justify-center text-xs">
                      #{item.payout_position}
                    </span>
                    <span className="font-bold text-stone-900">{item.user_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-700 disabled:opacity-30 cursor-pointer text-xs"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === reorderedSlots.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-700 disabled:opacity-30 cursor-pointer text-xs"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Justification Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Mandatory Written Justification Reason *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Swapped Position 1 and Position 2 due to member vehicle inspection postponement request agreed in Assembly Meeting #3."
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                className="w-full text-xs p-3 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveOverride}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                {loading ? 'Saving...' : 'Apply & Audit Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
