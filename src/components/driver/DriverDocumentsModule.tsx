import React from 'react';
import { Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { compressImageFile } from '../../utils/imageCompressor';

interface DriverDocumentsModuleProps {
  token: string;
  driverProfileId: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  license: "Driver's Licence",
  prdp: 'Professional Driving Permit (PrDP)',
  id_doc: 'South African ID Document',
  passport: 'Passport / ID Document',
  platform_profile: 'Screenshot of Platform Profile (Uber/Bolt)',
  safety_clearance: 'Safety Check (Police Clearance / PDP Safety Certificate)',
  proof_of_address: 'Proof of Address',
  other: 'Other Supporting Document'
};

export default function DriverDocumentsModule({
  token,
  driverProfileId
}: DriverDocumentsModuleProps) {
  const [docUploadType, setDocUploadType] = React.useState('license');
  const [docUploadFile, setDocUploadFile] = React.useState<any | null>(null);
  const [docCompressing, setDocCompressing] = React.useState(false);
  const [docUploadLoading, setDocUploadLoading] = React.useState(false);
  const [docError, setDocError] = React.useState('');
  const [uploadedDocs, setUploadedDocs] = React.useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = React.useState(false);

  const loadDocuments = React.useCallback(async () => {
    if (!driverProfileId) return;
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/drivers/${driverProfileId}/verification-docs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUploadedDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load driver verification documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [token, driverProfileId]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setDocUploadFile(null);
      return;
    }
    setDocCompressing(true);
    setDocError('');
    try {
      const result = await compressImageFile(file, 150 * 1024);
      setDocUploadFile(result);
    } catch (err: any) {
      setDocError('Failed to process/compress file: ' + err.message);
    } finally {
      setDocCompressing(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadFile) {
      setDocError('Please select a document or image file to upload.');
      return;
    }
    setDocError('');
    setDocUploadLoading(true);
    try {
      const res = await fetch(`/api/drivers/${driverProfileId}/verification-docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          document_type: docUploadType,
          file_name: docUploadFile.fileName,
          file_data: docUploadFile.base64
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');
      setDocUploadFile(null);
      loadDocuments();
    } catch (err: any) {
      setDocError(err.message);
    } finally {
      setDocUploadLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start w-full">
      {/* Uploader */}
      <div className="md:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-xs">
        <h3 className="font-black text-stone-900 text-sm">Upload Verification Document</h3>
        <p className="text-stone-400 text-xs">Your licence, passport, platform profile, and safety-check documents are reviewed by an administrator before your profile is marked verified.</p>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Document Type</label>
            <select
              value={docUploadType}
              onChange={e => setDocUploadType(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 min-h-[44px]"
            >
              <option value="license">Driver's Licence</option>
              <option value="prdp">Professional Driving Permit (PrDP)</option>
              <option value="id_doc">South African ID Document</option>
              <option value="passport">Passport / ID Document</option>
              <option value="platform_profile">Screenshot of Platform Profile (Uber/Bolt)</option>
              <option value="safety_clearance">Safety Check (Police Clearance / PDP Safety Certificate)</option>
              <option value="proof_of_address">Proof of Address</option>
              <option value="other">Other Supporting Document</option>
            </select>
          </div>

          <div className="p-4 border border-dashed border-stone-200 hover:border-stone-400 rounded-xl space-y-2 bg-stone-50/50 transition-all text-center">
            <input
              type="file"
              id="driver-doc-file-input"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="driver-doc-file-input" className="cursor-pointer block space-y-1">
              <Upload className="h-6 w-6 text-stone-700 mx-auto" />
              <span className="text-xs font-bold text-stone-700 block">Click or drag a photo / document file here</span>
              <span className="text-[10px] text-stone-400 block">PNG, JPG, JPEG, or PDF • Images compressed to &le;150KB</span>
            </label>
            {docCompressing && (
              <div className="text-[10px] text-stone-600 font-bold flex items-center justify-center space-x-1.5 pt-1">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Compressing image file to &le;150KB...</span>
              </div>
            )}
            {docUploadFile && !docCompressing && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-bold flex items-center justify-between text-left mt-2">
                <div className="truncate pr-2">
                  <p className="truncate font-bold">{docUploadFile.fileName}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    {docUploadFile.compressed ? `Compressed: ${docUploadFile.originalSizeKb} KB → ${docUploadFile.sizeKb} KB` : `Size: ${docUploadFile.sizeKb} KB`}
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded shrink-0">Ready</span>
              </div>
            )}
          </div>

          {docError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
              {docError}
            </div>
          )}

          <button
            type="submit"
            disabled={docUploadLoading}
            className="w-full py-2.5 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            {docUploadLoading ? 'Uploading...' : 'Submit Document'}
          </button>
        </form>
      </div>

      {/* List of uploaded documents status */}
      <div className="md:col-span-7 bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-stone-700" />
          <h3 className="font-black text-stone-900 text-sm">My Verification Documents</h3>
        </div>
        <p className="text-stone-400 text-xs">Track review status for each document you've submitted.</p>

        <div className="space-y-3">
          {loadingDocs ? (
            <p className="text-stone-400 text-xs text-center py-6">Loading documents...</p>
          ) : uploadedDocs.length === 0 ? (
            <p className="text-stone-400 text-xs text-center py-6">No verification documents uploaded yet.</p>
          ) : (
            uploadedDocs.map(doc => (
              <div key={doc.id} className="p-3.5 border border-stone-200 rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white shadow-2xs hover:border-stone-300 transition-all">
                <div className="space-y-1">
                  <div className="font-bold text-stone-900">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</div>
                  <div className="text-[10px] text-stone-400 font-medium">Filename: {doc.file_name} • Uploaded: {new Date(doc.uploaded_at).toISOString().split('T')[0]}</div>
                  {doc.status === 'rejected' && doc.rejected_reason && (
                    <div className="text-[10px] text-red-600 font-semibold">Reason: {doc.rejected_reason}</div>
                  )}
                </div>

                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider shrink-0 ${
                  doc.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  doc.status === 'pending' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                  'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {doc.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
