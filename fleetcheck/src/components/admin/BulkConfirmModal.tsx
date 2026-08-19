import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, X, ShieldAlert } from 'lucide-react';

interface BulkConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  actionType: 'approve' | 'reject' | 'verify';
  itemCount: number;
  isProcessing: boolean;
}

export default function BulkConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionType,
  itemCount,
  isProcessing
}: BulkConfirmModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isReject = actionType === 'reject';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReject && !reason.trim()) {
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className={`p-5 flex justify-between items-start border-b ${
          isReject ? 'bg-red-50/80 border-red-100 text-red-900' : 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              isReject ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isReject ? <XCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">{title}</h3>
              <p className="text-xs font-semibold opacity-80 mt-0.5">{itemCount} item(s) selected</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {description}
          </p>

          {isReject && (
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Reason for Rejection <span className="text-red-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter justification for rejecting these selected items..."
                rows={3}
                required
                className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 font-medium text-slate-900 resize-none"
              />
              <p className="text-[10px] text-slate-400">
                This explanation will be logged in the audit trail and sent to affected users.
              </p>
            </div>
          )}

          {!isReject && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-amber-900 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="font-medium">
                Approved records will be updated immediately and published across driver risk indexes.
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || (isReject && !reason.trim())}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                isReject
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20 disabled:bg-red-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 disabled:bg-emerald-300'
              }`}
            >
              {isProcessing && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              )}
              <span>{isReject ? `Confirm Bulk Rejection (${itemCount})` : `Confirm Bulk Approval (${itemCount})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
