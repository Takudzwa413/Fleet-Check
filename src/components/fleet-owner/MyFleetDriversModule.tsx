import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, ShieldCheck, Phone, Mail, MapPin, Search, AlertTriangle, CheckCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { DriverProfile } from '../../types';
import { Tooltip, StatusBadgeWithTooltip } from '../ui/Tooltip';

interface MyFleetDriversModuleProps {
  token: string;
}

export default function MyFleetDriversModule({ token }: MyFleetDriversModuleProps) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Driver Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    surname: '',
    phone: '',
    email: '',
    id_number: '',
    city: 'Johannesburg',
    province: 'Gauteng',
    license_type: 'Code 8 PDP',
    platforms: ['Uber'],
    bio: ''
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Driver Modal State
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    surname: '',
    phone: '',
    email: '',
    id_number: '',
    city: '',
    province: '',
    license_type: '',
    status: 'employed',
    bio: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete/Remove Confirm State
  const [deletingDriver, setDeletingDriver] = useState<any | null>(null);
  const [submittingRemove, setSubmittingRemove] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, [token]);

  const fetchDrivers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/fleet-owner/drivers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch fleet drivers.');
      setDrivers(data.drivers || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading fleet drivers.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/fleet-owner/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add driver to fleet');

      setSuccessMsg(data.message || 'Driver added to your fleet successfully!');
      setShowAddModal(false);
      setAddForm({
        first_name: '',
        surname: '',
        phone: '',
        email: '',
        id_number: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        license_type: 'Code 8 PDP',
        platforms: ['Uber'],
        bio: ''
      });
      fetchDrivers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openEditModal = (driver: any) => {
    setEditingDriver(driver);
    setEditForm({
      first_name: driver.first_name || '',
      surname: driver.surname || '',
      phone: driver.phone || driver.user_phone || '',
      email: driver.email || driver.user_email || '',
      id_number: driver.id_number || '',
      city: driver.city || '',
      province: driver.province || '',
      license_type: driver.license_type || 'Code 8 PDP',
      status: driver.status || 'employed',
      bio: driver.bio || ''
    });
  };

  const handleEditDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setSubmittingEdit(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/fleet-owner/drivers/${editingDriver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update driver profile');

      setSuccessMsg('Driver profile updated successfully.');
      setEditingDriver(null);
      fetchDrivers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleRemoveDriverConfirm = async () => {
    if (!deletingDriver) return;
    setSubmittingRemove(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/fleet-owner/drivers/${deletingDriver.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove driver');

      setSuccessMsg(data.message || 'Driver removed from your fleet.');
      setDeletingDriver(null);
      fetchDrivers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingRemove(false);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const q = searchQuery.toLowerCase();
    const fullName = `${d.first_name} ${d.surname}`.toLowerCase();
    const email = (d.email || d.user_email || '').toLowerCase();
    const phone = (d.phone || d.user_phone || '').toLowerCase();
    return fullName.includes(q) || email.includes(q) || phone.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-stone-800" />
            <h2 className="text-lg font-bold text-slate-900">My Assigned Fleet Drivers</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Manage drivers currently attached to your fleet. View contact details, edit profile records, or add new drivers directly.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Driver to Fleet</span>
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

      {/* Filter / Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter drivers by name, phone, or email address..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-stone-400 min-h-[44px]"
        />
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
      </div>

      {/* Drivers List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-stone-700 mb-2" />
          <span>Loading assigned drivers...</span>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Drivers Assigned Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You currently have no drivers attached to your fleet. Add a new driver or accept incoming driver link requests.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => (
            <div key={driver.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{driver.first_name} {driver.surname}</h3>
                    <Tooltip
                      title="Professional Driving Permit"
                      content="South African Professional Driving Permit (PrDP) required for transporting paying passengers and goods."
                      position="top"
                    >
                      <div className="text-xs text-stone-700 font-semibold cursor-help flex items-center gap-1">
                        <span>{driver.license_type || 'Code 8 PDP'}</span>
                        <HelpCircle className="h-2.5 w-2.5 text-stone-400" />
                      </div>
                    </Tooltip>
                  </div>
                  <StatusBadgeWithTooltip
                    status={driver.status || 'employed'}
                    label={driver.status === 'employed' ? 'Employed' : 'Active'}
                    badgeClass="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase"
                    customExplanation="Active employment relationship verified. Driver is assigned to fleet vehicle operations."
                  />
                </div>

                <div className="space-y-1.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{driver.phone || driver.user_phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{driver.email || driver.user_email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{driver.city || 'Johannesburg'}, {driver.province || 'Gauteng'}</span>
                  </div>
                </div>

                {driver.platforms && driver.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {driver.platforms.map((p: string) => (
                      <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(driver)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Info</span>
                </button>
                <button
                  onClick={() => setDeletingDriver(driver)}
                  className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Remove driver from fleet"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Add Driver to Your Fleet</h3>
            <form onSubmit={handleAddDriverSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Surname *</label>
                  <input
                    type="text"
                    required
                    value={addForm.surname}
                    onChange={(e) => setAddForm({ ...addForm, surname: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="Surname"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="+27 82 123 4567"
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
                    placeholder="driver@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID / Passport Number</label>
                  <input
                    type="text"
                    value={addForm.id_number}
                    onChange={(e) => setAddForm({ ...addForm, id_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="ID Number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">License Type</label>
                  <input
                    type="text"
                    value={addForm.license_type}
                    onChange={(e) => setAddForm({ ...addForm, license_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="Code 8 PDP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Province</label>
                  <input
                    type="text"
                    value={addForm.province}
                    onChange={(e) => setAddForm({ ...addForm, province: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-2 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 min-h-[44px] cursor-pointer"
                >
                  {submittingAdd ? 'Adding...' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Edit Driver Information</h3>
            <form onSubmit={handleEditDriverSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Surname</label>
                  <input
                    type="text"
                    required
                    value={editForm.surname}
                    onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">License Type</label>
                  <input
                    type="text"
                    value={editForm.license_type}
                    onChange={(e) => setEditForm({ ...editForm, license_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 min-h-[44px] cursor-pointer"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Driver Confirm Modal */}
      {deletingDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Remove Driver from Fleet?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>{deletingDriver.first_name} {deletingDriver.surname}</strong> from your fleet? The driver will be unassigned and set to 'Looking for Vehicle'.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingDriver(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRemove}
                onClick={handleRemoveDriverConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
              >
                {submittingRemove ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
