import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit3, Trash2, Users, Search, RefreshCw, ShieldCheck, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react';

interface FleetOwnersManagementProps {
  token: string;
}

export default function FleetOwnersManagement({ token }: FleetOwnersManagementProps) {
  const [fleetOwners, setFleetOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    company_name: '',
    registration_number: '',
    business_address: '',
    fleet_size: '5',
    platforms_used: ['Uber', 'Bolt']
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Modal State
  const [editingOwner, setEditingOwner] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    registration_number: '',
    business_address: '',
    fleet_size: '5',
    verification_status: 'verified'
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete / Safety Check Modal State
  const [deletingOwner, setDeletingOwner] = useState<any | null>(null);
  const [driverAction, setDriverAction] = useState<'unassign' | 'reassign' | 'delete'>('unassign');
  const [targetOwnerId, setTargetOwnerId] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  useEffect(() => {
    fetchFleetOwners();
  }, [token]);

  const fetchFleetOwners = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/fleet-owners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch fleet owners');
      setFleetOwners(data.fleetOwners || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load fleet owners');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/fleet-owners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create fleet owner');

      setSuccessMsg(data.message || 'Fleet Owner account created successfully.');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        company_name: '',
        registration_number: '',
        business_address: '',
        fleet_size: '5',
        platforms_used: ['Uber', 'Bolt']
      });
      fetchFleetOwners();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openEditModal = (ownerItem: any) => {
    setEditingOwner(ownerItem);
    setEditForm({
      name: ownerItem.user?.name || '',
      email: ownerItem.user?.email || '',
      phone: ownerItem.user?.phone || '',
      company_name: ownerItem.profile?.company_name || '',
      registration_number: ownerItem.profile?.registration_number || '',
      business_address: ownerItem.profile?.business_address || '',
      fleet_size: ownerItem.profile?.fleet_size?.toString() || '5',
      verification_status: ownerItem.profile?.verification_status || 'verified'
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOwner) return;
    setSubmittingEdit(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetId = editingOwner.profile?.id || editingOwner.user?.id;
      const res = await fetch(`/api/admin/fleet-owners/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update fleet owner');

      setSuccessMsg('Fleet Owner record updated successfully.');
      setEditingOwner(null);
      fetchFleetOwners();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOwner) return;
    setSubmittingDelete(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetId = deletingOwner.profile?.id || deletingOwner.user?.id;
      const res = await fetch(`/api/admin/fleet-owners/${targetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          driver_action: driverAction,
          target_fleet_owner_id: targetOwnerId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete fleet owner');

      setSuccessMsg(data.message || 'Fleet Owner deleted successfully.');
      setDeletingOwner(null);
      fetchFleetOwners();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const filtered = fleetOwners.filter(fo => {
    const q = searchQuery.toLowerCase();
    const name = (fo.user?.name || '').toLowerCase();
    const email = (fo.user?.email || '').toLowerCase();
    const company = (fo.profile?.company_name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || company.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Fleet Owner Operator Management</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Create, update, or remove fleet owner accounts. Manage driver assignments and safety rules upon deletion.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Fleet Owner</span>
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-700 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter fleet owners by operator name, company, or email address..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
        />
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading fleet owners list...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Fleet Owners Found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.user?.id || item.profile?.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{item.profile?.company_name || 'Individual Operator'}</h3>
                    <div className="text-xs text-slate-500">Contact: <span className="font-semibold text-slate-800">{item.user?.name}</span></div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    item.profile?.verification_status === 'verified'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {item.profile?.verification_status || 'Pending'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.user?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{item.user?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="font-bold text-slate-800">{item.assignedDriversCount || 0} Attached Drivers</span>
                  </div>
                </div>

                {/* Attached Drivers Preview */}
                {item.assignedDrivers && item.assignedDrivers.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Drivers:</span>
                    <div className="flex flex-wrap gap-1">
                      {item.assignedDrivers.slice(0, 3).map((d: any) => (
                        <span key={d.id} className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-100 rounded text-[10px] font-medium">
                          {d.name}
                        </span>
                      ))}
                      {item.assignedDrivers.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                          +{item.assignedDrivers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(item)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Owner</span>
                </button>
                <button
                  onClick={() => {
                    setDeletingOwner(item);
                    setDriverAction('unassign');
                    setTargetOwnerId('');
                  }}
                  className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Delete fleet owner"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Fleet Owner Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Add Fleet Owner Account</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Fleet Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.company_name}
                    onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="e.g. Soweto Fleets"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="owner@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="+27 82 000 0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="Account Password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fleet Size</label>
                  <input
                    type="number"
                    value={createForm.fleet_size}
                    onChange={(e) => setCreateForm({ ...createForm, fleet_size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Address</label>
                <input
                  type="text"
                  value={createForm.business_address}
                  onChange={(e) => setCreateForm({ ...createForm, business_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  placeholder="Street, City, Postal Code"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
                >
                  {submittingCreate ? 'Creating...' : 'Create Fleet Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fleet Owner Modal */}
      {editingOwner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Edit Fleet Owner Profile</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={editForm.verification_status}
                    onChange={(e) => setEditForm({ ...editForm, verification_status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="info_required">Info Required</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fleet Size</label>
                  <input
                    type="number"
                    value={editForm.fleet_size}
                    onChange={(e) => setEditForm({ ...editForm, fleet_size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOwner(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Fleet Owner & Safety Checks Modal */}
      {deletingOwner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-base">
              <AlertTriangle className="h-5 w-5" />
              <span>Delete Fleet Owner & Handle Attached Drivers</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to delete <strong>{deletingOwner.profile?.company_name || deletingOwner.user?.name}</strong>.
              This operator currently has <strong>{deletingOwner.assignedDriversCount || 0} driver(s)</strong> attached to their fleet.
            </p>

            {deletingOwner.assignedDriversCount > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-amber-900 block">Select How to Handle Attached Drivers (Orphan Safety Check):</span>
                
                <div className="space-y-2 text-xs">
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="driverAction"
                      value="unassign"
                      checked={driverAction === 'unassign'}
                      onChange={() => setDriverAction('unassign')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Unassign Drivers (Recommended)</span>
                      <p className="text-slate-500 text-[11px]">Keep driver profiles active, set status to 'Looking for Vehicle', and remove fleet link.</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="driverAction"
                      value="reassign"
                      checked={driverAction === 'reassign'}
                      onChange={() => setDriverAction('reassign')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Reassign Drivers to Another Fleet Owner</span>
                      <p className="text-slate-500 text-[11px]">Move all attached drivers to a replacement fleet operator.</p>
                    </div>
                  </label>

                  {driverAction === 'reassign' && (
                    <div className="pl-6 pt-1">
                      <select
                        value={targetOwnerId}
                        onChange={(e) => setTargetOwnerId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      >
                        <option value="">-- Select Target Fleet Owner --</option>
                        {fleetOwners
                          .filter(fo => (fo.profile?.id || fo.user?.id) !== (deletingOwner.profile?.id || deletingOwner.user?.id))
                          .map(fo => (
                            <option key={fo.profile?.id || fo.user?.id} value={fo.profile?.id || fo.user?.id}>
                              {fo.profile?.company_name || fo.user?.name} ({fo.user?.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="driverAction"
                      value="delete"
                      checked={driverAction === 'delete'}
                      onChange={() => setDriverAction('delete')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-red-700">Delete Attached Drivers Too</span>
                      <p className="text-slate-500 text-[11px]">Permanently remove all attached driver accounts and profiles.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingOwner(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDelete || (driverAction === 'reassign' && !targetOwnerId)}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
              >
                {submittingDelete ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
