import React from 'react';
import { MessageSquare, AlertTriangle, CheckCircle2, Info, X, ExternalLink } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'chat' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  senderName?: string;
  complaintId?: string;
  timestamp?: string;
  onClick?: () => void;
  actionLabel?: string;
  durationMs?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onOpenChat?: (complaintId: string) => void;
}

export default function ToastContainer({ toasts, onDismiss, onOpenChat }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      id="global-toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className="pointer-events-auto bg-white border border-stone-300/90 rounded-2xl shadow-xl p-4 flex flex-col space-y-2 transition-all duration-300 animate-in slide-in-from-top-3 fade-in ring-1 ring-black/5"
          role="alert"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start space-x-2.5">
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  toast.type === 'chat'
                    ? 'bg-stone-900 text-amber-400'
                    : toast.type === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : toast.type === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {toast.type === 'chat' ? (
                  <MessageSquare className="h-4 w-4" />
                ) : toast.type === 'warning' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : toast.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-extrabold text-xs text-slate-900 tracking-tight">{toast.title}</h4>
                  {toast.type === 'chat' && (
                    <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black rounded uppercase">
                      Live Chat
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">{toast.message}</p>
                {toast.senderName && (
                  <p className="text-[10px] text-slate-400 font-semibold">From: {toast.senderName}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action button if chat or custom action */}
          {toast.complaintId && onOpenChat ? (
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => {
                  onOpenChat(toast.complaintId!);
                  onDismiss(toast.id);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-stone-900 hover:bg-black text-white text-[11px] font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <span>Open Incident Chat</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          ) : toast.onClick ? (
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => {
                  toast.onClick!();
                  onDismiss(toast.id);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
              >
                <span>{toast.actionLabel || 'View Details'}</span>
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
