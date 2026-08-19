import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Layers, Edit3, X, CheckCircle2, AlertCircle,
  RefreshCw, ShieldCheck, Phone
} from 'lucide-react';
import { Project, ProjectMember, ProjectMemberSlot, User } from '../../types';

interface MembersSlotsManagementProps {
  project: Project;
  members: ProjectMember[];
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  onRefresh: () => void;
}

interface PickerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
}

export default function MembersSlotsManagement({
  project,
  members,
  slots,
  user,
  token,
  onRefresh
}: MembersSlotsManagementProps) {
  const isAdmin = user.role === 'admin';

  const [view, setView] = useState<'members' | 'slots'>('members');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ==================== Assign Member Modal ====================
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStep, setAssignStep] = useState<1 | 2>(1);
  const [availableUsers, setAvailableUsers] = useState<PickerUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newlyCreatedMember, setNewlyCreatedMember] = useState<ProjectMember | null>(null);

  const [memberForm, setMemberForm] = useState({
    user_id: '',
    member_type: 'driver' as 'driver' | 'fleet_owner' | 'other',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_relationship: 'Spouse',
    notes: ''
  });

  const [slotForm, setSlotForm] = useState({
    slot_type_name: 'Full Slot',
    slot_number: 1,
    payout_position: slots.length + 1,
    weekly_contribution: '',
    deposit_required: '',
    deposit_paid: '',
    payout_amount: '',
    default_threshold: '',
    post_benefit_increase: ''
  });

  // ==================== Edit Slot Modal ====================
  const [editingSlot, setEditingSlot] = useState<ProjectMemberSlot | null>(null);
  const [editSlotForm, setEditSlotForm] = useState({
    payout_position: 0,
    weekly_contribution: 0,
    deposit_required: 0,
    deposit_paid: 0,
    payout_amount: 0,
    default_threshold: 0,
    post_benefit_increase: 0
  });

  const memberIdsWithSlots = new Set(slots.map(s => s.project_member_id));

  const loadAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      const existingUserIds = new Set(members.map(m => m.user_id));
      const eligible = (data.users || []).filter((u: PickerUser) =>
        (u.role === 'driver' || u.role === 'fleet_owner') && !existingUserIds.has(u.id)
      );
      setAvailableUsers(eligible);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load eligible users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const openAssignModal = () => {
    setAssignStep(1);
    setNewlyCreatedMember(null);
    setMemberForm({
      user_id: '',
      member_type: 'driver',
      next_of_kin_name: '',
      next_of_kin_phone: '',
      next_of_kin_relationship: 'Spouse',
      notes: ''
    });
    setSlotForm({
      slot_type_name: 'Full Slot',
      slot_number: 1,
      payout_position: slots.length + 1,
      weekly_contribution: '',
      deposit_required: '',
      deposit_paid: '',
      payout_amount: '',
      default_threshold: '',
      post_benefit_increase: ''
    });
    setErrorMsg('');
    setSuccessMsg('');
    setShowAssignModal(true);
    loadAvailableUsers();
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.user_id) {
      setErrorMsg('Please select a member to assign to this project.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(memberForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign member');

      setNewlyCreatedMember(data.member);
      setSlotForm(prev => ({ ...prev, payout_position: slots.length + 1 }));
      setAssignStep(2);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSlot = async (memberOverride?: ProjectMember) => {
    const targetMember = memberOverride || newlyCreatedMember;
    if (!targetMember) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload: any = {
        project_member_id: targetMember.id,
        user_id: targetMember.user_id,
        user_name: targetMember.user_name,
        slot_type_name: slotForm.slot_type_name,
        slot_number: Number(slotForm.slot_number) || 1,
        payout_position: Number(slotForm.payout_position) || slots.length + 1
      };
      // Only send overrides if the admin actually typed a value - otherwise let the
      // backend apply its Full/Half Slot economic defaults.
      if (slotForm.weekly_contribution) payload.weekly_contribution = Number(slotForm.weekly_contribution);
      if (slotForm.deposit_required) payload.deposit_required = Number(slotForm.deposit_required);
      if (slotForm.deposit_paid) payload.deposit_paid = Number(slotForm.deposit_paid);
      if (slotForm.payout_amount) payload.payout_amount = Number(slotForm.payout_amount);
      if (slotForm.default_threshold) payload.default_threshold = Number(slotForm.default_threshold);
      if (slotForm.post_benefit_increase) payload.post_benefit_increase = Number(slotForm.post_benefit_increase);

      const res = await fetch(`/api/stokvel/projects/${project.id}/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to allocate slot');

      setSuccessMsg(`${targetMember.user_name} was assigned a slot at payout position #${data.slot.payout_position}.`);
      setShowAssignModal(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSlotAssignForExistingMember = (member: ProjectMember) => {
    setNewlyCreatedMember(member);
    setSlotForm({
      slot_type_name: 'Full Slot',
      slot_number: 1,
      payout_position: slots.length + 1,
      weekly_contribution: '',
      deposit_required: '',
      deposit_paid: '',
      payout_amount: '',
      default_threshold: '',
      post_benefit_increase: ''
    });
    setAssignStep(2);
    setErrorMsg('');
    setSuccessMsg('');
    setShowAssignModal(true);
  };

  const openEditSlot = (slot: ProjectMemberSlot) => {
    setEditingSlot(slot);
    setEditSlotForm({
      payout_position: slot.payout_position,
      weekly_contribution: slot.weekly_contribution,
      deposit_required: slot.deposit_required,
      deposit_paid: slot.deposit_paid,
      payout_amount: slot.payout_amount,
      default_threshold: slot.default_threshold,
      post_benefit_increase: slot.post_benefit_increase
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveSlotEdit = async () => {
    if (!editingSlot) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/slots/${editingSlot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editSlotForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update slot');

      setSuccessMsg('Slot updated successfully.');
      setEditingSlot(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Members & Slot Management</h2>
          <p className="text-xs text-stone-500 mt-1">
            Assign members to the project, allocate their payout slots, and manage slot economics.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAssignModal}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Assign New Member</span>
          </button>
        )}
      </div>

      {errorMsg && !showAssignModal && !editingSlot && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs w-fit">
        <button
          onClick={() => setView('members')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            view === 'members' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Members ({members.length})
        </button>
        <button
          onClick={() => setView('slots')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            view === 'slots' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Slots ({slots.length})
        </button>
      </div>

      {/* Members Table */}
      {view === 'members' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Next of Kin</th>
                  <th className="px-4 py-3 text-center">Constitution</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Slot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {members.length > 0 ? members.map(m => (
                  <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-stone-900">
                      {m.user_name}
                      <span className="block text-[10px] font-normal text-stone-400">{m.user_email}</span>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-stone-700">{m.member_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3.5 text-stone-600">
                      {m.next_of_kin_name || <span className="text-stone-300">Not captured</span>}
                      {m.next_of_kin_phone && (
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <Phone className="w-2.5 h-2.5" /> {m.next_of_kin_phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {m.constitution_accepted ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
                      ) : (
                        <span className="text-[10px] text-amber-600 font-bold">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        m.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : m.status === 'pending_deposit'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : m.status === 'default_risk'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : m.status === 'dismissal_review' || m.status === 'dismissed'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {m.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {memberIdsWithSlots.has(m.id) ? (
                        <span className="text-[10px] text-emerald-700 font-bold">Slot Assigned</span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => openSlotAssignForExistingMember(m)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-[11px] transition-all shadow-xs cursor-pointer"
                        >
                          Assign Slot
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400">No Slot</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-400 text-xs">
                      No members assigned to this project yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slots Table */}
      {view === 'slots' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Slot Type</th>
                  <th className="px-4 py-3 text-right">Weekly</th>
                  <th className="px-4 py-3 text-right">Deposit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {slots.length > 0 ? slots.sort((a, b) => a.payout_position - b.payout_position).map(s => (
                  <tr key={s.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-black text-stone-900">#{s.payout_position}</td>
                    <td className="px-4 py-3.5 font-bold text-stone-900">{s.user_name}</td>
                    <td className="px-4 py-3.5 text-stone-700">{s.slot_type_name}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                      R {(s.current_weekly_contribution || s.weekly_contribution).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right text-stone-700">
                      R {s.deposit_paid.toLocaleString()} / R {s.deposit_required.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-stone-100 text-stone-700">
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => openEditSlot(s)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-stone-400 text-xs">
                      No slots allocated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Member / Slot Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {assignStep === 1 ? 'Step 1: Assign Member' : 'Step 2: Allocate Slot'}
                </h3>
                <p className="text-xs text-stone-500">
                  {assignStep === 1
                    ? 'Select an existing driver or fleet owner to add to this project.'
                    : `Configure ${newlyCreatedMember?.user_name}'s payout slot.`}
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {assignStep === 1 ? (
              <form onSubmit={handleCreateMember} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Select User *
                  </label>
                  {loadingUsers ? (
                    <div className="text-xs text-stone-500 flex items-center gap-2 p-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading eligible users...
                    </div>
                  ) : (
                    <select
                      required
                      value={memberForm.user_id}
                      onChange={e => setMemberForm({ ...memberForm, user_id: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-semibold"
                    >
                      <option value="">-- Select a driver or fleet owner --</option>
                      {availableUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email}) - {u.role}</option>
                      ))}
                    </select>
                  )}
                  {!loadingUsers && availableUsers.length === 0 && (
                    <p className="text-[11px] text-stone-400">
                      No eligible drivers or fleet owners available (all are already members, or none exist yet).
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Member Type</label>
                  <select
                    value={memberForm.member_type}
                    onChange={e => setMemberForm({ ...memberForm, member_type: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-semibold"
                  >
                    <option value="driver">Driver</option>
                    <option value="fleet_owner">Fleet Owner</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Next of Kin Name</label>
                    <input
                      type="text"
                      value={memberForm.next_of_kin_name}
                      onChange={e => setMemberForm({ ...memberForm, next_of_kin_name: e.target.value })}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Next of Kin Phone</label>
                    <input
                      type="text"
                      value={memberForm.next_of_kin_phone}
                      onChange={e => setMemberForm({ ...memberForm, next_of_kin_phone: e.target.value })}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Relationship</label>
                  <input
                    type="text"
                    value={memberForm.next_of_kin_relationship}
                    onChange={e => setMemberForm({ ...memberForm, next_of_kin_relationship: e.target.value })}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Notes</label>
                  <input
                    type="text"
                    value={memberForm.notes}
                    onChange={e => setMemberForm({ ...memberForm, notes: e.target.value })}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
                  >
                    {submitting ? 'Assigning...' : 'Continue to Slot Setup'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Slot Type</label>
                    <select
                      value={slotForm.slot_type_name}
                      onChange={e => setSlotForm({ ...slotForm, slot_type_name: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-semibold"
                    >
                      <option value="Full Slot">Full Slot</option>
                      <option value="Half Slot">Half Slot</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Payout Position</label>
                    <input
                      type="number"
                      min="1"
                      value={slotForm.payout_position}
                      onChange={e => setSlotForm({ ...slotForm, payout_position: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-bold"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-stone-400">
                  Leave the fields below blank to use the standard Full/Half Slot economics automatically.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Weekly Contribution (R)</label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={slotForm.weekly_contribution}
                      onChange={e => setSlotForm({ ...slotForm, weekly_contribution: e.target.value })}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Deposit Required (R)</label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={slotForm.deposit_required}
                      onChange={e => setSlotForm({ ...slotForm, deposit_required: e.target.value })}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Deposit Already Paid (R)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={slotForm.deposit_paid}
                      onChange={e => setSlotForm({ ...slotForm, deposit_paid: e.target.value })}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Vehicle Payout Target (R)</label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={slotForm.payout_amount}
                      onChange={e => setSlotForm({ ...slotForm, payout_amount: e.target.value })}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Skip For Now
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCreateSlot()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
                  >
                    {submitting ? 'Allocating...' : 'Allocate Slot'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">Edit Slot: {editingSlot.user_name}</h3>
                <p className="text-xs text-stone-500">Position #{editingSlot.payout_position} - {editingSlot.slot_type_name}</p>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Payout Position</label>
                <input
                  type="number"
                  min="1"
                  value={editSlotForm.payout_position}
                  onChange={e => setEditSlotForm({ ...editSlotForm, payout_position: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Weekly Contribution (R)</label>
                <input
                  type="number"
                  value={editSlotForm.weekly_contribution}
                  onChange={e => setEditSlotForm({ ...editSlotForm, weekly_contribution: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Deposit Required (R)</label>
                <input
                  type="number"
                  value={editSlotForm.deposit_required}
                  onChange={e => setEditSlotForm({ ...editSlotForm, deposit_required: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Deposit Paid (R)</label>
                <input
                  type="number"
                  value={editSlotForm.deposit_paid}
                  onChange={e => setEditSlotForm({ ...editSlotForm, deposit_paid: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Vehicle Payout Target (R)</label>
                <input
                  type="number"
                  value={editSlotForm.payout_amount}
                  onChange={e => setEditSlotForm({ ...editSlotForm, payout_amount: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Default Threshold (R)</label>
                <input
                  type="number"
                  value={editSlotForm.default_threshold}
                  onChange={e => setEditSlotForm({ ...editSlotForm, default_threshold: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Post-Benefit Weekly Increase (R)</label>
                <input
                  type="number"
                  value={editSlotForm.post_benefit_increase}
                  onChange={e => setEditSlotForm({ ...editSlotForm, post_benefit_increase: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveSlotEdit}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                {submitting ? 'Saving...' : 'Save Slot Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
