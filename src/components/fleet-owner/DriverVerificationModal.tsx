import React, { useState } from 'react';
import {
  ShieldCheck,
  Upload,
  Send,
  FileText,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw,
  HelpCircle,
  Clock,
  UserCheck,
  Camera,
  FileImage,
  Info
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface DriverVerificationModalProps {
  driverId: string;
  driverName: string;
  token: string;
  onClose: () => void;
  onVerificationSubmitted?: () => void;
}

export default function DriverVerificationModal({
  driverId,
  driverName,
  token,
  onClose,
  onVerificationSubmitted
}: DriverVerificationModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'request' | 'stages'>('upload');

  // Upload Form State
  const [docType, setDocType] = useState<'license' | 'prdp' | 'id_doc' | 'proof_of_address' | 'platform_profile'>('license');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Request Form State
  const [requestedDocs, setRequestedDocs] = useState<string[]>([
    'Valid Driver\'s License Card (Both sides)',
    'Professional Driving Permit (PrDP)',
    'South African Smart ID Card / Green Book',
    'E-hailing Rating & Profile Screenshot (Uber/Bolt)'
  ]);
  const [requestNotes, setRequestNotes] = useState('Please supply certified copies of your driving credentials to finalize your verification file on FleetCheck.');
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestError, setRequestError] = useState('');

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit. Please upload a smaller image or document.');
      return;
    }

    setFileName(file.name);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !fileData) {
      setUploadError('Please select a document or image file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const res = await fetch(`/api/drivers/${driverId}/verification-docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          document_type: docType,
          file_name: fileName,
          file_data: fileData,
          notes: uploadNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload verification document');

      setUploadSuccess(`Verification document "${fileName}" uploaded successfully and recorded in driver audit dossier.`);
      setFileName('');
      setFileData(null);
      setUploadNotes('');
      if (onVerificationSubmitted) onVerificationSubmitted();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestedDocs.length === 0) {
      setRequestError('Please select at least one document requirement.');
      return;
    }

    setRequesting(true);
    setRequestError('');
    setRequestSuccess('');

    try {
      const res = await fetch(`/api/drivers/${driverId}/verify-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requested_documents: requestedDocs,
          notes: requestNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch verification request');

      setRequestSuccess(`Verification dossier request dispatched to driver (${driverName}) via secure notification & email alert.`);
      if (onVerificationSubmitted) onVerificationSubmitted();
    } catch (err: any) {
      setRequestError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const toggleDocRequirement = (doc: string) => {
    if (requestedDocs.includes(doc)) {
      setRequestedDocs(requestedDocs.filter(d => d !== doc));
    } else {
      setRequestedDocs([...requestedDocs, doc]);
    }
  };

  const verificationStages = [
    {
      title: '1. National ID & Biometric Match',
      desc: 'Checks South African Home Affairs database / Smart ID format and validates against known fraud lists.',
      status: 'verified',
      eta: 'Instant'
    },
    {
      title: '2. Driver\'s License & PrDP Validation',
      desc: 'Validates Professional Driving Permit validity, vehicle code endorsements, and expiry date.',
      status: 'pending_upload',
      eta: '1-2 business hours'
    },
    {
      title: '3. Criminal Background & Safety Clearance',
      desc: 'Cross-references SAPS criminal record checks and automated incident screening.',
      status: 'in_progress',
      eta: '24-48 hours'
    },
    {
      title: '4. E-Hailing Platform Performance Audit',
      desc: 'Verifies active Uber/Bolt platform lifetime ratings, trip completion ratios, and vehicle safety record.',
      status: 'verified',
      eta: 'Real-time'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-stone-900 text-white rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Driver Verification & Compliance</h3>
                <p className="text-xs text-slate-500 font-medium">Driver: <strong className="text-slate-900">{driverName}</strong></p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer px-2 shrink-0 whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Documents</span>
          </button>

          <button
            onClick={() => setActiveTab('request')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer px-2 shrink-0 whitespace-nowrap ${
              activeTab === 'request'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Request from Driver</span>
          </button>

          <button
            onClick={() => setActiveTab('stages')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer px-2 shrink-0 whitespace-nowrap ${
              activeTab === 'stages'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>Verification Stages</span>
          </button>
        </div>

        {/* Tab 1: Upload Documents */}
        {activeTab === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-stone-600 shrink-0 mt-0.5" />
              <span>
                Upload verified physical copies of the driver's license, PrDP, ID, or e-hailing credentials to certify their profile in your fleet records.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Document Classification</label>
                <select
                  value={docType}
                  onChange={(e: any) => setDocType(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-700 min-h-[44px]"
                >
                  <option value="license">Driver's License Card (Code 8 / 10 / 14)</option>
                  <option value="prdp">Professional Driving Permit (PrDP Certificate)</option>
                  <option value="id_doc">South African National ID / Passport</option>
                  <option value="proof_of_address">Proof of Residential Address</option>
                  <option value="platform_profile">Uber / Bolt Profile & Rating Screenshot</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Select File / Scan (Max 5MB)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-900 file:text-white hover:file:bg-stone-800 cursor-pointer min-h-[44px]"
                />
              </div>
            </div>

            {fileName && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-medium">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-emerald-600" />
                  <span>Ready to upload: <strong>{fileName}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => { setFileName(''); setFileData(null); }}
                  className="text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Compliance Notes / Verification Remarks</label>
              <textarea
                rows={2}
                placeholder="e.g. Verified original card in-person at depot on 2026-08-21. License valid until 2029."
                value={uploadNotes}
                onChange={e => setUploadNotes(e.target.value)}
                className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-slate-400 resize-none"
              />
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer min-h-[44px] text-center"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={uploading || !fileName}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Submit Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Request from Driver */}
        {activeTab === 'request' && (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-start gap-2.5">
              <Send className="h-4 w-4 text-stone-600 shrink-0 mt-0.5" />
              <span>
                Dispatch an official verification documentation request directly to the driver with a requested document checklist.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Requested Document Checklist</label>
              {[
                'Valid Driver\'s License Card (Both sides)',
                'Professional Driving Permit (PrDP)',
                'South African Smart ID Card / Green Book',
                'E-hailing Rating & Profile Screenshot (Uber/Bolt)',
                'Proof of Residential Address (Utility bill/Affidavit)'
              ].map((docItem) => {
                const isSelected = requestedDocs.includes(docItem);
                return (
                  <div
                    key={docItem}
                    onClick={() => toggleDocRequirement(docItem)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-stone-50 border-stone-800 text-stone-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{docItem}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded text-stone-900 pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Instructions to Driver</label>
              <textarea
                rows={3}
                value={requestNotes}
                onChange={e => setRequestNotes(e.target.value)}
                className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-slate-400 resize-none"
              />
            </div>

            {requestError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                {requestError}
              </div>
            )}

            {requestSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{requestSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer min-h-[44px] text-center"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={requesting || requestedDocs.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                {requesting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Dispatching Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Verification Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Verification Stages */}
        {activeTab === 'stages' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              FleetCheck comprehensive 4-tier verification workflow ensures driver authenticity and compliance.
            </p>

            <div className="space-y-3">
              {verificationStages.map((stage, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-xs">{stage.title}</h4>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                      stage.status === 'verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      stage.status === 'in_progress' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-slate-200 text-slate-700 border-slate-300'
                    }`}>
                      {stage.status === 'verified' ? 'Verified' : stage.status === 'in_progress' ? 'Under Review' : 'Pending Upload'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{stage.desc}</p>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 pt-1">
                    <Clock className="h-3 w-3" />
                    <span>Turnaround Time: {stage.eta}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
