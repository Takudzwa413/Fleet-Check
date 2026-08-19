import React, { useState, useEffect } from 'react';
import {
  Car,
  Plus,
  Calendar,
  DollarSign,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X,
  Play
} from 'lucide-react';
import { Project, User } from '../../types';
import StokvelDashboard from '../stokvel/StokvelDashboard';

interface ProjectsManagementProps {
  token: string;
  currentUser: User;
}

export default function ProjectsManagement({ token, currentUser }: ProjectsManagementProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // New Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_months: 15,
    start_date: new Date().toISOString().split('T')[0],
    deposit_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    full_slot_weekly: 3000,
    full_slot_deposit: 10000,
    full_slot_payout: 300000,
    half_slot_weekly: 1500,
    half_slot_deposit: 5000,
    half_slot_payout: 150000,
    bank_name: 'Standard Bank South Africa',
    bank_account_name: 'Action Pack Stokvel Vehicle Fund',
    bank_account_number: '1029384756',
    branch_code: '051001',
    account_type: 'Business Cheque',
    payment_reference_instructions: 'Use MEMBER ID (e.g., AP-MEM-001)',
    constitution_document_name: 'Action Pack Stokvel Constitution & Rules 2026',
    notes: 'Official 15-Month Rotating Commercial Vehicle Stokvel Cycle'
  });

  const loadProjects = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/stokvel/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load projects');
      setProjects(data.projects || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching project registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Please enter a project title');
      return;
    }

    setCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        duration_months: Number(formData.duration_months),
        start_date: formData.start_date,
        deposit_deadline: formData.deposit_deadline,
        contribution_cycle: 'weekly',
        week_start_day: 'Monday',
        bank_name: formData.bank_name,
        bank_account_name: formData.bank_account_name,
        bank_account_number: formData.bank_account_number,
        branch_code: formData.branch_code,
        account_type: formData.account_type,
        payment_reference_instructions: formData.payment_reference_instructions,
        constitution_document_name: formData.constitution_document_name,
        notes: formData.notes,
        status: 'active'
      };

      const res = await fetch('/api/stokvel/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');

      setSuccessMsg(`Project "${data.project?.name || formData.name}" created and initialized successfully!`);
      setShowCreateModal(false);
      loadProjects();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        duration_months: 15,
        start_date: new Date().toISOString().split('T')[0],
        deposit_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        full_slot_weekly: 3000,
        full_slot_deposit: 10000,
        full_slot_payout: 300000,
        half_slot_weekly: 1500,
        half_slot_deposit: 5000,
        half_slot_payout: 150000,
        bank_name: 'Standard Bank South Africa',
        bank_account_name: 'Action Pack Stokvel Vehicle Fund',
        bank_account_number: '1029384756',
        branch_code: '051001',
        account_type: 'Business Cheque',
        payment_reference_instructions: 'Use MEMBER ID (e.g., AP-MEM-001)',
        constitution_document_name: 'Action Pack Stokvel Constitution & Rules 2026',
        notes: 'Official 15-Month Rotating Commercial Vehicle Stokvel Cycle'
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleActivateProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/stokvel/projects/${projectId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate project');
      setSuccessMsg(data.message || 'Project activated');
      loadProjects();
    } catch (err: any) {
      setErrorMsg(err.message || 'Activation failed');
    }
  };

  const filteredProjects = projects.filter(p => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.bank_name || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q)
    );
  });

  // If a project is opened in the full workspace
  if (selectedProjectId) {
    const activeProj = projects.find(p => p.id === selectedProjectId);
    return (
      <div className="space-y-6">
        {/* Return to Project Manager banner */}
        <div className="bg-stone-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedProjectId(null)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>← Back to All Projects</span>
            </button>
            <div className="h-4 w-px bg-stone-700" />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">Active Workspace</span>
              <h2 className="text-sm font-black text-white">{activeProj?.name || 'Stokvel Project'}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Week {activeProj?.computed_current_week || 1} of {activeProj?.total_weeks || 65}
            </span>
          </div>
        </div>

        {/* Embedded Stokvel Dashboard with All Modules */}
        <StokvelDashboard
          user={currentUser}
          token={token}
          projectId={selectedProjectId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Car className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-stone-900">Vehicle Acquisition Stokvel Projects</h2>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            Create, configure, and manage rotating capital pools and commercial vehicle acquisition schemes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Project</span>
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 font-bold text-xs cursor-pointer">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-700 font-bold text-xs cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, description, bank, or status..."
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all outline-none"
          />
          <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="p-12 text-center text-stone-500 text-sm bg-white rounded-2xl border border-stone-200">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
          <span>Loading vehicle acquisition projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center space-y-4">
          <div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <Car className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">No Projects Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
              Start by creating your first rotating vehicle acquisition stokvel project.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProjects.map((proj) => {
            const isCompleted = proj.status === 'completed';
            const isActive = proj.status === 'active';
            const isDraft = proj.status === 'draft';

            return (
              <div
                key={proj.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-2xs hover:border-stone-300 transition-all p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Badges & Title */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDraft
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                          {proj.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">ID: {proj.id}</span>
                      </div>
                      <h3 className="text-base font-black text-stone-900 mt-1.5">{proj.name}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                        {proj.description || 'Rotating commercial vehicle acquisition stokvel pool.'}
                      </p>
                    </div>

                    <div className="h-10 w-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                      <Car className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Metrics Bento */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Duration</span>
                      <div className="font-black text-stone-900 text-xs mt-0.5">{proj.duration_months || 15} Months</div>
                      <span className="text-[10px] text-stone-500">{proj.total_weeks || 65} Weeks</span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Progress</span>
                      <div className="font-black text-stone-900 text-xs mt-0.5">
                        Week {proj.computed_current_week || 1}
                      </div>
                      <span className="text-[10px] text-stone-500">of {proj.total_weeks || 65}</span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Members</span>
                      <div className="font-black text-stone-900 text-xs mt-0.5">
                        {proj.member_count || proj.number_of_members || 10} Slots
                      </div>
                      <span className="text-[10px] text-stone-500">Subscribed</span>
                    </div>
                  </div>

                  {/* Banking Info */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs space-y-1.5">
                    <div className="flex items-center space-x-2 text-stone-700">
                      <Building className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span className="font-medium">{proj.bank_name || 'Standard Bank SA'}</span>
                      <span className="text-stone-300">•</span>
                      <span className="font-mono text-stone-500">Acc: {proj.bank_account_number || '1029384756'}</span>
                    </div>
                    {proj.constitution_document_name && (
                      <div className="flex items-center space-x-2 text-stone-600 text-[11px]">
                        <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{proj.constitution_document_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => setSelectedProjectId(proj.id)}
                    className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span>Open Stokvel Workspace</span>
                  </button>

                  {proj.status === 'draft' && (
                    <button
                      onClick={() => handleActivateProject(proj.id)}
                      className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-stone-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-stone-900 p-6 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">Capital Rotation Engine</span>
                <h3 className="text-lg font-black text-white mt-1">Create Vehicle Acquisition Project</h3>
                <p className="text-stone-300 text-xs mt-1">
                  Configure a new 15-month rotating vehicle acquisition stokvel cycle with automated contribution schedules.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateProject} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Basic Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-1">
                  1. Project Profile & Cycle
                </h4>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Project Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Action Pack 2026 Vehicle Acquisition Pool"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Description / Mission</label>
                  <textarea
                    rows={2}
                    placeholder="Pooled weekly contributions to acquire quality rideshare vehicles for member drivers."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Duration (Months)</label>
                    <input
                      type="number"
                      min={6}
                      max={36}
                      value={formData.duration_months}
                      onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Deposit Deadline</label>
                    <input
                      type="date"
                      value={formData.deposit_deadline}
                      onChange={(e) => setFormData({ ...formData, deposit_deadline: e.target.value })}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Slot Economics */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-1">
                  2. Contribution Rules & Slot Economics
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="sm:col-span-3 font-bold text-xs text-stone-800 flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Full Slot Tier (Primary)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Weekly Dues (ZAR)</label>
                    <input
                      type="number"
                      value={formData.full_slot_weekly}
                      onChange={(e) => setFormData({ ...formData, full_slot_weekly: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Initial Deposit (ZAR)</label>
                    <input
                      type="number"
                      value={formData.full_slot_deposit}
                      onChange={(e) => setFormData({ ...formData, full_slot_deposit: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Vehicle Target Payout</label>
                    <input
                      type="number"
                      value={formData.full_slot_payout}
                      onChange={(e) => setFormData({ ...formData, full_slot_payout: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-1">
                  3. Dedicated Treasury & Bank Account
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={formData.bank_account_name}
                      onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={formData.branch_code}
                      onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Constitution Document */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-1">
                  4. Governance & Constitution
                </h4>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Constitution Document Name</label>
                  <input
                    type="text"
                    value={formData.constitution_document_name}
                    onChange={(e) => setFormData({ ...formData, constitution_document_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                >
                  {creating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{creating ? 'Initializing Project...' : 'Create & Initialize Project'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
