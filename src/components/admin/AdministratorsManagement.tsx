import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Edit3, Trash2, Mail, Phone, Search, RefreshCw, AlertTriangle, KeyRound } from 'lucide-react';

interface AdministratorsManagementProps {
  token: string;
  currentUserId: string;
}

export default function AdministratorsManagement({ token, currentUserId }: AdministratorsManagementProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Modal State
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Modal State
  const [deletingAdmin, setDeletingAdmin] = useState<any | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, [token]);

  const fetchAdmins = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/administrators', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch administrators');
      setAdmins(data.administrators || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading administrators');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/administrators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create administrator');

      setSuccessMsg('New administrator account created successfully.');
      setShowAddModal(false);
      setAddForm({ name: '', email: '', phone: '', password: '' });
      fetchAdmins();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openEditModal = (adminItem: any) => {
    setEditingAdmin(adminItem);
    setEditForm({
      name: adminItem.name || '',
      email: adminItem.email || '',
      phone: adminItem.phone || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSubmittingEdit(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/administrators/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update administrator');

      setSuccessMsg('Administrator account details updated.');
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAdmin) return;
    setSubmittingDelete(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/administrators/${deletingAdmin.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete administrator');

      setSuccessMsg('Administrator account deleted.');
      setDeletingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const filtered = admins.filter(a => {
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">System Administrators</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Manage administrative privilege access. Add or edit system admin accounts and enforce access control safeguards.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Administrator</span>
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
          placeholder="Filter administrators by name or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
        />
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading administrators...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Administrators Found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((adminItem) => {
            const isSelf = adminItem.id === currentUserId;
            return (
              <div key={adminItem.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{adminItem.name}</h3>
                      <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">System Administrator</div>
                    </div>
                    {isSelf && (
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold">
                        You (Current Session)
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{adminItem.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{adminItem.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(adminItem)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setDeletingAdmin(adminItem)}
                    disabled={isSelf || admins.length <= 1}
                    className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-colors flex items-center space-x-1 ${
                      isSelf || admins.length <= 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer'
                    }`}
                    title={isSelf ? 'Cannot delete your own active session' : 'Delete administrator'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Add Administrator Account</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  placeholder="Administrator Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  placeholder="admin@fleetcheck.co.za"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  placeholder="+27 82 000 0000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  placeholder="Password"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
                >
                  {submittingAdd ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Edit Administrator</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

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

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
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

      {/* Delete Admin Modal */}
      {deletingAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Administrator Account?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to revoke administrative access for <strong>{deletingAdmin.name}</strong> ({deletingAdmin.email})?
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDelete}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
              >
                {submittingDelete ? 'Deleting...' : 'Delete Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
