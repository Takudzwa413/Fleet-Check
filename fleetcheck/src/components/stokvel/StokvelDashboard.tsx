import React, { useState, useEffect } from 'react';
import {
  Car, ShieldCheck, Calendar, DollarSign, Users, Award,
  AlertCircle, CheckCircle2, Clock, FileText, ArrowRight,
  TrendingUp, Lock, RefreshCw, Layers, ShieldAlert,
  HelpCircle, Eye, ChevronRight
} from 'lucide-react';
import MembersSlotsManagement from './MembersSlotsManagement';
import ComplianceGovernance from './ComplianceGovernance';
import ReportsExports from './ReportsExports';
import {
  Project,
  ProjectMember,
  ProjectMemberSlot,
  ProjectContributionSchedule,
  ProjectPayment,
  ProjectBenefitDelivery,
  ProjectGroupSummary,
  ProjectPenalty,
  ProjectAssemblyMeeting,
  ProjectInsuranceRecord,
  ProjectAuditLog,
  User
} from '../../types';

import StokvelOverview from './StokvelOverview';
import PayoutOrderMatrix from './PayoutOrderMatrix';
import WeeklyScheduleView from './WeeklyScheduleView';
import POPManagementDesk from './POPManagementDesk';
import VehicleBenefitPipeline from './VehicleBenefitPipeline';
import GroupSummaryPublisher from './GroupSummaryPublisher';
import PenaltiesDesk from './PenaltiesDesk';
import InsuranceAndMeetings from './InsuranceAndMeetings';
import AuditLogsViewer from './AuditLogsViewer';
import UploadPOPModal from './UploadPOPModal';

interface StokvelDashboardProps {
  key?: React.Key;
  user: User;
  token: string;
  projectId?: string;
  initialTab?: string;
}

export default function StokvelDashboard({
  user,
  token,
  projectId = 'proj_action_pack_01',
  initialTab = 'overview'
}: StokvelDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [slots, setSlots] = useState<ProjectMemberSlot[]>([]);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [benefits, setBenefits] = useState<ProjectBenefitDelivery[]>([]);
  const [summary, setSummary] = useState<ProjectGroupSummary | null>(null);
  const [penalties, setPenalties] = useState<ProjectPenalty[]>([]);
  const [meetings, setMeetings] = useState<ProjectAssemblyMeeting[]>([]);
  const [insuranceRecords, setInsuranceRecords] = useState<ProjectInsuranceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<ProjectAuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // POP upload modal
  const [isUploadPOPOpen, setIsUploadPOPOpen] = useState(false);
  const [defaultSlotForPOP, setDefaultSlotForPOP] = useState<string | undefined>(undefined);

  const isPrivileged = user.role === 'admin' || user.role === 'accountant';
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    fetchProjectData();
  }, [projectId, token]);

  const fetchProjectData = async () => {
    setLoading(true);
    setError('');

    const authHeader = { 'Authorization': `Bearer ${token}` };

    try {
      // 1. Fetch Project Details (must succeed for the module to render at all)
      const projectRes = await fetch(`/api/stokvel/projects/${projectId}`, { headers: authHeader });
      const projectData = await projectRes.json();
      if (!projectRes.ok) throw new Error(projectData.error || 'Failed to load project');
      setProject(projectData.project);

      // 2. Fetch every sub-resource from its own (RBAC-scoped) endpoint in parallel.
      // Each of these has its own role-based filtering/sanitization server-side, so they
      // must be fetched individually rather than assumed to come back on the project GET.
      const endpoints: { key: string; url: string; enabled: boolean }[] = [
        { key: 'members', url: `/api/stokvel/projects/${projectId}/members`, enabled: true },
        { key: 'slots', url: `/api/stokvel/projects/${projectId}/slots`, enabled: true },
        { key: 'payments', url: `/api/stokvel/projects/${projectId}/payments`, enabled: true },
        { key: 'benefits', url: `/api/stokvel/projects/${projectId}/vehicle-benefits`, enabled: true },
        { key: 'summary', url: `/api/stokvel/projects/${projectId}/group-summary`, enabled: true },
        { key: 'penalties', url: `/api/stokvel/projects/${projectId}/penalties`, enabled: true },
        { key: 'meetings', url: `/api/stokvel/projects/${projectId}/meetings`, enabled: true },
        { key: 'insurance', url: `/api/stokvel/projects/${projectId}/insurance`, enabled: true },
        // Audit logs are Admin-only server-side; only Admins (not Accountants) may fetch this.
        { key: 'auditLogs', url: `/api/stokvel/projects/${projectId}/audit-logs`, enabled: isAdmin }
      ];

      const results = await Promise.all(
        endpoints.map(ep =>
          ep.enabled
            ? fetch(ep.url, { headers: authHeader }).then(r => r.json().then(body => ({ key: ep.key, ok: r.ok, body })))
            : Promise.resolve({ key: ep.key, ok: true, body: {} })
        )
      );

      const byKey: Record<string, any> = {};
      results.forEach(r => { byKey[r.key] = r.ok ? r.body : {}; });

      setMembers(byKey.members?.members || []);
      setSlots(byKey.slots?.slots || []);
      setPayments(byKey.payments?.payments || []);
      setBenefits(byKey.benefits?.benefits || []);
      setSummary(byKey.summary?.summary || null);
      setPenalties(byKey.penalties?.penalties || []);
      setMeetings(byKey.meetings?.meetings || []);
      setInsuranceRecords(byKey.insurance?.insurance || []);
      setAuditLogs(byKey.auditLogs?.auditLogs || []);
    } catch (err: any) {
      console.error('Stokvel data fetch error:', err);
      setError(err.message || 'Error loading Stokvel project module.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUploadPOP = (slotId?: string) => {
    setDefaultSlotForPOP(slotId);
    setIsUploadPOPOpen(true);
  };

  const navTabs = [
    { id: 'overview', label: 'Overview & Progress', icon: <Car className="w-4 h-4" /> },
    ...(isPrivileged ? [{ id: 'members', label: 'Members & Slots', icon: <Users className="w-4 h-4" /> }] : []),
    { id: 'payout-order', label: 'Payout Ladder Matrix', icon: <Lock className="w-4 h-4" />, badge: project?.payout_order_locked ? 'Locked' : undefined },
    { id: 'schedules', label: 'Weekly Schedule (15 Mo)', icon: <Calendar className="w-4 h-4" /> },
    {
      id: 'pop-hub',
      label: 'Proof of Payment Hub',
      icon: <DollarSign className="w-4 h-4" />,
      badge: payments.filter(p => p.status === 'pending_review').length || undefined,
      badgeColor: 'bg-amber-500 text-stone-950 font-black'
    },
    { id: 'benefits', label: 'Vehicle Acquisition Pipeline', icon: <Award className="w-4 h-4" /> },
    { id: 'group-summary', label: 'Group Reconciliation & Standing', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'penalties', label: 'Penalties & Compliance', icon: <ShieldAlert className="w-4 h-4" />, badge: penalties.filter(p => p.status === 'unpaid').length || undefined },
    { id: 'meetings', label: 'Assembly & Constitution', icon: <FileText className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance & Governance', icon: <Layers className="w-4 h-4" /> },
    ...(isPrivileged ? [{ id: 'reports', label: 'Reports & Exports', icon: <TrendingUp className="w-4 h-4" /> }] : []),
    ...(isPrivileged ? [{ id: 'audit-logs', label: 'Audit Trail', icon: <ShieldCheck className="w-4 h-4" /> }] : [])
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs font-bold text-stone-600">Loading Action Pack Stokvel Project Engine...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 bg-white border border-red-200 rounded-3xl text-center max-w-lg mx-auto space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-stone-900">Project Module Not Found</h3>
        <p className="text-xs text-stone-600">{error || 'Could not load the specified vehicle acquisition project.'}</p>
        <button
          onClick={fetchProjectData}
          className="px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded-xl cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Project Sub-Navigation Tabs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center space-x-1 min-w-max">
          {navTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${tab.badgeColor || 'bg-stone-200 text-stone-800'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'overview' && (
        <StokvelOverview
          project={project}
          user={user}
          slots={slots}
          summary={summary}
          payments={payments}
          onNavigateTab={setActiveTab}
          onOpenUploadPOP={() => handleOpenUploadPOP()}
        />
      )}

      {activeTab === 'members' && isPrivileged && (
        <MembersSlotsManagement
          project={project}
          members={members}
          slots={slots}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
        />
      )}

      {activeTab === 'payout-order' && (
        <PayoutOrderMatrix
          project={project}
          slots={slots}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
        />
      )}

      {activeTab === 'schedules' && (
        <WeeklyScheduleView
          project={project}
          slots={slots}
          user={user}
          token={token}
          onOpenUploadPOP={handleOpenUploadPOP}
        />
      )}

      {activeTab === 'pop-hub' && (
        <POPManagementDesk
          project={project}
          payments={payments}
          slots={slots}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
          onOpenUploadPOP={() => handleOpenUploadPOP()}
        />
      )}

      {activeTab === 'benefits' && (
        <VehicleBenefitPipeline
          project={project}
          slots={slots}
          benefits={benefits}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
        />
      )}

      {activeTab === 'group-summary' && (
        <GroupSummaryPublisher
          project={project}
          summary={summary}
          slots={slots}
          payments={payments}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
        />
      )}

      {activeTab === 'penalties' && (
        <PenaltiesDesk
          project={project}
          penalties={penalties}
          slots={slots}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
        />
      )}

      {activeTab === 'meetings' && (
        <InsuranceAndMeetings
          project={project}
          insuranceRecords={insuranceRecords}
          meetings={meetings}
          slots={slots}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
        />
      )}

      {activeTab === 'compliance' && (
        <ComplianceGovernance
          project={project}
          slots={slots}
          user={user}
          token={token}
          onRefresh={fetchProjectData}
        />
      )}

      {activeTab === 'reports' && isPrivileged && (
        <ReportsExports
          project={project}
          members={members}
          slots={slots}
          payments={payments}
          penalties={penalties}
          summary={summary}
          auditLogs={auditLogs}
          user={user}
        />
      )}

      {activeTab === 'audit-logs' && (
        <AuditLogsViewer logs={auditLogs} />
      )}

      {/* POP Upload Receipt Modal */}
      {isUploadPOPOpen && (
        <UploadPOPModal
          project={project}
          slots={slots}
          user={user}
          token={token}
          defaultSlotId={defaultSlotForPOP}
          onClose={() => setIsUploadPOPOpen(false)}
          onSuccess={() => {
            fetchProjectData();
            setActiveTab('pop-hub');
          }}
        />
      )}
    </div>
  );
}
