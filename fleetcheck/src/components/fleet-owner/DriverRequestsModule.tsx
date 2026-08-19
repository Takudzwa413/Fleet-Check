import React from 'react';
import { UserCheck, RefreshCw, ShieldCheck, Clock, XCircle, CheckCircle } from 'lucide-react';
import { DriverLinkRequest } from '../../types';

interface DriverRequestsModuleProps {
  token: string;
}

export default function DriverRequestsModule({
  token
}: DriverRequestsModuleProps) {
  const [driverRequests, setDriverRequests] = React.useState<DriverLinkRequest[]>([]);
  const [driverRequestsLoading, setDriverRequestsLoading] = React.useState(false);
  const [respondingReqId, setRespondingReqId] = React.useState<string | null>(null);

  const loadDriverRequests = async () => {
    setDriverRequestsLoading(true);
    try {
      const res = await fetch('/api/owner/driver-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setDriverRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading driver requests:', err);
    } finally {
      setDriverRequestsLoading(false);
    }
  };

  React.useEffect(() => {
    loadDriverRequests();
  }, []);

  const handleRespondDriverRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setRespondingReqId(requestId);
    try {
      const res = await fetch('/api/owner/respond-driver-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ request_id: requestId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to respond to request');

      loadDriverRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to process request');
    } finally {
      setRespondingReqId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-stone-800" />
            <span>Driver Link & Employment Approval Requests</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Drivers who assign you as their Fleet Owner in their profiles will appear here. Approve requests to verify your association or decline invalid requests.
          </p>
        </div>
        <button
          onClick={loadDriverRequests}
          className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl flex items-center space-x-1 min-h-[40px] cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${driverRequestsLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {driverRequestsLoading ? (
        <div className="py-12 text-center text-slate-500 text-xs space-y-2">
          <RefreshCw className="h-6 w-6 text-stone-700 animate-spin mx-auto" />
          <p>Loading driver requests...</p>
        </div>
      ) : driverRequests.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <UserCheck className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Driver Link Requests</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            No drivers have sent assignment requests to your fleet profile yet. Drivers can search for your profile by name, company, or email to link you as their Fleet Owner.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driverRequests.map((req) => (
              <div key={req.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900 text-sm sm:text-base">{req.driver_name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {req.driver_email} | {req.driver_phone}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Requested on: {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase flex items-center space-x-1 ${
                    req.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : req.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {req.status === 'approved' ? (
                      <>
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>Approved</span>
                      </>
                    ) : req.status === 'pending' ? (
                      <>
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span>Pending Review</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 text-red-600" />
                        <span>Declined</span>
                      </>
                    )}
                  </span>
                </div>

                {req.status === 'pending' && (
                  <div className="pt-3 border-t border-slate-200/80 flex justify-end space-x-2">
                    <button
                      type="button"
                      disabled={respondingReqId === req.id}
                      onClick={() => handleRespondDriverRequest(req.id, 'reject')}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Decline Request
                    </button>
                    <button
                      type="button"
                      disabled={respondingReqId === req.id}
                      onClick={() => handleRespondDriverRequest(req.id, 'approve')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Approve & Verify Link</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
