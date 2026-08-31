import React from 'react';
import { X, ShieldCheck, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface DriverDocumentsReviewModalProps {
  driverId: string;
  driverName: string;
  token: string;
  onClose: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  license: "Driver's Licence",
  prdp: 'Professional Driving Permit (PrDP)',
  id_doc: 'South African ID Document',
  passport: 'Passport / ID Document',
  platform_profile: 'Screenshot of Platform Profile',
  safety_clearance: 'Safety Check (Police Clearance)',
  proof_of_address: 'Proof of Address',
  other: 'Other Supporting Document'
};

export default function DriverDocumentsReviewModal({
  driverId,
  driverName,
  token,
  onClose
}: DriverDocumentsReviewModalProps) {
  const [docs, setDocs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [actingId, setActingId] = React.useState<string | null>(null);

  const loadDocs = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/drivers/${driverId}/verification-docs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load driver documents');
      setDocs(data.documents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [driverId, token]);

  React.useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleModerate = async (documentId: string, action: 'approve' | 'reject') => {
    setActingId(documentId);
    setError('');
    try {
      let rejected_reason: string | undefined;
      if (action === 'reject') {
        const promptResult = prompt('Reason for rejection:');
        if (promptResult === null) {
          setActingId(null);
          return;
        }
        rejected_reason = promptResult || 'Did not meet verification standards.';
      }
      const res = await fetch('/api/admin/moderate-driver-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ document_id: documentId, action, rejected_reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to moderate document');
      await loadDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative my-8">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-stone-100 text-stone-800 border border-stone-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight text-slate-900">Verification Documents</h3>
              <p className="text-xs text-slate-500 font-medium">{driverName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">{error}</div>
        )}

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading documents...
          </div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            No verification documents uploaded by this driver yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {docs.map(doc => (
              <div key={doc.id} className="p-3.5 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Filename: {doc.file_name} • Uploaded: {new Date(doc.uploaded_at).toISOString().split('T')[0]}</div>
                  {doc.status === 'rejected' && doc.rejected_reason && (
                    <div className="text-[10px] text-red-600 font-semibold">Reason: {doc.rejected_reason}</div>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {doc.status === 'pending' ? (
                    <>
                      <button
                        disabled={actingId === doc.id}
                        onClick={() => handleModerate(doc.id, 'reject')}
                        className="px-2.5 py-1.5 border border-slate-200 text-red-600 rounded-lg font-bold text-[10px] hover:bg-red-50 transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                      <button
                        disabled={actingId === doc.id}
                        onClick={() => handleModerate(doc.id, 'approve')}
                        className="px-2.5 py-1.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Approve</span>
                      </button>
                    </>
                  ) : (
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${
                      doc.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {doc.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
