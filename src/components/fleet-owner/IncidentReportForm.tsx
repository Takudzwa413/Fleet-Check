import React, { useState, useEffect } from 'react';
import { CheckCircle, Upload, RefreshCw, FileText, X, Save, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { compressImageFile } from '../../utils/imageCompressor';

interface IncidentReportFormProps {
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const STORAGE_KEY = 'fleetcheck_incident_form_draft';

export default function IncidentReportForm({
  token,
  onSuccess,
  onCancel
}: IncidentReportFormProps) {
  // Incident Form State
  const [drvFirstName, setDrvFirstName] = useState('');
  const [drvSurname, setDrvSurname] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [drvEmail, setDrvEmail] = useState('');
  const [drvIdNumber, setDrvIdNumber] = useState('');
  const [drvCity, setDrvCity] = useState('');
  const [drvProvince, setDrvProvince] = useState('');
  const [drvPlatform, setDrvPlatform] = useState('Uber');
  const [vehReg, setVehReg] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [handoverDate, setHandoverDate] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [compCategory, setCompCategory] = useState('vehicle_damage');
  const [compSeverity, setCompSeverity] = useState('medium');
  const [compDesc, setCompDesc] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<any[]>([]);
  const [evidenceCompressing, setEvidenceCompressing] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Draft persistence state
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        // Check if there is meaningful data in the draft
        const hasContent = parsed.drvFirstName || parsed.drvSurname || parsed.drvPhone || parsed.compDesc || parsed.vehReg;
        if (hasContent) {
          if (parsed.drvFirstName !== undefined) setDrvFirstName(parsed.drvFirstName);
          if (parsed.drvSurname !== undefined) setDrvSurname(parsed.drvSurname);
          if (parsed.drvPhone !== undefined) setDrvPhone(parsed.drvPhone);
          if (parsed.drvEmail !== undefined) setDrvEmail(parsed.drvEmail);
          if (parsed.drvIdNumber !== undefined) setDrvIdNumber(parsed.drvIdNumber);
          if (parsed.drvCity !== undefined) setDrvCity(parsed.drvCity);
          if (parsed.drvProvince !== undefined) setDrvProvince(parsed.drvProvince);
          if (parsed.drvPlatform !== undefined) setDrvPlatform(parsed.drvPlatform);
          if (parsed.vehReg !== undefined) setVehReg(parsed.vehReg);
          if (parsed.vehModel !== undefined) setVehModel(parsed.vehModel);
          if (parsed.handoverDate !== undefined) setHandoverDate(parsed.handoverDate);
          if (parsed.incidentDate !== undefined) setIncidentDate(parsed.incidentDate);
          if (parsed.compCategory !== undefined) setCompCategory(parsed.compCategory);
          if (parsed.compSeverity !== undefined) setCompSeverity(parsed.compSeverity);
          if (parsed.compDesc !== undefined) setCompDesc(parsed.compDesc);
          if (parsed.updatedAt) {
            const date = new Date(parsed.updatedAt);
            setLastSavedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
          setRestoredFromDraft(true);
        }
      }
    } catch (e) {
      console.warn('Could not restore incident report draft from localStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save changes to localStorage after initial mount
  useEffect(() => {
    if (!isLoaded) return;

    const hasData = drvFirstName || drvSurname || drvPhone || drvEmail || drvIdNumber || drvCity || drvProvince || vehReg || vehModel || handoverDate || incidentDate || compDesc;
    if (hasData) {
      const draftObj = {
        drvFirstName,
        drvSurname,
        drvPhone,
        drvEmail,
        drvIdNumber,
        drvCity,
        drvProvince,
        drvPlatform,
        vehReg,
        vehModel,
        handoverDate,
        incidentDate,
        compCategory,
        compSeverity,
        compDesc,
        updatedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftObj));
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        console.warn('Could not save draft to localStorage:', e);
      }
    }
  }, [
    drvFirstName,
    drvSurname,
    drvPhone,
    drvEmail,
    drvIdNumber,
    drvCity,
    drvProvince,
    drvPlatform,
    vehReg,
    vehModel,
    handoverDate,
    incidentDate,
    compCategory,
    compSeverity,
    compDesc,
    isLoaded
  ]);

  const handleClearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDrvFirstName('');
    setDrvSurname('');
    setDrvPhone('');
    setDrvEmail('');
    setDrvIdNumber('');
    setDrvCity('');
    setDrvProvince('');
    setDrvPlatform('Uber');
    setVehReg('');
    setVehModel('');
    setHandoverDate('');
    setIncidentDate('');
    setCompCategory('vehicle_damage');
    setCompSeverity('medium');
    setCompDesc('');
    setEvidenceFiles([]);
    setDeclaration(false);
    setRestoredFromDraft(false);
    setLastSavedTime(null);
  };

  const handleEvidenceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);
    setEvidenceCompressing(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i] as File;
        const result = await compressImageFile(file, 150 * 1024);
        setEvidenceFiles(prev => [...prev, {
          name: result.fileName,
          type: result.fileType,
          base64: result.base64,
          sizeKb: result.sizeKb,
          originalSizeKb: result.originalSizeKb,
          compressed: result.compressed
        }]);
      }
    } catch (err: any) {
      setSubmitError('Failed to compress evidence image: ' + err.message);
    } finally {
      setEvidenceCompressing(false);
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!drvFirstName || !drvSurname || !drvPhone || !compDesc) {
      setSubmitError('First Name, Surname, Phone, and Incident Description are required.');
      return;
    }

    if (!declaration) {
      setSubmitError('You must check the legal accuracy declaration before submitting.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/complaints/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          driver_first_name: drvFirstName,
          driver_surname: drvSurname,
          driver_phone: drvPhone,
          driver_email: drvEmail,
          driver_id_number: drvIdNumber,
          driver_city: drvCity,
          driver_province: drvProvince,
          driver_platform: drvPlatform,
          category: compCategory,
          severity: compSeverity,
          vehicle_registration: vehReg,
          vehicle_make_model: vehModel,
          handover_date: handoverDate,
          incident_date: incidentDate,
          description: compDesc,
          declaration_accepted: declaration,
          evidence_list: evidenceFiles.map(f => ({
            file_name: f.name,
            file_type: f.type,
            file_data: f.base64
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report.');

      // Clear localStorage draft on successful submission
      localStorage.removeItem(STORAGE_KEY);
      setRestoredFromDraft(false);
      setLastSavedTime(null);

      setSubmitSuccess(data.message);
      // Reset form
      setDrvFirstName(''); setDrvSurname(''); setDrvPhone(''); setDrvEmail(''); setDrvIdNumber('');
      setVehReg(''); setVehModel(''); setHandoverDate(''); setIncidentDate(''); setCompDesc('');
      setEvidenceFiles([]); setDeclaration(false);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900">File Incident Report</h3>
          <p className="text-slate-500 text-xs">
            File an objective, evidence-backed complaint for administrative review. Every claim requires physical validation documents.
          </p>
        </div>

        {lastSavedTime && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-50 border border-stone-200 rounded-full text-[11px] text-stone-600 font-medium">
            <Save className="h-3 w-3 text-stone-500" />
            <span>Draft saved locally at {lastSavedTime}</span>
          </div>
        )}
      </div>

      {/* Draft Restored Banner */}
      {restoredFromDraft && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Draft Restored:</strong> We automatically recovered your previously typed incident details so you don't lose any progress.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
            >
              Discard Draft
            </button>
            <button
              type="button"
              onClick={() => setRestoredFromDraft(false)}
              className="text-amber-600 hover:text-amber-900 p-1"
              title="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {submitSuccess ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center py-8">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
          <h4 className="font-black text-emerald-800 text-sm">Complaint Successfully Logged</h4>
          <p className="text-xs text-emerald-700 max-w-lg mx-auto leading-relaxed">{submitSuccess}</p>
          <button
            onClick={() => { setSubmitSuccess(''); onSuccess(); }}
            className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            Go to Complaints Log
          </button>
        </div>
      ) : (
        <form onSubmit={handleComplaintSubmit} className="space-y-6">
          {/* Part 1: Driver Identifiers */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">1. Driver Identity Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Driver First Name *</label>
                <input
                  type="text" required placeholder="e.g. Sipho" value={drvFirstName} onChange={e => setDrvFirstName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Driver Surname *</label>
                <input
                  type="text" required placeholder="e.g. Kumalo" value={drvSurname} onChange={e => setDrvSurname(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Driver Contact Phone *</label>
                <input
                  type="text" required placeholder="e.g. +27 83 111 2222" value={drvPhone} onChange={e => setDrvPhone(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Driver Email Address</label>
                <input
                  type="email" placeholder="e.g. driver@gmail.com" value={drvEmail} onChange={e => setDrvEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ID / Passport Number (Highly Recommended)</label>
                <input
                  type="text" placeholder="e.g. 910412..." value={drvIdNumber} onChange={e => setDrvIdNumber(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Active City / Suburb</label>
                <input
                  type="text" placeholder="e.g. Soweto" value={drvCity} onChange={e => setDrvCity(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Province</label>
                <input
                  type="text" placeholder="e.g. Gauteng" value={drvProvince} onChange={e => setDrvProvince(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Active E-hailing Platform</label>
                <select
                  value={drvPlatform} onChange={e => setDrvPlatform(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 min-h-[44px]"
                >
                  <option value="Uber">Uber</option>
                  <option value="Bolt">Bolt</option>
                  <option value="inDrive">inDrive</option>
                  <option value="DiDi">DiDi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Part 2: Vehicle & Handover Details */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">2. Vehicle & Agreement Timeline</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Registration Number</label>
                <input
                  type="text" placeholder="e.g. HV 82 XP GP" value={vehReg} onChange={e => setVehReg(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Vehicle Make/Model</label>
                <input
                  type="text" placeholder="e.g. Toyota Corolla 2021" value={vehModel} onChange={e => setVehModel(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Handover Date</label>
                <input
                  type="date" value={handoverDate} onChange={e => setHandoverDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Incident Occurred Date *</label>
                <input
                  type="date" required value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Part 3: Incident Details & Categories */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">3. Incident Categories & Facts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Incident Category *</label>
                <select
                  value={compCategory} onChange={e => setCompCategory(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 min-h-[44px]"
                >
                  <option value="vehicle_damage">Vehicle Damage</option>
                  <option value="vehicle_abandoned">Vehicle Abandoned</option>
                  <option value="unpaid_rental">Unpaid rental/Arrears</option>
                  <option value="accident">Accident / Collision</option>
                  <option value="reckless_driving">Reckless Driving</option>
                  <option value="poor_communication">Poor Communication / Unreachable</option>
                  <option value="breach_agreement">Breach of rental Agreement</option>
                  <option value="unauthorized_use">Unauthorized vehicle sub-letting</option>
                  <option value="fines_unpaid">Speeding tickets / Fines unpaid</option>
                  <option value="theft_fraud_suspicion">Theft or Fraud suspicion</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Severity Level *</label>
                <select
                  value={compSeverity} onChange={e => setCompSeverity(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 min-h-[44px]"
                >
                  <option value="low">Low (Minor fines or minor communication delays)</option>
                  <option value="medium">Medium (Arrears of R5k or minor repairable scratches)</option>
                  <option value="high">High (Abandonment, severe crash damage, severe arrears)</option>
                  <option value="critical">Critical (Grand theft auto, armed hijack fraud, severe legal liability)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Incident Fact Description *</label>
                <textarea
                  required
                  placeholder="Please enter a highly factual, chronological, and objective summary of the incident. Avoid emotional or defamatory words. State exact dates and unfulfilled actions."
                  value={compDesc}
                  onChange={e => setCompDesc(e.target.value)}
                  rows={4}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Verifiable Proof Files */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">4. Verifiable Proof Files</h4>
            <p className="text-[11px] text-slate-400 font-medium">Every incident must have supporting evidence (such as rental agreements, damage photos, unpaid bills, WhatsApp transcripts). Images are automatically compressed to &le;150KB.</p>
            
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="file"
                id="evidence-file-input"
                accept="image/*,.pdf"
                multiple
                onChange={handleEvidenceFileSelect}
                className="hidden"
              />
              <label
                htmlFor="evidence-file-input"
                className="flex items-center space-x-1.5 px-4 py-2 border border-dashed border-stone-300 hover:border-stone-500 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-all cursor-pointer bg-stone-50 min-h-[44px]"
              >
                <Upload className="h-4 w-4 text-stone-700" />
                <span>Attach Real Evidence / Screenshot</span>
              </label>
              {evidenceCompressing && (
                <div className="text-[10px] text-stone-600 font-bold flex items-center space-x-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing & compressing image files to &le;150KB...</span>
                </div>
              )}
            </div>

            {evidenceFiles.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attached Proof Files ({evidenceFiles.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {evidenceFiles.map((file, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate pr-2">
                        {file.type.startsWith('image/') && file.base64 ? (
                          <img src={file.base64} alt={file.name} className="h-8 w-8 object-cover rounded border border-slate-200 shrink-0" />
                        ) : (
                          <FileText className="h-6 w-6 text-slate-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">
                            {file.compressed ? `${file.originalSizeKb}KB → ${file.sizeKb}KB (<=150KB)` : `${file.sizeKb}KB`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEvidenceFiles(evidenceFiles.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800 p-1 font-bold text-[10px]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legal confirmation */}
          <div className="p-4 bg-slate-50/50 rounded-xl space-y-3 border border-slate-150">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={declaration}
                onChange={e => setDeclaration(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-stone-900 focus:ring-stone-400 h-4.5 w-4.5"
              />
              <span className="text-xs text-slate-600 leading-relaxed font-bold">
                I confirm that this report is accurate to the best of my knowledge. I understand that false, misleading, or malicious reports may result in account suspension or legal consequences. I confirm that I have permission or lawful basis to submit this information for fleet risk-management purposes.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
              {submitError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
            <div>
              {(drvFirstName || compDesc || vehReg) && (
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer min-h-[40px]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Clear Form & Draft</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all cursor-pointer min-h-[44px] text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {submitLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Filing Audit...</span>
                  </>
                ) : (
                  <span>File Moderation Claim</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
