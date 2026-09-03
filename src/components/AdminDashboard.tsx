import React from 'react';
import { ShieldAlert, Users, FileCheck, HelpCircle, FileText, Search, ListFilter, ShieldCheck, CheckCircle, CheckCircle2, XCircle, AlertTriangle, ArrowRight, RefreshCw, RotateCcw, Layers, MapPin, Eye, Lock, Mail, CheckSquare, Download, Clock, Filter, X, Settings, Flame, Building2, MessageSquare, Car } from 'lucide-react';
import { User, AuditLog, SearchLog } from '../types';
import FleetIncidentTrends from './admin/FleetIncidentTrends';
import AuditTrailModule from './admin/AuditTrailModule';
import BulkConfirmModal from './admin/BulkConfirmModal';
import AdminAccountSettingsModal from './admin/AdminAccountSettingsModal';
import AccountDataModal from './account/AccountDataModal';
import GeographicalHeatMap from './admin/GeographicalHeatMap';
import RealtimeNotificationFeed from './admin/RealtimeNotificationFeed';
import FleetOwnersManagement from './admin/FleetOwnersManagement';
import DriversManagement from './admin/DriversManagement';
import AdministratorsManagement from './admin/AdministratorsManagement';
import VehicleListingsManagement from './admin/VehicleListingsManagement';
import DashboardLayout, { NavItem, StatChip } from './layout/DashboardLayout';

interface AdminDashboardProps {
  user: User;
  token: string;
  onLogout?: () => void;
  onOpenChat?: (complaintId: string) => void;
  onOpenChatThreads?: () => void;
}

export default function AdminDashboard({ user, token, onLogout, onOpenChat, onOpenChatThreads }: AdminDashboardProps) {
  const [currentUser, setCurrentUser] = React.useState<User>(user);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [showAccountDataModal, setShowAccountDataModal] = React.useState(false);
  const [adminTab, setAdminTab] = React.useState<'verifications' | 'complaints' | 'drivers' | 'disputes' | 'users' | 'audit_logs' | 'emails' | 'heatmap' | 'fleet_owners' | 'drivers_mgmt' | 'admins_mgmt' | 'vehicle_listings'>('verifications');

  // Queues data
  const [verificationsQueue, setVerificationsQueue] = React.useState<any[]>([]);
  const [complaintsQueue, setComplaintsQueue] = React.useState<any[]>([]);
  const [driversList, setDriversList] = React.useState<any[]>([]);
  const [disputesList, setDisputesList] = React.useState<any[]>([]);
  const [usersList, setUsersList] = React.useState<any[]>([]);
  const [auditLogsList, setAuditLogsList] = React.useState<AuditLog[]>([]);
  const [searchLogsList, setSearchLogsList] = React.useState<SearchLog[]>([]);
  const [emailsList, setEmailsList] = React.useState<any[]>([]);

  // Bulk selection states
  const [selectedVerifications, setSelectedVerifications] = React.useState<string[]>([]);
  const [selectedComplaints, setSelectedComplaints] = React.useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = React.useState(false);

  // Bulk confirmation modal state
  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean;
    type: 'verifications' | 'complaints';
    action: 'approve' | 'reject' | 'verify';
    itemCount: number;
  }>({
    isOpen: false,
    type: 'verifications',
    action: 'verify',
    itemCount: 0
  });

  // Incident complaint search & filter states
  const [adminSearchQuery, setAdminSearchQuery] = React.useState('');
  const [complaintSearch, setComplaintSearch] = React.useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected' | 'resolved'>('all');
  const [complaintCategoryFilter, setComplaintCategoryFilter] = React.useState<string>('all');
  const [complaintSeverityFilter, setComplaintSeverityFilter] = React.useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const [loading, setLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [pendingVehicleListingsCount, setPendingVehicleListingsCount] = React.useState(0);

  // Merge state
  const [primaryMergeId, setPrimaryMergeId] = React.useState('');
  const [duplicateMergeId, setDuplicateMergeId] = React.useState('');

  // Initial pre-fetch of all moderation queues for accurate badge counters across tabs
  React.useEffect(() => {
    const fetchSummaryCounts = async () => {
      try {
        const [verifRes, compRes, dispRes, vehRes] = await Promise.all([
          fetch('/api/admin/verification-requests', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/admin/complaints', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/admin/disputes', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/admin/vehicle-listings?status=pending', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (verifRes.ok) {
          const vd = await verifRes.json();
          setVerificationsQueue(vd.requests || []);
        }
        if (compRes.ok) {
          const cd = await compRes.json();
          setComplaintsQueue(cd.complaints || []);
        }
        if (dispRes.ok) {
          const dd = await dispRes.json();
          setDisputesList(dd.disputes || []);
        }
        if (vehRes.ok) {
          const vhd = await vehRes.json();
          setPendingVehicleListingsCount((vhd.listings || []).length);
        }
      } catch (err) {
        console.error('Failed to preload summary counts:', err);
      }
    };
    fetchSummaryCounts();
  }, [token]);

  React.useEffect(() => {
    setSelectedVerifications([]);
    setSelectedComplaints([]);
    loadTabContent();
  }, [adminTab]);

  const handleSelectTabFromNotification = (tab: string, itemId?: string, title?: string) => {
    let targetTab = tab;
    if (tab === 'incidents' || tab === 'complaint' || tab === 'complaints') targetTab = 'complaints';
    else if (tab === 'pending_verifications' || tab === 'verification' || tab === 'verifications') targetTab = 'verifications';
    else if (tab === 'dispute' || tab === 'disputes') targetTab = 'disputes';
    else if (tab === 'driver' || tab === 'drivers') targetTab = 'drivers_mgmt';

    setAdminTab(targetTab as any);

    if (targetTab === 'complaints') {
      setComplaintStatusFilter('all');
      setComplaintCategoryFilter('all');
      setComplaintSeverityFilter('all');
      if (itemId) {
        setComplaintSearch(itemId);
      } else {
        setComplaintSearch('');
      }
    }
  };

  const loadTabContent = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      if (adminTab === 'verifications') {
        const res = await fetch('/api/admin/verification-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setVerificationsQueue(data.requests || []);
      } else if (adminTab === 'complaints') {
        const res = await fetch('/api/admin/complaints', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setComplaintsQueue(data.complaints || []);
      } else if (adminTab === 'drivers') {
        // Fetch all drivers to enable duplicate matching
        const res = await fetch('/api/drivers/search?query=', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setDriversList(data.results || []);
      } else if (adminTab === 'disputes') {
        const res = await fetch('/api/admin/disputes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setDisputesList(data.disputes || []);
      } else if (adminTab === 'users') {
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setUsersList(data.users || []);
      } else if (adminTab === 'audit_logs') {
        const resAud = await fetch('/api/admin/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataAud = await resAud.json();
        setAuditLogsList(dataAud.logs || []);

        const resSch = await fetch('/api/admin/search-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataSch = await resSch.json();
        setSearchLogsList(dataSch.logs || []);
      } else if (adminTab === 'emails') {
        const res = await fetch('/api/admin/driver-emails', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setEmailsList(data.emails || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch admin queue.');
    } finally {
      setLoading(false);
    }
  };

  // Open Bulk Action Confirmation Modal
  const requestBatchVerify = (action: 'verify' | 'reject') => {
    if (selectedVerifications.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'verifications',
      action,
      itemCount: selectedVerifications.length
    });
  };

  const requestBatchModerateComplaints = (action: 'approve' | 'reject') => {
    if (selectedComplaints.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'complaints',
      action,
      itemCount: selectedComplaints.length
    });
  };

  const handleConfirmModalAction = async (reason: string) => {
    if (confirmModal.type === 'verifications') {
      await executeBatchVerify(confirmModal.action as 'verify' | 'reject', reason);
    } else if (confirmModal.type === 'complaints') {
      await executeBatchModerateComplaints(confirmModal.action as 'approve' | 'reject', reason);
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const executeBatchVerify = async (action: 'verify' | 'reject', reason = '') => {
    if (selectedVerifications.length === 0) return;
    setBatchProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/batch-verify-fleet-owners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_ids: selectedVerifications,
          action,
          rejected_reason: reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process batch verification');
      setSuccessMsg(data.message);
      setSelectedVerifications([]);
      loadTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBatchProcessing(false);
    }
  };

  const executeBatchModerateComplaints = async (action: 'approve' | 'reject', reason = '') => {
    if (selectedComplaints.length === 0) return;
    setBatchProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/batch-moderate-complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          complaint_ids: selectedComplaints,
          action,
          rejected_reason: reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process batch complaints moderation');
      setSuccessMsg(data.message);
      setSelectedComplaints([]);
      loadTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBatchProcessing(false);
    }
  };

  // Filtered Incident Complaints
  const filteredComplaints = complaintsQueue.filter((item: any) => {
    const c = item.complaint || {};
    const driver = item.driver || {};
    const reporter = item.reporter || {};

    // Search query match (Driver name, phone, vehicle, reporter company, email, description, ID)
    if (complaintSearch.trim()) {
      const q = complaintSearch.toLowerCase().trim();
      const cleanQ = q.replace(/[^a-z0-9]/g, '');
      const driverFirstName = (driver.first_name || '').toLowerCase();
      const driverSurname = (driver.surname || '').toLowerCase();
      const driverFullName = `${driverFirstName} ${driverSurname}`.trim();
      const driverPhone = (driver.phone_number || driver.phone_masked || '').toLowerCase();
      const vehicle = (c.vehicle_make_model || '').toLowerCase();
      const vehicleReg = (c.vehicle_registration || '').toLowerCase();
      const reporterCompany = (reporter.profile?.company_name || '').toLowerCase();
      const reporterEmail = (reporter.user?.email || '').toLowerCase();
      const category = (c.category || '').toLowerCase();
      const description = (c.description || '').toLowerCase();
      const complaintId = (c.id || '').toLowerCase();
      const driverId = (driver.id || c.driver_id || '').toLowerCase();

      const matchesSearch =
        driverFullName.includes(q) ||
        (cleanQ && driverPhone.replace(/[^a-z0-9]/g, '').includes(cleanQ)) ||
        vehicle.includes(q) ||
        (cleanQ && vehicleReg.replace(/[^a-z0-9]/g, '').includes(cleanQ)) ||
        reporterCompany.includes(q) ||
        reporterEmail.includes(q) ||
        category.includes(q) ||
        description.includes(q) ||
        complaintId.includes(q) ||
        driverId.includes(q);

      if (!matchesSearch) return false;
    }

    // Status filter
    if (complaintStatusFilter !== 'all') {
      const status = (c.status || '').toLowerCase();
      if (complaintStatusFilter === 'pending') {
        if (!['pending', 'pending_review', 'submitted', 'disputed'].includes(status)) return false;
      } else if (complaintStatusFilter === 'approved') {
        if (!['approved', 'verified', 'published'].includes(status)) return false;
      } else if (complaintStatusFilter === 'rejected') {
        if (status !== 'rejected') return false;
      } else if (complaintStatusFilter === 'resolved') {
        if (status !== 'resolved' && c.resolution_status !== 'fully_resolved') return false;
      }
    }

    // Category filter
    if (complaintCategoryFilter !== 'all') {
      const cat = (c.category || '').toLowerCase();
      const filterCat = complaintCategoryFilter.toLowerCase();
      const normCat = cat.replace(/[^a-z0-9]/g, '');
      const normFilter = filterCat.replace(/[^a-z0-9]/g, '');
      if (!normCat.includes(normFilter) && !normFilter.includes(normCat)) return false;
    }

    // Severity filter
    if (complaintSeverityFilter !== 'all') {
      if ((c.severity || '').toLowerCase() !== complaintSeverityFilter.toLowerCase()) return false;
    }

    return true;
  });

  // Export Incident Complaints to CSV
  const handleExportIncidentsCSV = () => {
    if (filteredComplaints.length === 0) return;

    const headers = [
      'Complaint ID',
      'Incident Date',
      'Status',
      'Severity',
      'Category',
      'Evidence Strength',
      'Driver First Name',
      'Driver Surname',
      'Driver Phone',
      'Vehicle Make/Model',
      'Reported By Company',
      'Reporter Email',
      'Description',
      'Created At'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = filteredComplaints.map((item: any) => {
      const c = item.complaint || {};
      const driver = item.driver || {};
      const reporter = item.reporter || {};
      return [
        escapeCSV(c.id),
        escapeCSV(c.incident_date),
        escapeCSV(c.status),
        escapeCSV(c.severity),
        escapeCSV(c.category),
        escapeCSV(c.evidence_strength || 'none'),
        escapeCSV(driver.first_name || ''),
        escapeCSV(driver.surname || ''),
        escapeCSV(driver.phone_number || ''),
        escapeCSV(c.vehicle_make_model || ''),
        escapeCSV(reporter.profile?.company_name || ''),
        escapeCSV(reporter.user?.email || ''),
        escapeCSV(c.description || ''),
        escapeCSV(c.created_at || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.setAttribute('download', `fleetcheck_incident_reports_${dateStr}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper for rendering color-coded incident status badge
  const renderIncidentStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending' || s === 'pending_review' || s === 'submitted') {
      return (
        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase rounded-lg flex items-center space-x-1 shrink-0 shadow-2xs">
          <Clock className="h-3 w-3 text-amber-600" />
          <span>Pending Review</span>
        </span>
      );
    }
    if (s === 'approved' || s === 'verified' || s === 'published') {
      return (
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase rounded-lg flex items-center space-x-1 shrink-0 shadow-2xs">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Verified & Published</span>
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 text-[10px] font-black uppercase rounded-lg flex items-center space-x-1 shrink-0 shadow-2xs">
          <XCircle className="h-3 w-3 text-red-600" />
          <span>Rejected</span>
        </span>
      );
    }
    if (s === 'resolved') {
      return (
        <span className="px-2.5 py-1 bg-stone-100 text-stone-800 border border-stone-200 text-[10px] font-black uppercase rounded-lg flex items-center space-x-1 shrink-0 shadow-2xs">
          <CheckCircle className="h-3 w-3 text-stone-800" />
          <span>Resolved</span>
        </span>
      );
    }
    if (s === 'disputed') {
      return (
        <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black uppercase rounded-lg flex items-center space-x-1 shrink-0 shadow-2xs">
          <AlertTriangle className="h-3 w-3 text-rose-600" />
          <span>Disputed by Driver</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black uppercase rounded-lg flex items-center space-x-1 shrink-0 shadow-2xs">
        <FileText className="h-3 w-3 text-slate-500" />
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const handleModerateVerification = async (profileId: string, action: 'verify' | 'reject' | 'info', reason = '') => {
    try {
      const res = await fetch('/api/admin/verify-fleet-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_id: profileId,
          action,
          rejected_reason: reason,
          admin_notes: `Processed ${action} action on verification request.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(data.message);
      loadTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleModerateComplaint = async (
    complaintId: string,
    action: 'approve' | 'reject' | 'resolved' | 'archive' | 'reopen',
    severity?: string,
    category?: string,
    evidenceStrength?: string,
    notes?: string,
    reason?: string
  ) => {
    try {
      const res = await fetch('/api/admin/moderate-complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          complaint_id: complaintId,
          action,
          severity,
          category,
          evidence_strength: evidenceStrength,
          admin_notes: notes,
          rejected_reason: reason,
          resolution_status: action === 'resolved' ? 'fully_resolved' : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(data.message);
      loadTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleModerateDispute = async (disputeId: string, action: 'accept' | 'reject' | 'close') => {
    try {
      const res = await fetch('/api/admin/moderate-dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dispute_id: disputeId,
          action,
          admin_notes: `Moderated dispute action: ${action}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(data.message);
      loadTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(data.message);
      loadTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleMergeDrivers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryMergeId || !duplicateMergeId) {
      setErrorMsg('Both driver profiles are required to merge.');
      return;
    }
    try {
      const res = await fetch('/api/admin/drivers/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          primary_id: primaryMergeId,
          duplicate_id: duplicateMergeId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(data.message);
      setPrimaryMergeId('');
      setDuplicateMergeId('');
      loadTabContent();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const pendingVerifs = verificationsQueue.filter(v => (v.profile?.verification_status || v.verification_status) === 'pending').length;
  const pendingComplaints = complaintsQueue.filter(c => ['pending', 'pending_review', 'submitted', 'disputed'].includes((c.complaint?.status || c.status || '').toLowerCase())).length;
  const approvedComplaintsCount = complaintsQueue.filter(c => ['approved', 'verified', 'published'].includes((c.complaint?.status || c.status || '').toLowerCase())).length;
  const rejectedComplaintsCount = complaintsQueue.filter(c => (c.complaint?.status || c.status || '').toLowerCase() === 'rejected').length;
  const resolvedComplaintsCount = complaintsQueue.filter(c => (c.complaint?.status || c.status || '').toLowerCase() === 'resolved' || c.complaint?.resolution_status === 'fully_resolved').length;
  const pendingDisputes = disputesList.filter(d => ['pending', 'submitted', 'under_review'].includes((d.status || '').toLowerCase())).length;

  const navItems: NavItem[] = [
    {
      id: 'fleet_owners',
      label: 'Fleet Operators',
      icon: <Building2 className="h-4 w-4 text-emerald-500" />,
      category: 'DIRECTORIES',
      tooltipTitle: 'Fleet Operators Directory',
      tooltip: 'Manage registered fleet owners, company profiles, and verification clearances.'
    },
    {
      id: 'drivers_mgmt',
      label: 'Driver Search Gateway',
      icon: <Users className="h-4 w-4 text-stone-700" />,
      category: 'DIRECTORIES',
      tooltipTitle: 'Driver Search Gateway & Directory',
      tooltip: 'Unrestricted search gateway and management across the full commercial driver database.'
    },
    {
      id: 'admins_mgmt',
      label: 'Administrators',
      icon: <ShieldCheck className="h-4 w-4 text-purple-500" />,
      category: 'DIRECTORIES',
      tooltipTitle: 'Administrator Team Management',
      tooltip: 'Manage administrator accounts, assign super admin privileges, and audit admin access.'
    },
    {
      id: 'verifications',
      label: 'Operator Applications',
      icon: <FileCheck className="h-4 w-4" />,
      category: 'MODERATION',
      badge: pendingVerifs > 0 ? pendingVerifs : (verificationsQueue.length > 0 ? verificationsQueue.length : undefined),
      badgeColor: 'bg-[#1f1f1f] text-white',
      tooltipTitle: 'Operator Verification Queue',
      tooltip: 'Review fleet screenshots, CIPC business registration, and operator compliance documentation.'
    },
    {
      id: 'complaints',
      label: 'Incident Queue',
      icon: <ShieldAlert className="h-4 w-4" />,
      category: 'MODERATION',
      badge: pendingComplaints > 0 ? pendingComplaints : (complaintsQueue.length > 0 ? complaintsQueue.length : undefined),
      badgeColor: 'bg-rose-500 text-white',
      tooltipTitle: 'Incident Moderation Queue',
      tooltip: 'Moderate incident reports, driver misconduct logs, and evidence submitted by verified fleet owners.'
    },
    {
      id: 'heatmap',
      label: 'Geographical Heat Map',
      icon: <Flame className="h-4 w-4 text-amber-500" />,
      category: 'INTELLIGENCE',
      tooltipTitle: 'Geographical Risk Heat Map',
      tooltip: 'Interactive nationwide map visualizing incident hotspots, city-level dispute densities, and safety alerts.'
    },
    {
      id: 'disputes',
      label: 'Disputes Queue',
      icon: <HelpCircle className="h-4 w-4" />,
      category: 'MODERATION',
      badge: pendingDisputes > 0 ? pendingDisputes : undefined,
      badgeColor: 'bg-amber-500 text-white',
      tooltipTitle: 'Driver Disputes & Rebuttals',
      tooltip: 'Review formal driver dispute filings, statement rebuttals, and counter-evidence under statutory Right of Reply.'
    },
    {
      id: 'vehicle_listings',
      label: 'Vehicle Listings',
      icon: <Car className="h-4 w-4" />,
      category: 'MODERATION',
      badge: pendingVehicleListingsCount > 0 ? pendingVehicleListingsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      tooltipTitle: 'Vehicle Marketplace Listings',
      tooltip: 'Review and approve vehicle listings submitted by fleet owners before they appear in the public Vehicle Marketplace.'
    },
    {
      id: 'drivers',
      label: 'Profile Merging Tool',
      icon: <Layers className="h-4 w-4" />,
      category: 'GOVERNANCE',
      tooltipTitle: 'Driver Profile Merging',
      tooltip: 'Consolidate duplicate driver profiles, unify incident histories, and recalculate risk scores.'
    },
    {
      id: 'users',
      label: 'User Suspensions',
      icon: <Lock className="h-4 w-4" />,
      category: 'GOVERNANCE',
      tooltipTitle: 'User Access & Suspensions',
      tooltip: 'Manage account statuses, lock suspicious accounts, and enforce platform governance.'
    },
    {
      id: 'audit_logs',
      label: 'Audit & Searches',
      icon: <FileText className="h-4 w-4" />,
      category: 'GOVERNANCE',
      tooltipTitle: 'Audit Logs & Search Trail',
      tooltip: 'Immutable POPIA-compliant audit trail recording all administrative actions, driver search logs, security events, and user access.'
    },
    {
      id: 'emails',
      label: 'Driver Outbox Logs',
      icon: <Mail className="h-4 w-4" />,
      category: 'GOVERNANCE',
      tooltipTitle: 'Driver Notification Outbox',
      tooltip: 'Dispatched email notices informing drivers of filed incident reports.'
    }
  ];

  const statChips: StatChip[] = [
    {
      label: 'Operator Dossiers',
      value: `${verificationsQueue.length} Total`,
      subtext: `${pendingVerifs} Pending Verification`,
      icon: <FileCheck className="h-5 w-5" />,
      iconBgColor: 'bg-stone-100',
      iconTextColor: 'text-stone-800',
      trend: `${pendingVerifs} Actionable`,
      trendUp: pendingVerifs === 0,
      tooltipTitle: 'Operator Dossiers & Compliance Papers',
      tooltip: 'Fleet owners awaiting business verification, identity checks, and fleet documentation approval.'
    },
    {
      label: 'Incident Queue',
      value: `${complaintsQueue.length} Reports`,
      subtext: `${pendingComplaints} Pending Moderation`,
      icon: <ShieldAlert className="h-5 w-5" />,
      iconBgColor: 'bg-rose-50',
      iconTextColor: 'text-rose-600',
      trend: `${pendingComplaints} Reviewing`,
      trendUp: pendingComplaints === 0,
      tooltipTitle: 'Incident Moderation Queue',
      tooltip: 'Active driver incident reports and misconduct submissions awaiting administrative moderation.'
    },
    {
      label: 'Driver Disputes',
      value: `${disputesList.length} Rebuttals`,
      subtext: `${pendingDisputes} Pending Resolution`,
      icon: <HelpCircle className="h-5 w-5" />,
      iconBgColor: 'bg-amber-50',
      iconTextColor: 'text-amber-600',
      trend: 'Right of Reply',
      trendUp: true,
      tooltipTitle: 'Driver Disputes & Rebuttals Queue',
      tooltip: 'Formal disputes filed by drivers exercising statutory Right of Reply to contest incident reports.'
    },
    {
      label: 'Platform Audit Status',
      value: '100% Compliant',
      subtext: 'POPIA Immutable Logs',
      icon: <ShieldCheck className="h-5 w-5" />,
      iconBgColor: 'bg-emerald-50',
      iconTextColor: 'text-emerald-600',
      trend: 'Secured',
      trendUp: true,
      tooltipTitle: 'POPIA Audit Logs & Search Trail',
      tooltip: 'Immutable audit trail recording all administrator decisions, driver search queries, profile modifications, and user access records.'
    }
  ];

  const contactsList = [
    {
      id: 'settings',
      title: 'Administrator Settings',
      subtitle: currentUser.email,
      tag: 'Root',
      avatarInitials: 'AD',
      actionLabel: 'Configure',
      onAction: () => setIsSettingsOpen(true)
    },
    {
      id: 'export',
      title: 'Export Incident Reports',
      subtitle: 'Download full CSV archive',
      tag: 'Report',
      avatarInitials: 'CSV',
      actionLabel: 'Export',
      onAction: handleExportIncidentsCSV
    }
  ];

  return (
    <DashboardLayout
      user={currentUser}
      roleTitle="Super Administrator"
      roleBadgeText="Root Admin Access"
      roleBadgeColor="bg-rose-500/10 text-rose-600 border-rose-500/30"
      onLogout={onLogout}
      navItems={navItems}
      activeNavId={adminTab}
      onSelectNav={(id: any) => setAdminTab(id)}
      searchPlaceholder="Unrestricted admin search: drivers, SA IDs, operators, incidents, audit logs..."
      onSearch={(q) => {
        setAdminSearchQuery(q);
        setComplaintSearch(q);
        if (q.trim() && adminTab !== 'drivers_mgmt') {
          setAdminTab('drivers_mgmt');
        }
      }}
      heroTag="SYSTEM CONTROL & GOVERNANCE"
      heroTitle="Central Incident Verification & Integrity Registry"
      heroSubtitle="Review operator verification dossiers, audit commercial driver incident disputes, monitor nationwide risk hot-spots, and maintain audit logs under South African POPIA regulations."
      heroActionLabel="Export Incident CSV"
      heroActionIcon={<FileText className="h-4 w-4 text-white" />}
      onHeroAction={handleExportIncidentsCSV}
      heroSecondaryActionLabel="Driver Search Gateway"
      onHeroSecondaryAction={() => setAdminTab('drivers_mgmt')}
      statChips={statChips}
      showRightPanel={adminTab === 'verifications' || adminTab === 'users'}
      scorePercentage={99}
      scoreLabel="System Health"
      statusHeadline={currentUser.name || 'Root Administrator'}
      statusSubtext="Role-based moderation, compliance verifications, and audit inspections."
      contactsTitle="Quick Operations"
      contacts={contactsList}
    >
      {/* Top Controls: Real-time notification & Account settings */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4 text-stone-900" />
          <span className="text-xs font-bold text-stone-800">Administrative Actions & Live Event Stream</span>
        </div>

        <div className="flex items-center space-x-2.5">
          {onOpenChatThreads && (
            <button
              onClick={onOpenChatThreads}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
              title="View Incident Clarification Channels with Fleet Owners"
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
              <span>Clarification Chats</span>
            </button>
          )}

          <RealtimeNotificationFeed
            token={token}
            onSelectTab={handleSelectTabFromNotification}
          />

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            title="Administrator Account Settings"
          >
            <Settings className="h-3.5 w-3.5 text-stone-300" />
            <span>Account Settings</span>
          </button>

          <button
            onClick={() => setShowAccountDataModal(true)}
            className="px-3.5 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            title="Export or delete my account data"
          >
            <span>My Data</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <XCircle className="h-4.5 w-4.5 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin h-6 w-6 text-stone-700 mx-auto" />
          <p className="text-xs text-slate-500 mt-2 font-medium">Fetching administrative schemas...</p>
        </div>
      )}

      {/* Management Modules */}
      {!loading && adminTab === 'fleet_owners' && (
        <FleetOwnersManagement token={token} />
      )}

      {!loading && adminTab === 'drivers_mgmt' && (
        <DriversManagement token={token} initialSearchQuery={adminSearchQuery} />
      )}

      {!loading && adminTab === 'admins_mgmt' && (
        <AdministratorsManagement token={token} currentUserId={currentUser.id} />
      )}

      {!loading && adminTab === 'vehicle_listings' && (
        <VehicleListingsManagement token={token} />
      )}

      {/* Queue 1: Fleet Owner Verification requests */}
      {!loading && adminTab === 'verifications' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Fleet Owner Verification Requests Queue</h3>
              <p className="text-slate-400 text-xs">Review fleet screenshots, company size, and uploaded compliance papers before validating accounts.</p>
            </div>

            {verificationsQueue.length > 0 && (
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-slate-200 transition-all select-none self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={selectedVerifications.length === verificationsQueue.length && verificationsQueue.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedVerifications(verificationsQueue.map(q => q.profile.id));
                    } else {
                      setSelectedVerifications([]);
                    }
                  }}
                  className="rounded text-stone-800 focus:ring-stone-400 h-4 w-4"
                />
                <span>Select All Pending ({verificationsQueue.length})</span>
              </label>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedVerifications.length > 0 && (
            <div className="p-3.5 bg-stone-900 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-stone-800">
              <span className="text-xs font-bold flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-stone-300" />
                <span>{selectedVerifications.length} operator application(s) selected</span>
              </span>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => requestBatchVerify('reject')}
                  disabled={batchProcessing}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  {batchProcessing ? 'Processing...' : `Reject Selected (${selectedVerifications.length})`}
                </button>
                <button
                  onClick={() => requestBatchVerify('verify')}
                  disabled={batchProcessing}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {batchProcessing ? 'Processing...' : `Approve Selected (${selectedVerifications.length})`}
                </button>
                <button
                  onClick={() => setSelectedVerifications([])}
                  className="px-2.5 py-1.5 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {verificationsQueue.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
              No pending fleet owner verification applications. All operating accounts are cleared.
            </div>
          ) : (
            <div className="space-y-4">
              {verificationsQueue.map((req: any) => {
                const isSelected = selectedVerifications.includes(req.profile.id);
                return (
                  <div
                    key={req.profile.id}
                    className={`bg-white border rounded-2xl p-5 space-y-4 shadow-xs transition-all ${
                      isSelected ? 'border-stone-800 ring-2 ring-stone-400/20 bg-stone-50/50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVerifications(prev => [...prev, req.profile.id]);
                            } else {
                              setSelectedVerifications(prev => prev.filter(id => id !== req.profile.id));
                            }
                          }}
                          className="mt-1 rounded text-stone-800 focus:ring-stone-400 h-4 w-4 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <h4 className="font-black text-slate-900 text-base">{req.profile.company_name}</h4>
                          <div className="text-xs text-slate-500 space-y-0.5 font-medium">
                            <p>👤 <strong>Rep Name:</strong> {req.user?.name} ({req.user?.email}) • 📞 {req.user?.phone}</p>
                            <p>📍 <strong>HQ Address:</strong> {req.profile.business_address}</p>
                            <p>🚗 <strong>Fleet Size:</strong> {req.profile.fleet_size} active vehicle(s) • Platforms: {req.profile.platforms_used.join(', ')}</p>
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase rounded-lg shrink-0">
                        {req.profile.verification_status}
                      </span>
                    </div>

                    {/* Documents list */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uploaded Compliance Materials</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {req.documents.map((doc: any) => (
                          <div key={doc.id} className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-[11px] flex justify-between items-center hover:border-slate-300 transition-all">
                            <div className="truncate pr-2">
                              <p className="font-bold text-slate-800 capitalize truncate">{doc.document_type.replace('_', ' ')}</p>
                              <p className="text-[9px] text-slate-400 truncate">{doc.file_name}</p>
                            </div>
                            <span className="text-[10px] font-bold text-stone-800 underline shrink-0 cursor-pointer">View Doc</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => {
                          const reason = prompt('Please specify the reason for requesting more information:');
                          if (reason !== null) handleModerateVerification(req.profile.id, 'info', reason);
                        }}
                        className="px-3.5 py-1.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        Request Info
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Please specify the rejection reason:');
                          if (reason !== null) handleModerateVerification(req.profile.id, 'reject', reason);
                        }}
                        className="px-3.5 py-1.5 border border-slate-200 text-red-600 rounded-xl font-bold text-xs hover:bg-red-50 transition-all"
                      >
                        Reject Application
                      </button>
                      <button
                        onClick={() => handleModerateVerification(req.profile.id, 'verify')}
                        className="px-4 py-1.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        Approve & Verify Owner
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Queue 2: Complaints Moderation queue */}
      {!loading && adminTab === 'complaints' && (
        <div className="space-y-6">
          {/* Fleet Incident Trends Recharts Visualization */}
          <FleetIncidentTrends token={token} />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Incident Complaints Moderation & Inspection Queue</h3>
              <p className="text-slate-400 text-xs">Inspect active and historic incident complaints, moderate operator evidence, assign strength levels, and track resolution audit records.</p>
            </div>

            {complaintsQueue.length > 0 && (
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-slate-200 transition-all select-none self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={selectedComplaints.length === complaintsQueue.length && complaintsQueue.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedComplaints(complaintsQueue.map(c => c.complaint.id));
                    } else {
                      setSelectedComplaints([]);
                    }
                  }}
                  className="rounded text-stone-800 focus:ring-stone-400 h-4 w-4"
                />
                <span>Select All ({complaintsQueue.length})</span>
              </label>
            )}
          </div>

          {/* Incident Search and Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            {/* Quick Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
              <button
                onClick={() => setComplaintStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  complaintStatusFilter === 'all'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>All Complaints</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${complaintStatusFilter === 'all' ? 'bg-stone-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {complaintsQueue.length}
                </span>
              </button>

              <button
                onClick={() => setComplaintStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  complaintStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span>Pending Review</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${complaintStatusFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
                  {pendingComplaints}
                </span>
              </button>

              <button
                onClick={() => setComplaintStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  complaintStatusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Verified & Published</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${complaintStatusFilter === 'approved' ? 'bg-emerald-700 text-white' : 'bg-emerald-200/80 text-emerald-900'}`}>
                  {approvedComplaintsCount}
                </span>
              </button>

              <button
                onClick={() => setComplaintStatusFilter('resolved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  complaintStatusFilter === 'resolved'
                    ? 'bg-stone-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <CheckCircle className="h-3 w-3" />
                <span>Resolved</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${complaintStatusFilter === 'resolved' ? 'bg-stone-800 text-white' : 'bg-slate-200 text-slate-800'}`}>
                  {resolvedComplaintsCount}
                </span>
              </button>

              <button
                onClick={() => setComplaintStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  complaintStatusFilter === 'rejected'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
                }`}
              >
                <XCircle className="h-3 w-3" />
                <span>Rejected</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${complaintStatusFilter === 'rejected' ? 'bg-red-700 text-white' : 'bg-red-200/80 text-red-900'}`}>
                  {rejectedComplaintsCount}
                </span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Text Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  placeholder="Search by driver name, phone, SA ID, vehicle, registration, operator company, report ID..."
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all min-h-[44px]"
                />
                {complaintSearch && (
                  <button
                    onClick={() => setComplaintSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* CSV Export Button */}
              <button
                onClick={handleExportIncidentsCSV}
                disabled={filteredComplaints.length === 0}
                className="px-4 py-2 bg-[#1f1f1f] hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs shrink-0 min-h-[44px]"
                title="Download filtered incident data as CSV file"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Export to CSV ({filteredComplaints.length})</span>
              </button>
            </div>

            {/* Filter Selects Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center mr-1">
                  <Filter className="h-3.5 w-3.5 mr-1" /> Category & Severity:
                </span>

                {/* Category Filter */}
                <select
                  value={complaintCategoryFilter}
                  onChange={(e) => setComplaintCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="all">All Categories</option>
                  <option value="theft">Theft / Fraud / Unlawful Possession</option>
                  <option value="vehicle_damage">Vehicle Damage</option>
                  <option value="non_payment">Non-payment / Outstanding debt</option>
                  <option value="speeding">Reckless Driving / Speeding</option>
                  <option value="fraud">Document Fraud</option>
                  <option value="contract_breach">Contract Breach</option>
                  <option value="other">Other / Misc</option>
                </select>

                {/* Severity Filter */}
                <select
                  value={complaintSeverityFilter}
                  onChange={(e) => setComplaintSeverityFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical Severity</option>
                  <option value="high">High Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="low">Low Severity</option>
                </select>

                {(complaintSearch || complaintStatusFilter !== 'all' || complaintCategoryFilter !== 'all' || complaintSeverityFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setComplaintSearch('');
                      setComplaintStatusFilter('all');
                      setComplaintCategoryFilter('all');
                      setComplaintSeverityFilter('all');
                    }}
                    className="text-[11px] text-stone-900 hover:text-black font-bold underline px-1 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="text-[11px] font-semibold text-slate-500">
                Showing <strong className="text-slate-900">{filteredComplaints.length}</strong> of <strong className="text-slate-900">{complaintsQueue.length}</strong> total record(s)
              </div>
            </div>
          </div>

          {/* Bulk Action Bar for Complaints */}
          {selectedComplaints.length > 0 && (
            <div className="p-3.5 bg-stone-900 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-stone-800">
              <span className="text-xs font-bold flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-stone-300" />
                <span>{selectedComplaints.length} driver incident report(s) selected</span>
              </span>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => requestBatchModerateComplaints('reject')}
                  disabled={batchProcessing}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  {batchProcessing ? 'Processing...' : `Reject Selected (${selectedComplaints.length})`}
                </button>
                <button
                  onClick={() => requestBatchModerateComplaints('approve')}
                  disabled={batchProcessing}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {batchProcessing ? 'Processing...' : `Approve & Publish Selected (${selectedComplaints.length})`}
                </button>
                <button
                  onClick={() => setSelectedComplaints([])}
                  className="px-2.5 py-1.5 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {filteredComplaints.length === 0 ? (
            <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center bg-white space-y-3">
              <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">
                  {complaintsQueue.length === 0
                    ? 'No complaints found in the registry.'
                    : 'No incident reports match your current filters.'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {complaintsQueue.length === 0
                    ? 'Incident reports submitted by fleet owners will appear here for review and risk calibration.'
                    : 'Try clearing your search query or selecting "All Complaints" to see historical records.'}
                </p>
              </div>
              {(complaintSearch || complaintStatusFilter !== 'all' || complaintCategoryFilter !== 'all' || complaintSeverityFilter !== 'all') && (
                <button
                  onClick={() => {
                    setComplaintSearch('');
                    setComplaintStatusFilter('all');
                    setComplaintCategoryFilter('all');
                    setComplaintSeverityFilter('all');
                  }}
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Show All {complaintsQueue.length} Complaints</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((item: any) => {
                const c = item.complaint || {};
                const isSelected = selectedComplaints.includes(c.id);
                const isPending = ['pending', 'pending_review', 'submitted'].includes((c.status || '').toLowerCase());
                const isApproved = ['approved', 'verified', 'published'].includes((c.status || '').toLowerCase());
                const isRejected = (c.status || '').toLowerCase() === 'rejected';
                const isResolved = (c.status || '').toLowerCase() === 'resolved' || c.resolution_status === 'fully_resolved';

                return (
                  <div
                    key={c.id}
                    id={`complaint_${c.id}`}
                    className={`bg-white border rounded-2xl p-5 space-y-4 shadow-xs transition-all ${
                      isSelected ? 'border-stone-800 ring-2 ring-stone-400/20 bg-stone-50/50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedComplaints(prev => [...prev, c.id]);
                            } else {
                              setSelectedComplaints(prev => prev.filter(id => id !== c.id));
                            }
                          }}
                          className="mt-1 rounded text-stone-800 focus:ring-stone-400 h-4 w-4 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg">
                              Incident Target: {c.vehicle_make_model || 'Commercial Vehicle'}
                            </span>
                            {c.vehicle_registration && (
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold rounded-lg">
                                Reg: {c.vehicle_registration}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: #{c.id?.slice(0, 10)}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-950 text-base">
                            Driver: {item.driver?.first_name} {item.driver?.surname}
                            {item.driver?.sa_id_number && (
                              <span className="text-xs font-normal text-slate-500 font-mono ml-2">
                                (SA ID: {item.driver.sa_id_number})
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            🔗 Reported by: <span className="font-bold text-slate-800">{item.reporter.profile?.company_name || 'Fleet Operator'}</span> ({item.reporter.user?.name || 'Operator'}, {item.reporter.user?.email || 'N/A'})
                          </p>
                        </div>
                      </div>

                      {/* Color-Coded Status Badge */}
                      <div className="flex items-center space-x-2 self-start">
                        {renderIncidentStatusBadge(c.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Category</span>
                        <span className="text-slate-900 capitalize font-bold">{(c.category || 'Incident').replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Severity</span>
                        <span className="text-slate-900 font-bold capitalize">{c.severity || 'Medium'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Incident Date</span>
                        <span className="text-slate-900 font-bold">{c.incident_date || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Evidence Strength</span>
                        <span className="text-slate-900 font-bold capitalize">{c.evidence_strength || 'Unrated'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Description</span>
                      <p className="text-xs text-slate-700 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 font-medium leading-relaxed">
                        "{c.description}"
                      </p>
                    </div>

                    {/* Rejection reason or approval details if present */}
                    {isRejected && c.rejected_reason && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl space-y-1 text-xs">
                        <span className="font-bold flex items-center space-x-1 text-red-900">
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                          <span>Rejection Audit Reason:</span>
                        </span>
                        <p className="italic font-medium">{c.rejected_reason}</p>
                      </div>
                    )}

                    {isApproved && c.approved_at && (
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 text-emerald-800 rounded-xl text-[11px] flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Verified and published to driver risk dossier</span>
                        </span>
                        <span className="text-emerald-700 font-mono text-[10px]">
                          Approved: {new Date(c.approved_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Evidence list */}
                    {item.evidence && item.evidence.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attached Verification Evidence ({item.evidence.length})</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.evidence.map((ev: any) => (
                            <div key={ev.id} className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-[11px] flex justify-between items-center">
                              <span className="truncate pr-2 font-medium text-slate-700">📄 {ev.description || ev.file_url || 'Supporting document'}</span>
                              <span className="text-[10px] text-slate-400 italic font-bold shrink-0">Attached</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dispute text if present */}
                    {item.dispute && (
                      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-1.5 text-xs">
                        <div className="font-bold flex items-center space-x-1.5 text-amber-900">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span>Active Right of Reply Dispute Filed by Driver</span>
                        </div>
                        <p className="italic font-medium text-amber-800">"{item.dispute.dispute_text}"</p>
                        <div className="text-[10px] text-amber-700 font-bold flex justify-between items-center pt-1 border-t border-amber-200/60">
                          <span>Driver Contact: {item.dispute.driver_contact || 'N/A'}</span>
                          <button
                            onClick={() => setAdminTab('disputes')}
                            className="underline text-amber-900 hover:text-black cursor-pointer font-extrabold"
                          >
                            Inspect Dispute in Disputes Queue →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions Form / Buttons Bar */}
                    <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          defaultValue={c.severity || 'medium'}
                          onChange={(e) => handleModerateComplaint(c.id, isApproved ? 'approve' : 'reopen', e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-stone-400 font-bold text-slate-800 outline-none"
                          title="Override Severity Rating"
                        >
                          <option value="low">Severity: Low</option>
                          <option value="medium">Severity: Medium</option>
                          <option value="high">Severity: High</option>
                          <option value="critical">Severity: Critical</option>
                        </select>

                        <select
                          defaultValue={c.evidence_strength || 'none'}
                          onChange={(e) => handleModerateComplaint(c.id, isApproved ? 'approve' : 'reopen', undefined, undefined, e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-stone-400 font-bold text-slate-800 outline-none"
                          title="Set Evidence Strength Level"
                        >
                          <option value="none">Evidence: Weak/None</option>
                          <option value="weak">Evidence: Weak</option>
                          <option value="moderate">Evidence: Moderate</option>
                          <option value="strong">Evidence: Strong proof</option>
                          <option value="verified">Evidence: Verified official</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center justify-end">
                        {onOpenChat && (
                          <button
                            onClick={() => onOpenChat(c.id)}
                            className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
                            title="Open Real-Time Incident Clarification Chat with Fleet Owner"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
                            <span>Clarify / Chat</span>
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              onClick={() => {
                                const r = prompt('Specify rejection reason:');
                                if (r !== null) handleModerateComplaint(c.id, 'reject', undefined, undefined, undefined, undefined, r);
                              }}
                              className="px-3.5 py-1.5 border border-slate-200 text-red-600 rounded-xl font-bold text-xs hover:bg-red-50 transition-all cursor-pointer"
                            >
                              Reject Complaint
                            </button>
                            <button
                              onClick={() => handleModerateComplaint(c.id, 'approve')}
                              className="px-4 py-1.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              Approve & Publish
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <>
                            <button
                              onClick={() => handleModerateComplaint(c.id, 'resolved')}
                              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                              title="Mark this incident as resolved/settled"
                            >
                              Mark as Resolved
                            </button>
                            <button
                              onClick={() => handleModerateComplaint(c.id, 'reopen')}
                              className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                              title="Return complaint to Pending Review status"
                            >
                              Re-open for Review
                            </button>
                          </>
                        )}

                        {isRejected && (
                          <>
                            <button
                              onClick={() => handleModerateComplaint(c.id, 'reopen')}
                              className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              Re-open for Review
                            </button>
                            <button
                              onClick={() => handleModerateComplaint(c.id, 'approve')}
                              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              Amend & Approve
                            </button>
                          </>
                        )}

                        {isResolved && (
                          <button
                            onClick={() => handleModerateComplaint(c.id, 'reopen')}
                            className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            Re-open Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Queue 3: Driver Disputes */}
      {!loading && adminTab === 'disputes' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-slate-900">Driver Active Dispute Review Desk</h3>
          <p className="text-slate-400 text-xs">Review disputes lodged by drivers against complaints. Administrators can amend, maintain, or remove complaints entirely.</p>

          {disputesList.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
              No active disputes currently under administrative review.
            </div>
          ) : (
            <div className="space-y-4">
              {disputesList.map((item: any) => (
                <div key={item.dispute.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-base">Disputed by: {item.dispute.driver_name}</h4>
                      <p className="text-xs text-slate-400 font-medium">Contact: {item.dispute.driver_contact} • Filed: {item.dispute.created_at.split('T')[0]}</p>
                    </div>

                    <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold uppercase rounded-lg border border-red-100">
                      Dispute {item.dispute.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-wide block text-[10px]">Original Complaint Facts</span>
                      <p className="italic font-medium text-slate-700">"{item.complaint?.description || 'N/A'}"</p>
                    </div>

                    <div className="p-3.5 bg-red-50/50 border border-red-100 rounded-xl space-y-1">
                      <span className="font-bold text-red-600 uppercase tracking-wide block text-[10px]">Driver Counter-Claim</span>
                      <p className="italic text-slate-800 font-semibold">"{item.dispute.dispute_text}"</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {onOpenChat && (
                      <button
                        onClick={() => onOpenChat(item.dispute.complaint_id)}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer shadow-2xs mr-auto"
                        title="Clarify facts with the fleet owner who filed this incident"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
                        <span>Clarify with Fleet Owner</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleModerateDispute(item.dispute.id, 'reject')}
                      className="px-3.5 py-1.5 border border-slate-200 text-red-600 rounded-xl font-bold text-xs hover:bg-red-50 transition-all cursor-pointer"
                    >
                      Reject Counter-Claim
                    </button>
                    <button
                      onClick={() => handleModerateDispute(item.dispute.id, 'accept')}
                      className="px-4 py-1.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      Accept Dispute & Clear Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Queue 4: Duplicate Driver Matching & Merging */}
      {!loading && adminTab === 'drivers' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">Merge Duplicate Driver Profiles</h3>
            <p className="text-slate-500 text-xs">If a driver has been registered multiple times due to slight spelling mistakes or different phone numbers, merge their histories to maintain correct transparent risk scores.</p>
          </div>

          <form onSubmit={handleMergeDrivers} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Driver Profile (To Keep)</label>
              <select
                value={primaryMergeId}
                onChange={e => setPrimaryMergeId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-stone-400 text-slate-800 min-h-[44px]"
              >
                <option value="">Select primary driver...</option>
                {driversList.map(d => (
                  <option key={d.id} value={d.id}>{d.first_name} {d.surname} ({d.id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Duplicate Driver Profile (To Delete)</label>
              <select
                value={duplicateMergeId}
                onChange={e => setDuplicateMergeId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-stone-400 text-slate-800 min-h-[44px]"
              >
                <option value="">Select duplicate driver...</option>
                {driversList.map(d => (
                  <option key={d.id} value={d.id}>{d.first_name} {d.surname} ({d.id})</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all min-h-[44px]"
            >
              Execute Profile Merge
            </button>
          </form>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5 text-xs text-amber-800">
            <div className="font-bold flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4" />
              <span>Irreversible Merging Compliance</span>
            </div>
            <p className="font-medium text-amber-700">Executing a profile merge will link all complaints from the duplicate driver to the primary driver, then completely erase the duplicate driver record. Risk rating scores are recalculated instantly.</p>
          </div>
        </div>
      )}

      {/* Queue 5: User management and suspensions */}
      {!loading && adminTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">User Listings & Suspension Control</h3>
            <p className="text-slate-500 text-xs font-medium">Manage active operators, review fleet sizes, and temporarily suspend abusive users.</p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left text-slate-500">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold">Operator Name</th>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">Compliance State</th>
                  <th className="px-4 py-3 font-bold">Registered At</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-extrabold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 font-medium text-slate-600">{item.email}</td>
                    <td className="px-4 py-3 capitalize font-bold text-slate-600">{item.role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        item.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-500">{item.created_at.split('T')[0]}</td>
                    <td className="px-4 py-3 text-right">
                      {item.id !== user.id ? (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to change status for ${item.name}?`)) {
                              handleToggleUserStatus(item.id);
                            }
                          }}
                          className={`px-3 py-1.5 border rounded-xl font-bold text-[10px] cursor-pointer transition-all ${
                            item.status === 'active' ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100/50' : 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100/50'
                          }`}
                        >
                          {item.status === 'active' ? 'Suspend Operator' : 'Unsuspend'}
                        </button>
                      ) : (
                        <span className="text-slate-400 font-bold text-[11px] pr-2">Self</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Queue 6: Audit logs & Searches logs */}
      {!loading && adminTab === 'audit_logs' && (
        <AuditTrailModule
          auditLogsList={auditLogsList}
          searchLogsList={searchLogsList}
          onRefresh={loadTabContent}
          token={token}
        />
      )}

      {/* Queue: Geographical Heat Map */}
      {!loading && adminTab === 'heatmap' && (
        <GeographicalHeatMap token={token} />
      )}

      {/* Queue 7: Driver email logs outbox */}
      {!loading && adminTab === 'emails' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs max-w-4xl mx-auto">
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-base">Driver Notification Outbox Log</h3>
            <p className="text-slate-400 text-xs font-medium">Simulated automated emails dispatched to drivers immediately upon reporting. Ensures full POPIA compliance and transparent dispute opportunities.</p>
          </div>

          {emailsList.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
              No simulated driver notifications have been triggered yet. Submit an incident report to trigger an email!
            </div>
          ) : (
            <div className="space-y-4">
              {emailsList.map((mail: any) => (
                <div key={mail.id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-all bg-slate-50/20">
                  <div className="bg-slate-50 p-3.5 border-b border-slate-150 text-[11px] font-medium space-y-1 text-slate-600">
                    <div className="flex justify-between items-center">
                      <p>📧 <strong>Recipient To:</strong> <span className="text-slate-800 font-bold">{mail.to}</span> ({mail.driver_name})</p>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(mail.sent_at).toLocaleString()}</span>
                    </div>
                    <p>📬 <strong>Subject:</strong> <span className="text-stone-900 font-bold">{mail.subject}</span></p>
                    <p>🔢 <strong>Reference Complaint:</strong> <span className="text-slate-800 font-mono font-bold bg-slate-200/60 px-1 py-0.5 rounded-sm">{mail.complaint_id}</span></p>
                  </div>
                  <div className="p-4 bg-white">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-150 max-h-[160px] overflow-y-auto">
                      {mail.body}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk action confirmation modal */}
      <BulkConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmModalAction}
        title={
          confirmModal.action === 'reject'
            ? 'Confirm Bulk Rejection'
            : confirmModal.type === 'verifications'
            ? 'Confirm Bulk Verification'
            : 'Confirm Bulk Approval'
        }
        description={
          confirmModal.type === 'verifications'
            ? `You are about to ${confirmModal.action === 'reject' ? 'reject' : 'verify'} ${confirmModal.itemCount} selected fleet owner verification request(s).`
            : `You are about to ${confirmModal.action === 'reject' ? 'reject' : 'approve and publish'} ${confirmModal.itemCount} selected driver incident report(s).`
        }
        actionType={confirmModal.action}
        itemCount={confirmModal.itemCount}
        isProcessing={batchProcessing}
      />

      {/* Admin Account Settings Modal */}
      <AdminAccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={currentUser}
        token={token}
        onUserUpdated={(updated) => setCurrentUser(updated)}
      />

      <AccountDataModal
        isOpen={showAccountDataModal}
        onClose={() => setShowAccountDataModal(false)}
        token={token}
        onAccountDeleted={onLogout}
      />
    </DashboardLayout>
  );
}
