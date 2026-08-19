import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, Building2, Search, RefreshCw, Phone, Mail, MapPin, ShieldCheck, ArrowRightLeft } from 'lucide-react';

interface DriversManagementProps {
  token: string;
  initialSearchQuery?: string;
}

export default function DriversManagement({ token, initialSearchQuery = '' }: DriversManagementProps) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [fleetOwners, setFleetOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | 'looking_for_vehicle' | 'employed'>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [licenseFilter, setLicenseFilter] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    surname: '',
    phone: '',
    email: '',
    password: '',
    id_number: '',
    city: 'Johannesburg',
    province: 'Gauteng',
    license_type: 'Code 8 PDP',
    fleet_owner_id: '',
    status: 'looking_for_vehicle'
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Modal State
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
    status: 'looking_for_vehicle',
    fleet_owner_id: '',
    bio: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reassign Modal State
  const [reassigningDriver, setReassigningDriver] = useState<any | null>(null);
  const [reassignOwnerId, setReassignOwnerId] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Delete Modal State
  const [deletingDriver, setDeletingDriver] = useState<any | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Fetch drivers
      const resDrivers = await fetch('/api/admin/drivers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataDrivers = await resDrivers.json();
      if (!resDrivers.ok) throw new Error(dataDrivers.error || 'Failed to fetch drivers');
      setDrivers(dataDrivers.drivers || []);

      // Fetch fleet owners for dropdown
      const resOwners = await fetch('/api/admin/fleet-owners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataOwners = await resOwners.json();
      if (resOwners.ok) {
        setFleetOwners(dataOwners.fleetOwners || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading drivers data.');
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
      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create driver account');

      setSuccessMsg(data.message || 'Driver profile created successfully.');
      setShowAddModal(false);
      setAddForm({
        first_name: '',
        surname: '',
        phone: '',
        email: '',
        password: '',
        id_number: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        license_type: 'Code 8 PDP',
        fleet_owner_id: '',
        status: 'looking_for_vehicle'
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openEditModal = (driverItem: any) => {
    setEditingDriver(driverItem);
    setEditForm({
      first_name: driverItem.first_name || '',
      surname: driverItem.surname || '',
      phone: driverItem.phone || driverItem.user_phone || '',
      email: driverItem.email || driverItem.user_email || '',
      id_number: driverItem.id_number || '',
      city: driverItem.city || '',
      province: driverItem.province || '',
      license_type: driverItem.license_type || 'Code 8 PDP',
      status: driverItem.status || 'looking_for_vehicle',
      fleet_owner_id: driverItem.fleet_owner_id || '',
      bio: driverItem.bio || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setSubmittingEdit(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/drivers/${editingDriver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update driver');

      setSuccessMsg('Driver profile updated successfully.');
      setEditingDriver(null);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningDriver) return;
    setSubmittingReassign(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/drivers/${reassigningDriver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fleet_owner_id: reassignOwnerId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reassign driver');

      setSuccessMsg('Driver reassigned successfully.');
      setReassigningDriver(null);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingReassign(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDriver) return;
    setSubmittingDelete(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/drivers/${deletingDriver.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete driver');

      setSuccessMsg('Driver profile deleted.');
      setDeletingDriver(null);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const filtered = drivers.filter(d => {
    const q = (searchQuery || '').toLowerCase().trim();
    
    // Status filter
    if (statusFilter !== 'all' && d.status !== statusFilter) {
      return false;
    }
    // Province filter
    if (provinceFilter !== 'all' && (d.province || '').toLowerCase() !== provinceFilter.toLowerCase()) {
      return false;
    }
    // License filter
    if (licenseFilter !== 'all' && !(d.license_type || '').toLowerCase().includes(licenseFilter.toLowerCase())) {
      return false;
    }

    if (!q) return true;

    const fullName = `${d.first_name || ''} ${d.surname || ''}`.toLowerCase();
    const email = (d.email || d.user_email || '').toLowerCase();
    const phone = (d.phone || d.user_phone || '').toLowerCase();
    const idNumber = (d.id_number || '').toLowerCase();
    const license = (d.license_type || '').toLowerCase();
    const city = (d.city || '').toLowerCase();
    const province = (d.province || '').toLowerCase();
    const owner = (d.fleet_owner_name || '').toLowerCase();
    const status = (d.status || '').toLowerCase();
    const id = (d.id || '').toLowerCase();

    return fullName.includes(q) ||
           email.includes(q) ||
           phone.includes(q) ||
           idNumber.includes(q) ||
           license.includes(q) ||
           city.includes(q) ||
           province.includes(q) ||
           owner.includes(q) ||
           status.includes(q) ||
           id.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Driver Search Gateway Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Quick Driver Search Gateway & Directory</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Unrestricted administrator lookup across the nationwide commercial driver database. Search by name, SA ID, license, contact, or assigned operator.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Driver</span>
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

      {/* Unrestricted Search & Quick Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Unrestricted search: type name, SA ID number, phone, email, license code, city, or fleet operator..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Status:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Status ({drivers.length})
          </button>
          <button
            onClick={() => setStatusFilter('looking_for_vehicle')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              statusFilter === 'looking_for_vehicle' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Looking for Vehicle ({drivers.filter(d => d.status === 'looking_for_vehicle').length})
          </button>
          <button
            onClick={() => setStatusFilter('employed')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              statusFilter === 'employed' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Employed ({drivers.filter(d => d.status === 'employed').length})
          </button>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2 mr-1">Province:</span>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs outline-none"
          >
            <option value="all">All Provinces</option>
            <option value="gauteng">Gauteng</option>
            <option value="western cape">Western Cape</option>
            <option value="kwazulu-natal">KwaZulu-Natal</option>
            <option value="eastern cape">Eastern Cape</option>
            <option value="free state">Free State</option>
          </select>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2 mr-1">License:</span>
          <select
            value={licenseFilter}
            onChange={(e) => setLicenseFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs outline-none"
          >
            <option value="all">All Licenses</option>
            <option value="code 8">Code 8 (PDP)</option>
            <option value="code 10">Code 10 (PDP)</option>
            <option value="code 14">Code 14 (Heavy)</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading driver directory...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Driver Profiles Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Try clearing search filters or searching with a different term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((driver) => (
            <div key={driver.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{driver.first_name} {driver.surname}</h3>
                    <div className="text-xs text-blue-600 font-semibold">{driver.license_type || 'Code 8 PDP'}</div>
                    {driver.id_number && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        SA ID: <span className="font-bold text-slate-800">{driver.id_number}</span>
                      </div>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    driver.status === 'employed'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {driver.status === 'employed' ? 'Employed' : 'Looking for Vehicle'}
                  </span>
                </div>

                {/* Assigned Fleet Owner */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Fleet Owner:</span>
                  {driver.fleet_owner_name ? (
                    <div className="font-bold text-slate-900 flex items-center space-x-1">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      <span>{driver.fleet_owner_name}</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">Unassigned (Independent)</div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{driver.phone || driver.user_phone || 'N/A'}</span>
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
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(driver)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    setReassigningDriver(driver);
                    setReassignOwnerId(driver.fleet_owner_id || '');
                  }}
                  className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Reassign Fleet Owner"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Reassign</span>
                </button>
                <button
                  onClick={() => setDeletingDriver(driver)}
                  className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  title="Delete driver profile"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Add Driver Profile</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Fleet Owner</label>
                  <select
                    value={addForm.fleet_owner_id}
                    onChange={(e) => setAddForm({ ...addForm, fleet_owner_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">-- None (Independent) --</option>
                    {fleetOwners.map(fo => (
                      <option key={fo.profile?.id || fo.user?.id} value={fo.profile?.id || fo.user?.id}>
                        {fo.profile?.company_name || fo.user?.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {submittingAdd ? 'Creating...' : 'Create Driver'}
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
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Edit Driver Details</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Surname</label>
                  <input
                    type="text"
                    value={editForm.surname}
                    onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="looking_for_vehicle">Looking for Vehicle</option>
                    <option value="employed">Employed</option>
                    <option value="not_available">Not Available</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Fleet Owner</label>
                  <select
                    value={editForm.fleet_owner_id}
                    onChange={(e) => setEditForm({ ...editForm, fleet_owner_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">-- None (Unassigned) --</option>
                    {fleetOwners.map(fo => (
                      <option key={fo.profile?.id || fo.user?.id} value={fo.profile?.id || fo.user?.id}>
                        {fo.profile?.company_name || fo.user?.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
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

      {/* Quick Reassign Modal */}
      {reassigningDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reassign Fleet Owner</h3>
            <p className="text-xs text-slate-600">
              Assign or change the Fleet Owner for <strong>{reassigningDriver.first_name} {reassigningDriver.surname}</strong>.
            </p>

            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Target Fleet Owner</label>
                <select
                  value={reassignOwnerId}
                  onChange={(e) => setReassignOwnerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- None (Unassign) --</option>
                  {fleetOwners.map(fo => (
                    <option key={fo.profile?.id || fo.user?.id} value={fo.profile?.id || fo.user?.id}>
                      {fo.profile?.company_name || fo.user?.name} ({fo.user?.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassigningDriver(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReassign}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
                >
                  {submittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Driver Modal */}
      {deletingDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Driver Account?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete driver <strong>{deletingDriver.first_name} {deletingDriver.surname}</strong>? This action will permanently remove their profile and user account.
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
                disabled={submittingDelete}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
              >
                {submittingDelete ? 'Deleting...' : 'Delete Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
