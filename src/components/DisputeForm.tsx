import React from 'react';
import { HelpCircle, AlertTriangle, FileText, Upload, Send, CheckCircle, Info, ArrowRight } from 'lucide-react';

export default function DisputeForm() {
  const [complaintId, setComplaintId] = React.useState('');
  const [driverName, setDriverName] = React.useState('');
  const [driverContact, setDriverContact] = React.useState('');
  const [disputeText, setDisputeText] = React.useState('');
  const [files, setFiles] = React.useState<string[]>([]);
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!complaintId || !driverName || !driverContact || !disputeText) {
      setError('Complaint Reference ID, your Name, Contact details, and Explanation facts are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/public/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: complaintId,
          driver_name: driverName,
          driver_contact: driverContact,
          dispute_text: disputeText,
          file_name: files[0] || 'counter_statement.pdf',
          file_data: 'mock-base64-counter'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to file right of reply dispute.');

      setSuccess(data.message);
      // Reset
      setComplaintId('');
      setDriverName('');
      setDriverContact('');
      setDisputeText('');
      setFiles([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSimulatedCounterDoc = () => {
    const list = ['police_affidavit_scanned.pdf', 'fuel_receipt_proof.jpg', 'car_inspection_form_exit.pdf'];
    const selected = list[Math.floor(Math.random() * list.length)];
    if (!files.includes(selected)) {
      setFiles([...files, selected]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Right of Reply: Dispute Portal</h2>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          FleetCheck enforces a balanced, double-sided audit process. Drivers can file transparent counters to any incident record.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Policy and Guidance */}
        <div className="lg:col-span-4 bg-stone-50 border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <h3 className="font-extrabold text-stone-950 text-sm">How Disputes Work</h3>
          <p className="text-stone-500 text-xs leading-relaxed">
            Every approved complaint on FleetCheck is assigned a unique <span className="font-bold text-stone-900">Complaint Reference ID</span> (e.g. comp_1). 
          </p>
          <div className="space-y-3.5 text-xs text-stone-600 font-semibold">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-stone-800 shrink-0 mt-0.5" />
              <span>Submit the exact complaint ID and your valid contact details.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-stone-800 shrink-0 mt-0.5" />
              <span>Add chronological counter-arguments and upload valid proof.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-stone-800 shrink-0 mt-0.5" />
              <span>Our admin desk reviews the dispute. If approved, the record is adjusted or cleared.</span>
            </div>
          </div>

          <div className="h-px bg-stone-200"></div>
          <div className="text-[11px] text-stone-500 leading-relaxed flex items-start space-x-2 font-medium">
            <Info className="h-4 w-4 text-stone-600 shrink-0" />
            <span>Filing a dispute does not automatically erase a complaint. Records are maintained or deleted based strictly on physical evidence.</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          {success ? (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4 text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
              <h4 className="font-black text-stone-900 text-sm">Right of Reply Logged</h4>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">{success}</p>
              <button
                onClick={() => setSuccess('')}
                className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer min-h-[44px]"
              >
                File Another Dispute
              </button>
            </div>
          ) : (
            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Complaint Reference ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. comp_1"
                  value={complaintId}
                  onChange={e => setComplaintId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-stone-400 min-h-[44px]"
                />
                <span className="text-[10px] text-stone-400 block leading-relaxed">Ask the operator who performed your reference scan to give you this reference key.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lungelo Dube"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-stone-400 min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Your Contact Phone / Email *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +27 61 555 6666"
                    value={driverContact}
                    onChange={e => setDriverContact(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-stone-400 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Explanation Facts *</label>
                <textarea
                  required
                  placeholder="Describe what occurred. Provide exact references, dates, and why the report is incorrect or resolved. Keep descriptions professional and objective."
                  value={disputeText}
                  onChange={e => setDisputeText(e.target.value)}
                  rows={4}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-stone-400 leading-relaxed"
                />
              </div>

              {/* Counter Evidence upload */}
              <div className="space-y-3 pt-1">
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block">Upload Supporting Counter-Proof</label>
                <button
                  type="button"
                  onClick={addSimulatedCounterDoc}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 border border-stone-200 hover:border-stone-400 rounded-xl text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer min-h-[44px]"
                >
                  <Upload className="h-4 w-4 text-stone-700" />
                  <span>Attach Police Report AR or Receipt</span>
                </button>

                {files.length > 0 && (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 font-semibold space-y-1 shadow-2xs">
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Attachments List</div>
                    <ul className="list-disc list-inside">
                      {files.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold">
                  {error}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-2 transition-all min-h-[44px]"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? 'Filing right of reply...' : 'File Right of Reply'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
