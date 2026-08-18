import React from 'react';
import { Upload, RefreshCw, Eye } from 'lucide-react';
import { compressImageFile } from '../../utils/imageCompressor';

interface VerificationFilesModuleProps {
  token: string;
  onPreviewDoc: (doc: any) => void;
}

export default function VerificationFilesModule({
  token,
  onPreviewDoc
}: VerificationFilesModuleProps) {
  const [docUploadType, setDocUploadType] = React.useState('proof_of_ownership');
  const [docUploadName, setDocUploadName] = React.useState('');
  const [docUploadFile, setDocUploadFile] = React.useState<any | null>(null);
  const [docCompressing, setDocCompressing] = React.useState(false);
  const [docUploadLoading, setDocUploadLoading] = React.useState(false);
  const [docError, setDocError] = React.useState('');
  const [uploadedDocs, setUploadedDocs] = React.useState<any[]>([]);

  const loadVerificationStatus = async () => {
    try {
      const res = await fetch('/api/verification/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.documents) {
        setUploadedDocs(data.documents);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    loadVerificationStatus();
  }, []);

  const handleComplianceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!docUploadName) {
        setDocUploadName(file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err: any) {
      setDocError('Failed to process/compress file: ' + err.message);
    } finally {
      setDocCompressing(false);
    }
  };

  const handleDocUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadFile) {
      setDocError('Please select a document or screenshot file to upload.');
      return;
    }
    setDocError('');
    setDocUploadLoading(true);
    try {
      const res = await fetch('/api/verification/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document_type: docUploadType,
          file_name: docUploadName ? `${docUploadName}.${docUploadFile.fileType === 'image/jpeg' ? 'jpg' : 'png'}` : docUploadFile.fileName,
          file_data: docUploadFile.base64
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');
      setDocUploadName('');
      setDocUploadFile(null);
      loadVerificationStatus();
    } catch (err: any) {
      setDocError(err.message);
    } finally {
      setDocUploadLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start max-w-4xl mx-auto">
      {/* Uploader */}
      <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
        <h3 className="font-black text-slate-900 text-sm">Upload Compliance Papers</h3>
        <p className="text-slate-400 text-xs">Upload your fleet ownership dashboard screenshots or operating permits.</p>

        <form onSubmit={handleDocUploadSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">File Type Category</label>
            <select
              value={docUploadType} onChange={e => setDocUploadType(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-stone-400 text-slate-800 min-h-[44px]"
            >
              <option value="proof_of_ownership">Fleet Ownership Screenshot (Uber/Bolt Fleet Portal)</option>
              <option value="other">Other Permitting / Supporting Documents</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Document Title reference</label>
            <input
              type="text" required placeholder="e.g. fleet_screenshot_july" value={docUploadName} onChange={e => setDocUploadName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
            />
          </div>

          <div className="p-4 border border-dashed border-slate-200 hover:border-stone-400 rounded-xl space-y-2 bg-slate-50/50 transition-all text-center">
            <input
              type="file"
              id="compliance-file-input"
              accept="image/*,.pdf"
              onChange={handleComplianceFileSelect}
              className="hidden"
            />
            <label htmlFor="compliance-file-input" className="cursor-pointer block space-y-1">
              <Upload className="h-6 w-6 text-stone-700 mx-auto" />
              <span className="text-xs font-bold text-slate-700 block">Click or drag screenshot / document file here</span>
              <span className="text-[10px] text-slate-400 block">PNG, JPG, JPEG, or PDF • Images compressed to &le;150KB</span>
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
                    {docUploadFile.compressed ? `Compressed: ${docUploadFile.originalSizeKb} KB → ${docUploadFile.sizeKb} KB (<=150KB limit met)` : `Size: ${docUploadFile.sizeKb} KB`}
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
            {docUploadLoading ? 'Filing...' : 'Submit Verification File'}
          </button>
        </form>
      </div>

      {/* List of uploaded documents status */}
      <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
        <h3 className="font-black text-slate-900 text-sm">Uploaded Compliance Filing Log</h3>
        <p className="text-slate-400 text-xs">Verify approval status, reviewed timestamps, and verification audit trails.</p>

        <div className="space-y-3">
          {uploadedDocs.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6">No compliance documents uploaded yet.</p>
          ) : (
            uploadedDocs.map(doc => (
              <div key={doc.id} className="p-3.5 border border-slate-200 rounded-xl space-y-2 text-xs flex justify-between items-center bg-white shadow-2xs hover:border-slate-300 transition-all">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 capitalize flex items-center space-x-2">
                    <span>{doc.document_type.replace('_', ' ')}</span>
                    {doc.file_data && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Real Image/Doc Data</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Filename: {doc.file_name} • Uploaded: {new Date(doc.uploaded_at).toISOString().split('T')[0]}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onPreviewDoc(doc)}
                    className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] rounded-lg flex items-center space-x-1 cursor-pointer transition-all min-h-[36px]"
                  >
                    <Eye className="h-3 w-3 text-stone-700" />
                    <span>View Doc</span>
                  </button>

                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${
                    doc.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    doc.status === 'pending' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                    'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
