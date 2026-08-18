import React, { useState } from 'react';
import {
  Upload, DollarSign, Calendar, FileText, CheckCircle2,
  AlertCircle, ShieldCheck, Banknote, Image as ImageIcon
} from 'lucide-react';
import { Project, ProjectMemberSlot, User } from '../../types';
import { compressImageFile } from '../../utils/imageCompressor';

interface UploadPOPModalProps {
  project: Project;
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  defaultSlotId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadPOPModal({
  project,
  slots,
  user,
  token,
  defaultSlotId,
  onClose,
  onSuccess
}: UploadPOPModalProps) {
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';
  const userSlot = slots.find(s => s.user_id === user.id);
  
  const [slotId, setSlotId] = useState(defaultSlotId || (userSlot ? userSlot.id : (slots[0]?.id || '')));
  const [paymentType, setPaymentType] = useState<'weekly_contribution' | 'initial_deposit' | 'penalty' | 'insurance'>('weekly_contribution');
  const [amount, setAmount] = useState<number>(3000);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bankReference, setBankReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string>('');
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentSlot = slots.find(s => s.id === slotId);

  // Pre-fill amount based on slot and payment type
  const handleSlotChange = (newSlotId: string) => {
    setSlotId(newSlotId);
    const target = slots.find(s => s.id === newSlotId);
    if (target) {
      if (paymentType === 'weekly_contribution') {
        setAmount(target.current_weekly_contribution || target.weekly_contribution);
      } else if (paymentType === 'initial_deposit') {
        setAmount(target.deposit_required);
      }
    }
  };

  const handleTypeChange = (type: any) => {
    setPaymentType(type);
    if (currentSlot) {
      if (type === 'weekly_contribution') {
        setAmount(currentSlot.current_weekly_contribution || currentSlot.weekly_contribution);
      } else if (type === 'initial_deposit') {
        setAmount(currentSlot.deposit_required);
      } else if (type === 'insurance') {
        setAmount(2000);
      } else if (type === 'penalty') {
        setAmount(900);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setCompressedDataUrl('');
      return;
    }

    setSelectedFile(file);
    setCompressing(true);
    setError('');

    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImageFile(file, 200 * 1024);
        setCompressedDataUrl(compressed.base64);
      } else {
        // Read as base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setCompressedDataUrl(reader.result as string);
          setCompressing(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err: any) {
      console.error('File processing error:', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotId) {
      setError('Please select a member slot.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }
    if (!bankReference || bankReference.trim().length < 3) {
      setError('Please enter the EFT payment bank reference (e.g. AP-SIPHO-POS1).');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/stokvel/payments/upload-pop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: project.id,
          slot_id: slotId,
          payment_type: paymentType,
          amount: Number(amount),
          payment_date: paymentDate,
          bank_reference: bankReference,
          receipt_file_data: compressedDataUrl || undefined,
          receipt_file_name: selectedFile?.name || undefined,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit proof of payment');

      setSuccess('Proof of Payment submitted successfully! Sent to Senior Accountant for statement verification.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">Upload Proof of Payment (POP)</h3>
              <p className="text-xs text-stone-500">File official EFT deposit slip for account reconciliation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Slot Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Target Member Slot *
            </label>
            <select
              value={slotId}
              disabled={!isPrivileged && !!userSlot}
              onChange={e => handleSlotChange(e.target.value)}
              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-semibold"
            >
              {slots.map(s => (
                <option key={s.id} value={s.id}>
                  Pos #{s.payout_position} - {s.user_name} ({s.slot_type_name})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Payment Category *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'weekly_contribution', label: 'Weekly Contribution' },
                { id: 'initial_deposit', label: 'Security Deposit' },
                { id: 'penalty', label: 'Penalty Clearance' },
                { id: 'insurance', label: 'Insurance Premium' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    paymentType === t.id
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Amount Paid (ZAR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-400">R</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="50"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full text-xs pl-7 pr-3 py-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-medium"
              />
            </div>
          </div>

          {/* EFT Bank Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              EFT Bank Reference Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AP-SIPHO-POS1"
              value={bankReference}
              onChange={e => setBankReference(e.target.value)}
              className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-mono"
            />
            <span className="text-[11px] text-stone-400 block">
              Instructions: {project.payment_reference_instructions}
            </span>
          </div>

          {/* Proof File Attachment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Attach Proof of Payment (Image / PDF)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="w-full text-xs p-2 border border-stone-300 rounded-xl bg-stone-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white cursor-pointer"
            />
            {compressing && (
              <span className="text-[10px] text-amber-600 animate-pulse">Compressing receipt image for fast storage...</span>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. EFT paid via Standard Bank app on Sunday evening."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || compressing}
              className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Submitting POP...' : 'Submit Proof Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
