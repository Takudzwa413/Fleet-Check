import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, Search, PlusCircle,
  History, Upload, UserCheck, KeyRound, X, FileText, FileImage, Users, Building2,
  Sparkles, CheckCircle2, Award, ChevronRight, HelpCircle, Info
} from 'lucide-react';
import { User, FleetOwnerProfile } from '../types';
import DashboardLayout, { NavItem, StatChip } from './layout/DashboardLayout';
import DriverSearchModule from './fleet-owner/DriverSearchModule';
import IncidentReportForm from './fleet-owner/IncidentReportForm';
import MyComplaintsLog from './fleet-owner/MyComplaintsLog';
import VerificationFilesModule from './fleet-owner/VerificationFilesModule';
import DriverRequestsModule from './fleet-owner/DriverRequestsModule';
import MyFleetDriversModule from './fleet-owner/MyFleetDriversModule';
import { Tooltip, StatusBadgeWithTooltip, RiskBadgeWithTooltip } from './ui/Tooltip';

interface FleetOwnerDashboardProps {
  user: User;
  profile?: FleetOwnerProfile;
  isVerified: boolean;
  onLogout: () => void;
  token: string;
}

export default function FleetOwnerDashboard({
  user,
  profile,
  isVerified,
  onLogout,
  token
}: FleetOwnerDashboardProps) {
  const [dbTab, setDbTab] = useState<'search' | 'my_drivers' | 'submit_complaint' | 'my_complaints' | 'verification_docs' | 'driver_requests'>('search');
  
  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [previewModalDoc, setPreviewModalDoc] = useState<any | null>(null);

  // Password Modal Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  React.useEffect(() => {
    // Quick load of driver requests count for badge
    const fetchRequestsCount = async () => {
      try {
        const res = await fetch('/api/owner/driver-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.requests) {
          const pending = data.requests.filter((r: any) => r.status === 'pending').length;
          setPendingRequestsCount(pending);
        }
      } catch (err) {
        // silent
      }
    };
    fetchRequestsCount();
  }, [token, dbTab]);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPwdSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwdSuccess('');
      }, 1500);
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const getRiskColorBadge = (level: string) => {
    switch (level) {
      case 'none': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'low': return 'bg-stone-100 text-stone-800 border-stone-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'pending_review': return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'disputed': return 'bg-red-50 text-red-700 border-red-100';
      case 'rejected': return 'bg-stone-150 text-stone-600 border-stone-200';
      case 'resolved': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-stone-50 text-stone-600 border-stone-100';
    }
  };

  const navItems: NavItem[] = [
    {
      id: 'search',
      label: 'Driver Vetting & Search',
      icon: <Search className="h-4 w-4" />,
      category: 'OVERVIEW',
      tooltipTitle: 'Driver Vetting & Search',
      tooltip: 'Search the cross-platform registry by name, phone, SA ID, license, or plate.'
    },
    {
      id: 'my_drivers',
      label: 'My Fleet Drivers',
      icon: <Users className="h-4 w-4" />,
      category: 'FLEET OPS',
      tooltipTitle: 'My Fleet Drivers',
      tooltip: 'Manage currently assigned drivers, linked vehicles, and operational status.'
    },
    {
      id: 'submit_complaint',
      label: 'Report Incident',
      icon: <PlusCircle className="h-4 w-4" />,
      category: 'FLEET OPS',
      tooltipTitle: 'Report Driver Incident',
      tooltip: 'File a formal incident report with evidence and category classification.'
    },
    {
      id: 'my_complaints',
      label: 'My Complaints Log',
      icon: <History className="h-4 w-4" />,
      category: 'FLEET OPS',
      tooltipTitle: 'My Complaints Log',
      tooltip: 'Track the moderation and resolution status of your submitted incident reports.'
    },
    {
      id: 'driver_requests',
      label: 'Driver Requests',
      icon: <UserCheck className="h-4 w-4" />,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      category: 'FLEET OPS',
      tooltipTitle: 'Driver Affiliation Requests',
      tooltip: 'Review and approve affiliation requests submitted by commercial drivers.'
    },
    {
      id: 'verification_docs',
      label: 'Verification Files',
      icon: <Upload className="h-4 w-4" />,
      category: 'ACCOUNT',
      tooltipTitle: 'Operator Verification Documents',
      tooltip: 'Upload business proof, CIPC papers, or fleet management screenshots for verification.'
    }
  ];

  const statChips: StatChip[] = [
    {
      label: 'Fleet Company',
      value: profile?.company_name || 'Fleet Operator',
      subtext: isVerified ? 'Verified Account' : 'Action Required',
      icon: <Building2 className="h-5 w-5" />,
      iconBgColor: 'bg-purple-50',
      iconTextColor: 'text-purple-600',
      trend: isVerified ? 'Active' : 'Pending',
      trendUp: isVerified,
      tooltipTitle: 'Fleet Operating Profile',
      tooltip: isVerified 
        ? 'Verified fleet enterprise profile. Your company credentials and vehicle ownership proofs are authenticated on the national registry.'
        : 'Provisional fleet profile. Upload proof of vehicle fleet management or CIPC registration to unlock driver risk dossiers.'
    },
    {
      label: 'Compliance Status',
      value: isVerified ? 'Audited & Verified' : 'Documents Pending',
      subtext: isVerified ? 'Full Access Granted' : 'Submit Proof of Company',
      icon: <ShieldCheck className="h-5 w-5" />,
      iconBgColor: 'bg-emerald-50',
      iconTextColor: 'text-emerald-600',
      trend: 'POPIA Safe',
      trendUp: true,
      tooltipTitle: 'POPIA & Regulatory Compliance',
      tooltip: isVerified
        ? 'Full compliance clearance: You are certified to view unmasked driver contact details, review complaint histories, and file official incidents.'
        : 'Pending document verification: Search records remain masked and report filing is locked to prevent unauthorized data exposure.'
    },
    {
      label: 'Pending Requests',
      value: pendingRequestsCount,
      subtext: pendingRequestsCount > 0 ? 'Review driver applications' : 'All requests processed',
      icon: <UserCheck className="h-5 w-5" />,
      iconBgColor: 'bg-stone-100',
      iconTextColor: 'text-stone-800',
      trend: pendingRequestsCount > 0 ? 'New' : 'Up to date',
      trendUp: pendingRequestsCount === 0,
      tooltipTitle: 'Driver Affiliation Requests',
      tooltip: 'Inbound requests from drivers who listed your company as their current or prospective Fleet Owner. Approving confirms their active vehicle assignment.'
    },
    {
      label: 'Risk Intelligence',
      value: 'Live Shield',
      subtext: 'Centralized registry active',
      icon: <AlertTriangle className="h-5 w-5" />,
      iconBgColor: 'bg-rose-50',
      iconTextColor: 'text-rose-600',
      trend: '24/7 Monitored',
      trendUp: true,
      tooltipTitle: 'National Risk Registry',
      tooltip: 'Continuous cross-platform intelligence aggregating incident reports, dispute resolutions, and safety alerts across Uber, Bolt, and inDrive fleets.'
    }
  ];

  const contactsList = [
    {
      id: '1',
      title: 'Fleet Support Specialist',
      subtitle: 'support@fleetcheck.co.za',
      tag: 'Helpdesk',
      avatarInitials: 'FS',
      actionLabel: 'Contact',
      onAction: () => alert('Contacting Fleet Support Specialist: support@fleetcheck.co.za')
    },
    {
      id: '2',
      title: 'Account Security & Key',
      subtitle: 'Manage credentials',
      avatarInitials: 'PW',
      actionLabel: 'Settings',
      onAction: () => setShowPasswordModal(true)
    }
  ];

  return (
    <DashboardLayout
      user={user}
      roleTitle="Fleet Operator Portal"
      roleBadgeText={isVerified ? 'Verified Operator' : 'Verification Pending'}
      roleBadgeColor={isVerified ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}
      onLogout={onLogout}
      navItems={navItems}
      activeNavId={dbTab}
      onSelectNav={(id: any) => {
        if ((id === 'submit_complaint' || id === 'my_complaints') && !isVerified) {
          alert('You must be verified by the admin team to submit or view incident reports.');
          return;
        }
        setDbTab(id);
      }}
      searchPlaceholder="Search drivers by name, phone, SA ID, license, or plate..."
      onSearch={(q) => {
        if (q.trim() && dbTab !== 'search') {
          setDbTab('search');
        }
      }}
      heroTag="VETTING & RISK MANAGEMENT"
      heroTitle="Centralized Driver Vetting & Fleet Intelligence"
      heroSubtitle="Search our cross-platform national registry before hiring, verify driver references, and record incident reports securely under POPIA standards."
      heroActionLabel="Report Incident"
      heroActionIcon={<PlusCircle className="h-4 w-4 text-white" />}
      onHeroAction={() => {
        if (!isVerified) {
          alert('You must be verified by the admin team to submit incident reports.');
          return;
        }
        setDbTab('submit_complaint');
      }}
      heroSecondaryActionLabel="Search Drivers"
      onHeroSecondaryAction={() => setDbTab('search')}
      statChips={statChips}
      scorePercentage={isVerified ? 100 : 65}
      scoreLabel="Operator Status"
      statusHeadline={`${user.name}`}
      statusSubtext={isVerified ? 'Your fleet operator account has full verified vetting clearance.' : 'Upload proof of business registration to unlock complete vetting.'}
      contactsTitle="Operations & Support"
      contacts={contactsList}
    >
      {/* Verification Warning / Approved Banner */}
      {!isVerified ? (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-amber-900 text-sm">Account Verification Incomplete</h4>
                <StatusBadgeWithTooltip
                  status={profile?.verification_status || 'pending'}
                  badgeClass="px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-bold uppercase rounded-lg border border-amber-300"
                  customExplanation="Your account is in provisional verification mode. Submit business registration or fleet ownership papers to unlock unmasked driver profiles."
                />
              </div>
              <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                Full search results and driver reporting are locked until our compliance team validates your identity and fleet documents.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDbTab('verification_docs')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer whitespace-nowrap"
          >
            Upload Verification Files
          </button>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-emerald-900 text-xs sm:text-sm">Verified Operator Status Active</h4>
                <Tooltip
                  title="Audited Fleet Accreditation"
                  content="Your business registration, ID, and vehicle fleet credentials have been validated by compliance admins. You have full clearance to query unmasked driver profiles and submit verified incident filings."
                  position="top"
                >
                  <span className="cursor-help inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span>Full Access</span>
                    <HelpCircle className="h-2.5 w-2.5" />
                  </span>
                </Tooltip>
              </div>
              <p className="text-emerald-800 text-[11px] sm:text-xs mt-0.5">
                You have authorized access to view full driver dossiers, search by national ID, and file incident reports.
              </p>
            </div>
          </div>
          <Tooltip
            title="Active Compliance Clearance"
            content="Active clearance grants unrestricted query quotas and authorized data access under POPIA compliance standards."
            position="left"
          >
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-help border border-emerald-200">
              <span>Active Clearance</span>
              <HelpCircle className="h-3 w-3 opacity-60" />
            </span>
          </Tooltip>
        </div>
      )}

      {/* Tab Contents */}
      {dbTab === 'search' && (
        <DriverSearchModule
          isVerified={isVerified}
          token={token}
          getRiskColorBadge={getRiskColorBadge}
        />
      )}

      {dbTab === 'my_drivers' && (
        <MyFleetDriversModule
          token={token}
        />
      )}

      {dbTab === 'submit_complaint' && (
        <IncidentReportForm
          token={token}
          onSuccess={() => setDbTab('my_complaints')}
          onCancel={() => setDbTab('search')}
        />
      )}

      {dbTab === 'my_complaints' && (
        <MyComplaintsLog
          token={token}
          getStatusBadge={getStatusBadge}
        />
      )}

      {dbTab === 'verification_docs' && (
        <VerificationFilesModule
          token={token}
          onPreviewDoc={(doc) => setPreviewModalDoc(doc)}
        />
      )}

      {dbTab === 'driver_requests' && (
        <DriverRequestsModule
          token={token}
        />
      )}

      {/* Document Preview Modal */}
      {previewModalDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm capitalize">{previewModalDoc.document_type.replace('_', ' ')}</h3>
                <p className="text-slate-400 text-xs">File Reference: {previewModalDoc.file_name}</p>
              </div>
              <button
                onClick={() => setPreviewModalDoc(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-2 flex justify-center bg-slate-50 rounded-xl p-4 border border-slate-200">
              {previewModalDoc.file_data && previewModalDoc.file_data.startsWith('data:image') ? (
                <img
                  src={previewModalDoc.file_data}
                  alt={previewModalDoc.file_name}
                  className="max-h-[60vh] object-contain rounded-lg border border-slate-200 shadow-sm"
                />
              ) : previewModalDoc.file_data && previewModalDoc.file_data.startsWith('data:application/pdf') ? (
                <div className="text-center py-8 space-y-3">
                  <FileText className="h-12 w-12 text-stone-700 mx-auto" />
                  <p className="text-xs font-bold text-stone-700">PDF Compliance Document</p>
                  <a
                    href={previewModalDoc.file_data}
                    download={previewModalDoc.file_name}
                    className="inline-block px-4 py-2 bg-[#1f1f1f] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-stone-800"
                  >
                    Download PDF File
                  </a>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <FileImage className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">Document Filing Record ({previewModalDoc.file_name})</p>
                  <p className="text-[10px] text-slate-400">Path: {previewModalDoc.file_path}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewModalDoc(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-stone-200">
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5 text-stone-800" />
                <h3 className="font-black text-stone-900 text-sm">Change Account Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 min-h-[44px]"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 min-h-[44px]"
                  placeholder="At least 8 chars, 1 uppercase, 1 symbol, 1 digit"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 min-h-[44px]"
                  placeholder="Repeat new password"
                />
              </div>

              {pwdError && (
                <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold">
                  {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                  {pwdSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 min-h-[40px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl shadow-xs min-h-[40px] cursor-pointer"
                >
                  {pwdLoading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
