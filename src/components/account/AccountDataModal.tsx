import React, { useState } from 'react';
import { X, Download, ShieldAlert, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AccountDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onAccountDeleted: () => void;
}

export default function AccountDataModal({ isOpen, onClose, token, onAccountDeleted }: AccountDataModalProps) {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    setExportLoading(true);
    setExportError('');
    try {
      const res = await fetch('/api/auth/export-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to export your data.');

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fleetcheck-my-data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export your data.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete your account.');
      onAccountDeleted();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete your account.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-stone-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-stone-800" />
            <h3 className="font-black text-stone-900 text-sm">My Data & Account</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Export */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-stone-700">Export My Data</h4>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Download a copy of the account and profile data FleetCheck holds about you, as a JSON file.
          </p>
          {exportError && (
            <div className="p-2.5 bg-stone-100 border border-stone-300 rounded-xl text-[11px] text-stone-900 font-semibold">
              {exportError}
            </div>
          )}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-50 disabled:opacity-60 min-h-[40px] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{exportLoading ? 'Preparing download...' : 'Download My Data (JSON)'}</span>
          </button>
        </div>

        {/* Danger zone */}
        <div className="space-y-2 pt-3 border-t border-stone-100">
          <h4 className="text-xs font-bold text-red-700 flex items-center space-x-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Delete My Account</span>
          </h4>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            This permanently deletes your account, profile, and uploaded documents. This cannot be undone.
            Complaints or disputes involving your account are kept as part of the platform's moderation record.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-red-200 text-red-700 text-xs font-bold rounded-xl hover:bg-red-50 min-h-[40px] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete My Account</span>
            </button>
          ) : (
            <form onSubmit={handleDelete} className="space-y-2.5">
              <label className="text-[11px] font-bold text-stone-700">Confirm your password to permanently delete your account</label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 min-h-[44px]"
                placeholder="Your account password"
              />
              {deleteError && (
                <div className="p-2.5 bg-stone-100 border border-stone-300 rounded-xl text-[11px] text-stone-900 font-semibold">
                  {deleteError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                  className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 min-h-[40px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-bold rounded-xl shadow-xs min-h-[40px] cursor-pointer"
                >
                  {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
