import React from 'react';
import { FileSpreadsheet, Download, Users, AlertTriangle, ShieldAlert, Award, TrendingUp, ShieldCheck } from 'lucide-react';
import {
  Project, ProjectMember, ProjectMemberSlot, ProjectPayment,
  ProjectPenalty, ProjectGroupSummary, ProjectAuditLog, User
} from '../../types';

interface ReportsExportsProps {
  project: Project;
  members: ProjectMember[];
  slots: ProjectMemberSlot[];
  payments: ProjectPayment[];
  penalties: ProjectPenalty[];
  summary: ProjectGroupSummary | null;
  auditLogs: ProjectAuditLog[];
  user: User;
}

function csvEscape(value: any): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(csvEscape).join(','), ...rows.map(r => r.map(csvEscape).join(','))];
  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsExports({
  project, members, slots, payments, penalties, summary, auditLogs, user
}: ReportsExportsProps) {
  const isAdmin = user.role === 'admin';
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';
  const dateStamp = new Date().toISOString().split('T')[0];

  const exportMemberStatement = () => {
    downloadCsv(
      `${project.name.replace(/\s+/g, '_')}_member_statement_${dateStamp}.csv`,
      ['Payout Position', 'Member Name', 'Slot Type', 'Weekly Contribution', 'Total Paid', 'Outstanding', 'Deposit Paid', 'Deposit Required', 'Advance Credit', 'Status', 'Benefit Received'],
      slots.sort((a, b) => a.payout_position - b.payout_position).map(s => [
        s.payout_position,
        s.user_name,
        s.slot_type_name,
        s.current_weekly_contribution || s.weekly_contribution,
        s.total_paid,
        s.outstanding_amount,
        s.deposit_paid,
        s.deposit_required,
        s.advance_credit,
        s.status,
        s.benefit_received ? 'Yes' : 'No'
      ])
    );
  };

  const exportArrearsReport = () => {
    const inArrears = slots.filter(s => s.outstanding_amount > 0);
    downloadCsv(
      `${project.name.replace(/\s+/g, '_')}_arrears_report_${dateStamp}.csv`,
      ['Payout Position', 'Member Name', 'Outstanding Amount', 'Default Threshold', 'Status', 'First Arrears Date', 'Grace Period End Date'],
      inArrears.map(s => [
        s.payout_position,
        s.user_name,
        s.outstanding_amount,
        s.default_threshold,
        s.status,
        s.first_arrears_date || '',
        s.default_grace_period_end_date || ''
      ])
    );
  };

  const exportPenaltiesReport = () => {
    downloadCsv(
      `${project.name.replace(/\s+/g, '_')}_penalties_report_${dateStamp}.csv`,
      ['Member Name', 'Penalty Type', 'Amount', 'Reason', 'Applied By', 'Applied Date', 'Due Date', 'Status', 'Waived By', 'Waiver Reason'],
      penalties.map(p => [
        p.user_name,
        p.penalty_type,
        p.penalty_amount,
        p.reason,
        p.applied_by,
        p.applied_date,
        p.due_date,
        p.status,
        p.waived_by || '',
        p.waiver_reason || ''
      ])
    );
  };

  const exportPayoutReadiness = () => {
    downloadCsv(
      `${project.name.replace(/\s+/g, '_')}_payout_readiness_${dateStamp}.csv`,
      ['Payout Position', 'Member Name', 'Slot Type', 'Deposit Cleared', 'Outstanding Balance', 'Status', 'Payout Order Locked', 'Ready For Payout'],
      slots.sort((a, b) => a.payout_position - b.payout_position).map(s => {
        const depositCleared = s.deposit_paid >= s.deposit_required;
        const ready = depositCleared && s.outstanding_amount <= 0 && (s.status === 'active' || s.status === 'paid_ahead');
        return [
          s.payout_position,
          s.user_name,
          s.slot_type_name,
          depositCleared ? 'Yes' : 'No',
          s.outstanding_amount,
          s.status,
          project.payout_order_locked ? 'Yes' : 'No',
          ready ? 'Yes' : 'No'
        ];
      })
    );
  };

  const exportGroupTotals = () => {
    const s = summary;
    downloadCsv(
      `${project.name.replace(/\s+/g, '_')}_group_totals_${dateStamp}.csv`,
      ['Metric', 'Value'],
      [
        ['Project Name', project.name],
        ['Total Members', members.length],
        ['Total Slots', slots.length],
        ['Total Project Target', s?.total_project_target ?? ''],
        ['Total Expected To Date', s?.total_expected_to_date ?? ''],
        ['Total Collected', s?.total_collected ?? ''],
        ['Total Outstanding', s?.total_outstanding ?? ''],
        ['Total Deposits Collected', s?.total_deposits_collected ?? ''],
        ['Total Penalties Collected', s?.total_penalties_collected ?? ''],
        ['Approved Payments Count', payments.filter(p => p.status === 'approved').length],
        ['Pending Review Payments Count', payments.filter(p => p.status === 'pending_review').length]
      ]
    );
  };

  const exportAuditReport = () => {
    downloadCsv(
      `${project.name.replace(/\s+/g, '_')}_audit_report_${dateStamp}.csv`,
      ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Old Value', 'New Value', 'Reason', 'Notes'],
      auditLogs.map(l => [
        l.created_at,
        l.user_name,
        l.user_role,
        l.action,
        l.entity_type,
        l.entity_id,
        l.old_value,
        l.new_value,
        l.reason || '',
        l.notes || ''
      ])
    );
  };

  const reports = [
    {
      id: 'member_statement',
      label: 'Member Statement',
      description: 'Full financial statement per member: contributions, deposits, outstanding balance, advance credit.',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-700',
      action: exportMemberStatement,
      visible: isPrivileged
    },
    {
      id: 'arrears',
      label: 'Arrears Report',
      description: 'Members currently in arrears, including default risk grace period deadlines.',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-700',
      action: exportArrearsReport,
      visible: isPrivileged
    },
    {
      id: 'penalties',
      label: 'Penalties Report',
      description: 'All penalties applied across the project, including waivers and reasons.',
      icon: <ShieldAlert className="w-5 h-5" />,
      color: 'bg-red-50 text-red-700',
      action: exportPenaltiesReport,
      visible: isPrivileged
    },
    {
      id: 'payout_readiness',
      label: 'Payout Readiness Report',
      description: 'Which members are financially ready for their vehicle payout, in payout order.',
      icon: <Award className="w-5 h-5" />,
      color: 'bg-emerald-50 text-emerald-700',
      action: exportPayoutReadiness,
      visible: isPrivileged
    },
    {
      id: 'group_totals',
      label: 'Group Totals Report',
      description: 'Project-wide financial totals: collected, outstanding, deposits, penalties.',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-purple-50 text-purple-700',
      action: exportGroupTotals,
      visible: isPrivileged
    },
    {
      id: 'audit',
      label: 'Audit Report',
      description: 'Full audit trail of all administrative and financial actions on this project (Admin only).',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'bg-stone-100 text-stone-700',
      action: exportAuditReport,
      visible: isAdmin
    }
  ];

  const visibleReports = reports.filter(r => r.visible);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-amber-600" />
          <h2 className="text-xl font-black text-stone-900">Reports & Exports</h2>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Generate CSV exports for record-keeping, committee meetings, and regulatory compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleReports.map(r => (
          <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.color}`}>
                {r.icon}
              </div>
              <h3 className="text-sm font-black text-stone-900">{r.label}</h3>
              <p className="text-xs text-stone-500">{r.description}</p>
            </div>
            <button
              onClick={r.action}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download CSV</span>
            </button>
          </div>
        ))}
      </div>

      {!isPrivileged && (
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-500 text-center">
          Detailed reports (member statements, arrears, penalties, payout readiness, group totals, audit trail) are available to Administrators and Accountants.
        </div>
      )}
    </div>
  );
}
