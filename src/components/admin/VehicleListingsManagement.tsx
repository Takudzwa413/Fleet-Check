import React, { useState, useEffect, useCallback } from 'react';
import { Car, RefreshCw, CheckCircle2, XCircle, Wallet, Banknote, Tag } from 'lucide-react';

interface VehicleListingsManagementProps {
  token: string;
}

export default function VehicleListingsManagement({ token }: VehicleListingsManagementProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/admin/vehicle-listings${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch vehicle listings');
      setListings(data.listings || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading vehicle listings');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleModerate = async (listingId: string, action: 'approve' | 'reject') => {
    setActingId(listingId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let rejected_reason: string | undefined;
      if (action === 'reject') {
        const promptResult = prompt('Reason for rejection:');
        if (promptResult === null) {
          setActingId(null);
          return;
        }
        rejected_reason = promptResult || 'Did not meet marketplace standards.';
      }
      const res = await fetch('/api/admin/moderate-vehicle-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ listing_id: listingId, action, rejected_reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to moderate listing');
      setSuccessMsg(data.message);
      fetchListings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-black text-slate-900">Vehicle Marketplace Listings Queue</h3>
          <p className="text-slate-400 text-xs">Review fleet-owner submitted vehicle listings before they appear in the public marketplace.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">{successMsg}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading vehicle listings...</span>
        </div>
      ) : listings.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
          No {statusFilter !== 'all' ? statusFilter : ''} vehicle listings found.
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3">
                  {listing.photos?.[0] ? (
                    <img src={listing.photos[0].file_data} alt={listing.car_type} className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                      <Car className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 text-base">{listing.car_type}</h4>
                    <div className="text-xs text-slate-500 font-medium">{listing.fleet_owner_company} • {listing.category}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-slate-400" /> R{listing.weekly_target?.toLocaleString()}/wk</span>
                      <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5 text-slate-400" /> R{listing.deposit?.toLocaleString()} deposit</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(listing.platforms || []).map((p: string) => (
                        <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-lg border shrink-0 ${
                  listing.review_status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  listing.review_status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {listing.review_status}
                </span>
              </div>

              {listing.description && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{listing.description}</p>
              )}

              {listing.review_status === 'rejected' && listing.rejected_reason && (
                <p className="text-xs text-red-600 font-semibold">Rejection reason: {listing.rejected_reason}</p>
              )}

              {listing.review_status === 'pending' && (
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    disabled={actingId === listing.id}
                    onClick={() => handleModerate(listing.id, 'reject')}
                    className="px-3.5 py-1.5 border border-slate-200 text-red-600 rounded-xl font-bold text-xs hover:bg-red-50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject Listing</span>
                  </button>
                  <button
                    disabled={actingId === listing.id}
                    onClick={() => handleModerate(listing.id, 'approve')}
                    className="px-4 py-1.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve & Publish</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
