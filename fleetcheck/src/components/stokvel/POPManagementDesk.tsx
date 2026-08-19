import React, { useState } from 'react';
import {
  FileText, CheckCircle2, XCircle, Clock, AlertCircle,
  Eye, Download, RefreshCw, ShieldCheck, DollarSign,
  Filter, Search, ArrowRight, Check, AlertTriangle, Paperclip
} from 'lucide-react';
import {
  Project,
  ProjectPayment,
  ProjectMemberSlot,
  User
} from '../../types';

interface POPManagementDeskProps {
  project: Project;
  payments: ProjectPayment[];
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  onRefresh: () => void;
  onOpenUploadPOP: () => void;
}

export default function POPManagementDesk({
  project,
  payments,
  slots,
  user,
  token,
  onRefresh,
  onOpenUploadPOP
}: POPManagementDeskProps) {
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';
  const [filterStatus, setFilterFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Review Modal State
  const [selectedPayment, setSelectedPayment] = useState<ProjectPayment | null>(null);
  const [bankStatementRef, setBankStatementRef] = useState('');
  const [reconciliationNotes, setReconciliationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Manual Allocation Override State
  const [useManualAllocation, setUseManualAllocation] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [customAllocations, setCustomAllocations] = useState<{ type: string; amount: number; week_number?: number }[]>([
    { type: 'weekly_obligation', amount: 0 }
  ]);

  const allocationTypeLabels: Record<string, string> = {
    penalty: 'Outstanding Penalty',
    deposit: 'Security Deposit',
    weekly_obligation: 'Weekly Contribution',
    advance_credit: 'Advance Credit',
    insurance: 'Insurance Premium',
    other: 'Other'
  };

  const allocationTotal = customAllocations.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

  const addAllocationRow = () => {
    setCustomAllocations(prev => [...prev, { type: 'weekly_obligation', amount: 0 }]);
  };

  const removeAllocationRow = (index: number) => {
    setCustomAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateAllocationRow = (index: number, field: 'type' | 'amount' | 'week_number', value: string) => {
    setCustomAllocations(prev => prev.map((row, i) => {
      if (i !== index) return row;
      if (field === 'type') return { ...row, type: value };
      if (field === 'amount') return { ...row, amount: Number(value) };
      return { ...row, week_number: value ? Number(value) : undefined };
    }));
  };

  const filteredPayments = payments.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.user_name?.toLowerCase().includes(q);
      const matchRef = p.bank_reference?.toLowerCase().includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q);
      return matchName || matchRef || matchNotes;
    }
    return true;
  });

  const pendingCount = payments.filter(p => p.status === 'pending_review').length;

  const handleOpenReview = (p: ProjectPayment) => {
    setSelectedPayment(p);
    setBankStatementRef(p.bank_statement_ref || '');
    setReconciliationNotes(p.reconciliation_notes || '');
    setRejectionReason('');
    setErrorMsg('');
    setSuccessMsg('');
    setUseManualAllocation(false);
    setOverrideReason('');
    setCustomAllocations([{ type: 'weekly_obligation', amount: p.amount || 0 }]);
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;

    if (useManualAllocation) {
      if (!overrideReason || overrideReason.trim().length < 4) {
        setErrorMsg('A reason is required to manually override the automatic payment allocation.');
        return;
      }
      if (Math.abs(allocationTotal - selectedPayment.amount) > 0.01) {
        setErrorMsg(`Manual allocation total (R${allocationTotal.toLocaleString()}) must equal the payment amount (R${selectedPayment.amount.toLocaleString()}).`);
        return;
      }
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/payments/${selectedPayment.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'approved',
          bank_statement_reference: bankStatementRef || `SB-REC-${Date.now().toString().slice(-6)}`,
          internal_notes: reconciliationNotes || 'Verified against Standard Bank EFT statement.',
          ...(useManualAllocation ? {
            custom_allocations: customAllocations.filter(a => (Number(a.amount) || 0) > 0),
            override_reason: overrideReason.trim()
          } : {})
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve payment');

      setSuccessMsg(useManualAllocation
        ? 'Payment approved with manual allocation override applied successfully.'
        : 'Payment approved and allocated across member obligations successfully.');
      setTimeout(() => {
        setSelectedPayment(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    if (!rejectionReason || rejectionReason.trim().length < 4) {
      setErrorMsg('A specific rejection reason is required (e.g. Reference not found on bank statement).');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/payments/${selectedPayment.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject payment');

      setSuccessMsg('Payment marked as rejected.');
      setTimeout(() => {
        setSelectedPayment(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-stone-900">Proof of Payment (POP) Hub</h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-500 text-stone-950 text-xs font-black rounded-full animate-pulse">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Reconciliation desk for EFT deposit receipts, weekly contributions, insurance, and penalties.
          </p>
        </div>

        <button
          onClick={onOpenUploadPOP}
          className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <DollarSign className="w-4 h-4 text-amber-400" />
          <span>Upload POP Receipt</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs overflow-x-auto">
          <button
            onClick={() => setFilterFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Receipts ({payments.length})
          </button>
          <button
            onClick={() => setFilterFilter('pending_review')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'pending_review' ? 'bg-white text-amber-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Pending Verification ({pendingCount})
          </button>
          <button
            onClick={() => setFilterFilter('approved')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'approved' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Approved ({payments.filter(p => p.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilterFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'rejected' ? 'bg-white text-red-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Rejected ({payments.filter(p => p.status === 'rejected').length})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search reference, member..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-xs pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Payment Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-4 py-3">Bank Reference</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Receipt / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-stone-900">
                      {p.user_name}
                      <span className="block text-[10px] font-normal text-stone-400">
                        {p.slot_type_name || 'Member Slot'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize font-semibold text-stone-800">
                        {p.payment_type.replace('_', ' ')}
                      </span>
                      {p.week_number && (
                        <span className="block text-[10px] text-stone-500">Week #{p.week_number}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-stone-900">
                      R {p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">
                      {p.payment_date}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-stone-700 font-medium">{p.bank_reference}</span>
                      {p.bank_statement_ref && (
                        <span className="block text-[10px] text-emerald-700 font-mono">
                          Verified: {p.bank_statement_ref}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        p.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : p.status === 'pending_review'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200 font-black'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isPrivileged && p.status === 'pending_review' ? (
                        <button
                          onClick={() => handleOpenReview(p)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                        >
                          Review & Reconcile
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenReview(p)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition-all cursor-pointer"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400 text-xs">
                    No proof of payment receipts found matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP Review / Inspection Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">Proof of Payment Review & Allocation</h3>
                <p className="text-xs text-stone-500">ID: {selectedPayment.id}</p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">Member Name</span>
                <span className="font-bold text-stone-900">{selectedPayment.user_name}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">Payment Type</span>
                <span className="font-bold text-stone-900 capitalize">{selectedPayment.payment_type.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">Amount Claimed</span>
                <span className="font-black text-emerald-700 text-sm">R {selectedPayment.amount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">Payment Date</span>
                <span className="font-semibold text-stone-800">{selectedPayment.payment_date}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">EFT Bank Reference</span>
                <span className="font-mono font-bold text-stone-900">{selectedPayment.bank_reference}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">Current Status</span>
                <span className="font-bold uppercase text-amber-800">{selectedPayment.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Attachment Preview (if any) */}
            {selectedPayment.file_data ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> Uploaded Proof Slip
                </label>
                <div className="border border-stone-200 rounded-xl p-3 bg-stone-50 flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-700 truncate">{selectedPayment.file_name || 'proof_of_payment.pdf'}</span>
                  <a
                    href={selectedPayment.file_data}
                    download={selectedPayment.file_name || 'proof_of_payment'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-stone-900 text-white font-bold text-xs rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Slip
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-500 text-center">
                Electronic EFT reference filed without image attachment.
              </div>
            )}

            {/* Member Notes */}
            {selectedPayment.member_notes && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700">
                <span className="font-bold block text-stone-500 text-[10px] uppercase">Member Notes:</span>
                "{selectedPayment.member_notes}"
              </div>
            )}

            {/* Allocation Result (for already-approved payments) */}
            {selectedPayment.status === 'approved' && selectedPayment.allocation_summary && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Allocation Breakdown
                </span>
                <p className="text-[11px] text-emerald-800">{selectedPayment.allocation_summary}</p>
              </div>
            )}

            {/* 5-Tier Allocation Priority Explainer */}
            {selectedPayment.status === 'pending_review' && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  Automatic 5-Tier Allocation Priority on Approval:
                </span>
                <p className="text-[11px] text-blue-800">
                  1. Penalties Pool → 2. Initial Security Deposit → 3. Oldest Unpaid Weeks → 4. Current Week → 5. Advance Credit Pool.
                </p>
              </div>
            )}

            {/* Privilege Actions Form (Accountant / Admin) */}
            {isPrivileged && selectedPayment.status === 'pending_review' && (
              <div className="space-y-4 pt-2 border-t border-stone-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Standard Bank Statement Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SB-2026-03-01-9982"
                      value={bankStatementRef}
                      onChange={e => setBankStatementRef(e.target.value)}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Reconciliation Audit Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cleared via Standard Bank Online statement batch #4"
                      value={reconciliationNotes}
                      onChange={e => setReconciliationNotes(e.target.value)}
                      className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                {/* Manual Allocation Override */}
                <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useManualAllocation}
                      onChange={e => setUseManualAllocation(e.target.checked)}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Override Automatic Allocation (Manual)
                    </span>
                  </label>

                  {useManualAllocation && (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                          Override Reason *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Member requested lump sum applied to future week 12 instead of clearing arrears."
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                          className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
                        />
                      </div>

                      <div className="space-y-2">
                        {customAllocations.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={row.type}
                              onChange={e => updateAllocationRow(idx, 'type', e.target.value)}
                              className="flex-1 text-xs p-2 bg-white border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-stone-400 font-semibold"
                            >
                              {Object.entries(allocationTypeLabels).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                            {row.type === 'weekly_obligation' && (
                              <input
                                type="number"
                                min="1"
                                placeholder="Week #"
                                value={row.week_number ?? ''}
                                onChange={e => updateAllocationRow(idx, 'week_number', e.target.value)}
                                className="w-20 text-xs p-2 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-stone-400"
                              />
                            )}
                            <div className="relative w-32">
                              <span className="absolute left-2.5 top-2 text-[10px] font-bold text-stone-400">R</span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={row.amount}
                                onChange={e => updateAllocationRow(idx, 'amount', e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-2 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-stone-400 font-bold"
                              />
                            </div>
                            {customAllocations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAllocationRow(idx)}
                                className="text-stone-400 hover:text-red-600 text-xs font-bold px-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addAllocationRow}
                        className="text-xs font-bold text-stone-700 hover:text-stone-900 cursor-pointer"
                      >
                        + Add Allocation Line
                      </button>

                      <div className={`text-xs font-bold p-2 rounded-lg ${
                        Math.abs(allocationTotal - selectedPayment.amount) > 0.01
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        Allocated: R{allocationTotal.toLocaleString()} / R{selectedPayment.amount.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-red-700 uppercase tracking-wider">
                    Rejection Reason (If rejecting receipt)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EFT funds not reflected on official bank statement; incorrect account number used."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full text-xs p-2.5 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 text-red-900 bg-red-50/40"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
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

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>

              {isPrivileged && selectedPayment.status === 'pending_review' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Reject Receipt
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || (useManualAllocation && Math.abs(allocationTotal - selectedPayment.amount) > 0.01)}
                    onClick={handleApprove}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Allocating...' : useManualAllocation ? 'Approve With Manual Allocation' : 'Approve & Allocate Funds'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
