import React, { useState, useEffect, useCallback } from 'react';
import { Car, Plus, Edit3, Trash2, RefreshCw, CheckCircle2, Clock, XCircle, X, Upload } from 'lucide-react';
import { compressImageFile } from '../../utils/imageCompressor';

interface VehicleListingsModuleProps {
  token: string;
}

const emptyForm = {
  car_type: '',
  category: 'Comfort' as 'Comfort' | 'Go' | 'X',
  platforms: ['Uber'] as string[],
  weekly_target: '',
  deposit: '',
  description: ''
};

export default function VehicleListingsModule({ token }: VehicleListingsModuleProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<any | null>(null);
  const [photoCompressing, setPhotoCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [deletingListing, setDeletingListing] = useState<any | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/fleet-owner/vehicle-listings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch your vehicle listings.');
      setListings(data.listings || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading vehicle listings.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const openAddModal = () => {
    setEditingListing(null);
    setForm(emptyForm);
    setPhoto(null);
    setShowModal(true);
  };

  const openEditModal = (listing: any) => {
    setEditingListing(listing);
    setForm({
      car_type: listing.car_type || '',
      category: listing.category || 'Comfort',
      platforms: listing.platforms || ['Uber'],
      weekly_target: String(listing.weekly_target || ''),
      deposit: String(listing.deposit || ''),
      description: listing.description || ''
    });
    setPhoto(listing.photos?.[0] ? { fileName: listing.photos[0].file_name, fileType: listing.photos[0].file_type, base64: listing.photos[0].file_data } : null);
    setShowModal(true);
  };

  const togglePlatform = (plat: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(plat) ? prev.platforms.filter(p => p !== plat) : [...prev.platforms, plat]
    }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhoto(null);
      return;
    }
    setPhotoCompressing(true);
    try {
      const res = await compressImageFile(file, 150 * 1024);
      setPhoto(res);
    } catch (err: any) {
      setErrorMsg('Failed to process photo: ' + err.message);
    } finally {
      setPhotoCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.car_type || !form.weekly_target) {
      setErrorMsg('Car type and weekly target are required.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      car_type: form.car_type,
      category: form.category,
      platforms: form.platforms,
      weekly_target: Number(form.weekly_target) || 0,
      deposit: Number(form.deposit) || 0,
      description: form.description,
      photos: photo ? [{ file_name: photo.fileName, file_type: photo.fileType, file_data: photo.base64 }] : []
    };

    try {
      const res = await fetch(
        editingListing ? `/api/fleet-owner/vehicle-listings/${editingListing.id}` : '/api/fleet-owner/vehicle-listings',
        {
          method: editingListing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save vehicle listing.');

      setSuccessMsg(editingListing ? 'Listing updated and re-queued for admin review.' : 'Listing submitted successfully and queued for admin review.');
      setShowModal(false);
      fetchListings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (listing: any) => {
    setErrorMsg('');
    try {
      const nextStatus = listing.status === 'unavailable' ? 'available' : 'unavailable';
      const res = await fetch(`/api/fleet-owner/vehicle-listings/${listing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update availability.');
      fetchListings();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingListing) return;
    setSubmittingDelete(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/fleet-owner/vehicle-listings/${deletingListing.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove listing.');
      setSuccessMsg('Vehicle listing removed.');
      setDeletingListing(null);
      fetchListings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900">My Vehicle Listings</h2>
          <p className="text-stone-500 text-xs mt-0.5">Advertise vehicles available for hire. Listings are reviewed by an administrator before appearing in the public Vehicle Marketplace.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Listing</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">{successMsg}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-stone-400 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading your listings...
        </div>
      ) : listings.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center space-y-3">
          <Car className="h-10 w-10 text-stone-300 mx-auto" />
          <h3 className="text-sm font-bold text-stone-800">No Vehicle Listings Yet</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">Add your first vehicle to advertise it to drivers on the marketplace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
              {listing.photos?.[0] ? (
                <img src={listing.photos[0].file_data} alt={listing.car_type} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-stone-100 flex items-center justify-center">
                  <Car className="h-8 w-8 text-stone-300" />
                </div>
              )}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-stone-900 text-sm">{listing.car_type}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">{listing.category}</span>
                  </div>
                  <div className="text-xs text-stone-600">R{listing.weekly_target?.toLocaleString()}/week • R{listing.deposit?.toLocaleString()} deposit</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${
                      listing.review_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      listing.review_status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {listing.review_status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : listing.review_status === 'rejected' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {listing.review_status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      listing.status === 'unavailable' ? 'bg-stone-100 text-stone-500 border-stone-200' : 'bg-stone-900 text-white border-stone-900'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                  {listing.review_status === 'rejected' && listing.rejected_reason && (
                    <p className="text-[10px] text-red-600 font-semibold">Reason: {listing.rejected_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => openEditModal(listing)}
                    className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleToggleAvailability(listing)}
                    className="py-1.5 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    title={listing.status === 'unavailable' ? 'Mark available' : 'Mark unavailable'}
                  >
                    {listing.status === 'unavailable' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setDeletingListing(listing)}
                    className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex justify-between items-start border-b border-stone-100 pb-4">
              <h3 className="font-extrabold text-base text-stone-900">{editingListing ? 'Edit Vehicle Listing' : 'Add Vehicle Listing'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Type of Car *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toyota Corolla Quest"
                  value={form.car_type}
                  onChange={e => setForm({ ...form, car_type: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value as any })}
                    className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl bg-white min-h-[44px]"
                  >
                    <option value="Comfort">Comfort</option>
                    <option value="Go">Go</option>
                    <option value="X">X</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Weekly Target (R) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.weekly_target}
                    onChange={e => setForm({ ...form, weekly_target: e.target.value })}
                    className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Deposit (R)</label>
                <input
                  type="number"
                  min="0"
                  value={form.deposit}
                  onChange={e => setForm({ ...form, deposit: e.target.value })}
                  className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {['Uber', 'Bolt', 'inDrive', 'DiDi'].map(plat => (
                    <label key={plat} className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        checked={form.platforms.includes(plat)}
                        onChange={() => togglePlatform(plat)}
                        className="rounded-sm border-stone-300 text-stone-900 focus:ring-stone-500 h-3.5 w-3.5"
                      />
                      <span>{plat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Vehicle condition, mileage, terms..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 border border-stone-200 rounded-xl min-h-[44px] flex items-center"
                />
                {photoCompressing && <p className="text-[10px] text-stone-400">Compressing image...</p>}
                {photo && <p className="text-[10px] text-emerald-600 font-semibold">Attached: {photo.fileName}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
              >
                {submitting ? 'Saving...' : editingListing ? 'Save Changes' : 'Submit Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingListing && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-stone-900 text-sm">Remove this listing?</h3>
            <p className="text-xs text-stone-500">{deletingListing.car_type} will be permanently removed from the marketplace.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingListing(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={submittingDelete}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:bg-red-300"
              >
                {submittingDelete ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
