import React from 'react';
import {
  Car, ShieldCheck, Calendar, DollarSign, Users, Award,
  AlertCircle, CheckCircle2, Clock, FileText, ArrowRight,
  TrendingUp, Lock, RefreshCw, Copy, Check, ExternalLink,
  ChevronRight, AlertTriangle, Building, Banknote
} from 'lucide-react';
import {
  Project,
  ProjectMemberSlot,
  ProjectGroupSummary,
  ProjectPayment,
  User
} from '../../types';

interface StokvelOverviewProps {
  project: Project;
  user: User;
  slots: ProjectMemberSlot[];
  summary?: ProjectGroupSummary | null;
  payments: ProjectPayment[];
  onNavigateTab: (tabId: string) => void;
  onOpenUploadPOP: () => void;
}

export default function StokvelOverview({
  project,
  user,
  slots,
  summary,
  payments,
  onNavigateTab,
  onOpenUploadPOP
}: StokvelOverviewProps) {
  const [copiedBank, setCopiedBank] = React.useState(false);
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';

  const userSlot = slots.find(s => s.user_id === user.id);
  const totalTarget = summary?.total_project_target || slots.reduce((acc, s) => acc + s.payout_amount, 0) || 900000;
  const totalCollected = summary?.total_collected || payments.filter(p => p.status === 'approved').reduce((acc, p) => acc + p.amount, 0);
  const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : 0;

  const copyBankDetails = () => {
    const text = `Bank: ${project.bank_name}\nAccount: ${project.bank_account_name}\nAcc No: ${project.bank_account_number}\nBranch: ${project.branch_code}\nRef: ${project.payment_reference_instructions}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Project Title & Cycle Progress */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  Vehicle Acquisition Stokvel
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  project.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {project.status === 'active' ? 'Active Cycle' : project.status.replace('_', ' ')}
                </span>
                {project.payout_order_locked && (
                  <span className="px-3 py-1 bg-stone-700/60 text-stone-300 border border-stone-600 rounded-full text-xs font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3 text-stone-400" />
                    Payout Order Locked
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{project.name}</h1>
              <p className="text-sm text-stone-300 max-w-2xl">{project.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenUploadPOP}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                Upload POP Receipt
              </button>
              {project.constitution_document_name && (
                <button
                  onClick={() => onNavigateTab('meetings')}
                  className="px-4 py-2.5 bg-stone-700/80 hover:bg-stone-700 text-white font-semibold text-sm rounded-xl transition-all border border-stone-600 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-stone-300" />
                  Constitution
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Key Numbers */}
          <div className="bg-stone-800/80 backdrop-blur-md rounded-2xl p-5 border border-stone-700/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs text-stone-400 font-medium">Stokvel Acquisition Capital</span>
                <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2">
                  <span>R {totalCollected.toLocaleString()}</span>
                  <span className="text-xs text-stone-400 font-normal">of R {totalTarget.toLocaleString()} total target</span>
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-xs text-stone-400 font-medium">Cycle Timeline</span>
                <div className="text-sm font-bold text-amber-300">
                  Week {project.computed_current_week || 1} of {project.total_weeks} weeks ({project.duration_months} Months)
                </div>
              </div>
            </div>

            {/* Progress Visual */}
            <div className="space-y-1.5">
              <div className="w-full h-3.5 bg-stone-700 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-stone-400">
                <span>Start: {project.start_date}</span>
                <span className="font-bold text-stone-300">{progressPercent}% Funded</span>
                <span>Target Completion: {project.end_date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User's Assigned Slot Card (If Driver or Fleet Owner) */}
      {userSlot && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Your Allocated Slot</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  userSlot.status === 'active' || userSlot.status === 'paid_ahead'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : userSlot.status === 'in_arrears'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : userSlot.status === 'dismissal_review'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-stone-100 text-stone-800 border border-stone-200'
                }`}>
                  {userSlot.status.replace('_', ' ')}
                </span>
                {userSlot.benefit_received && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Vehicle Assigned
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <span>{userSlot.slot_type_name}</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                  Position #{userSlot.payout_position}
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Weekly Contribution: <strong className="text-stone-800">R {userSlot.current_weekly_contribution?.toLocaleString() || userSlot.weekly_contribution.toLocaleString()}</strong> | 
                Vehicle Payout: <strong className="text-stone-800">R {userSlot.payout_amount.toLocaleString()}</strong> | 
                Deposit Required: <strong className="text-stone-800">R {userSlot.deposit_required.toLocaleString()}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-center">
                <span className="text-stone-500 block text-[10px] uppercase font-bold">Total Paid</span>
                <span className="font-black text-stone-900 text-sm">R {userSlot.total_paid.toLocaleString()}</span>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-center">
                <span className="text-stone-500 block text-[10px] uppercase font-bold">Outstanding</span>
                <span className={`font-black text-sm ${userSlot.outstanding_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  R {userSlot.outstanding_amount.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('schedules')}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <span>View Schedule</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Banking Details + Next Payout Target + Summary Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Official Banking Details */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-900">Stokvel Bank Account</h4>
                <p className="text-[11px] text-stone-500">Official Group Account for EFT Deposits</p>
              </div>
            </div>
            <button
              onClick={copyBankDetails}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title="Copy Bank Details"
            >
              {copiedBank ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Bank:</span>
              <span className="font-bold text-stone-900">{project.bank_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Account Name:</span>
              <span className="font-bold text-stone-900">{project.bank_account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Account Number:</span>
              <span className="font-mono font-bold text-stone-900">{project.bank_account_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Branch Code:</span>
              <span className="font-mono font-bold text-stone-900">{project.branch_code}</span>
            </div>
            <div className="pt-1.5 border-t border-stone-200 flex justify-between items-center text-[11px]">
              <span className="text-stone-500">Payment Reference:</span>
              <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {project.payment_reference_instructions || 'AP-[NAME]-[SLOT]'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>All EFTs verified by Senior Project Accountant against bank statements.</span>
          </div>
        </div>

        {/* Card 2: Next In Line for Vehicle Acquisition */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-stone-900">Next Payout Position</h4>
              <p className="text-[11px] text-stone-500">Currently in vehicle handover preparation</p>
            </div>
          </div>

          {slots.length > 0 ? (
            (() => {
              const sorted = [...slots].sort((a, b) => (a.payout_position || 99) - (b.payout_position || 99));
              const currentBeneficiary = sorted.find(s => !s.benefit_received) || sorted[0];
              return (
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-lg">
                      Position #{currentBeneficiary.payout_position}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-900">
                      R {currentBeneficiary.payout_amount.toLocaleString()} Target
                    </span>
                  </div>
                  <div>
                    <h5 className="font-black text-stone-900 text-sm">{currentBeneficiary.user_name}</h5>
                    <p className="text-xs text-stone-600">{currentBeneficiary.slot_type_name} • Deposit Paid: R {currentBeneficiary.deposit_paid.toLocaleString()}</p>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-medium">Tracking & Roadworthy Prep</span>
                    <button
                      onClick={() => onNavigateTab('benefits')}
                      className="text-emerald-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Pipeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-4 bg-stone-50 text-stone-500 text-xs rounded-xl text-center">
              No slots allocated yet.
            </div>
          )}

          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Vehicles are dealer-inspected, fitted with Cartrack and insured under Santam.</span>
          </div>
        </div>

        {/* Card 3: Group Financial Transparency Notice */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-stone-100 text-stone-900 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-stone-900">Financial Summary</h4>
              <p className="text-[11px] text-stone-500">Published Finance Standing</p>
            </div>
          </div>

          {summary ? (
            <div className="space-y-2 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Members in Good Standing:</span>
                  <span className="font-bold text-emerald-700">{summary.members_up_to_date_count} of {summary.number_of_members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Deposits Reserve:</span>
                  <span className="font-bold text-stone-900">R {summary.total_deposits_collected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Penalties Pool:</span>
                  <span className="font-bold text-stone-900">R {summary.total_penalties_collected.toLocaleString()}</span>
                </div>
                {summary.published_at && (
                  <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-200">
                    Published: {new Date(summary.published_at).toLocaleDateString()} by {summary.published_by}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-stone-600 italic">"{summary.notes_to_members}"</p>
            </div>
          ) : (
            <div className="p-4 bg-stone-50 text-stone-500 text-xs rounded-xl text-center">
              Initial group summary pending finance publication.
            </div>
          )}

          <button
            onClick={() => onNavigateTab('group-summary')}
            className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all text-center cursor-pointer"
          >
            View Complete Group Standing & Breakdown
          </button>
        </div>
      </div>

      {/* Payout Ladder Preview */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span>Payout Order & Member Ladder</span>
              {project.payout_order_locked && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded border border-stone-200">
                  Locked
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-500">All positions established and governed by the Action Pack Stokvel Constitution.</p>
          </div>
          <button
            onClick={() => onNavigateTab('payout-order')}
            className="text-xs font-bold text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Matrix & Override Desk</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {slots.map((s, idx) => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all ${
                s.benefit_received
                  ? 'bg-purple-50/40 border-purple-200'
                  : idx === 0
                  ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                  : 'bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black px-2 py-0.5 bg-stone-900 text-white rounded-md">
                  #{s.payout_position}
                </span>
                <span className="text-[11px] font-bold text-stone-500">{s.slot_type_name}</span>
              </div>
              <h5 className="font-black text-stone-900 text-sm truncate">{s.user_name}</h5>
              <div className="mt-2 text-xs space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="font-bold text-stone-900">R {s.payout_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weekly:</span>
                  <span className="font-bold text-stone-900">R {s.current_weekly_contribution?.toLocaleString() || s.weekly_contribution.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-bold capitalize ${s.outstanding_amount > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
