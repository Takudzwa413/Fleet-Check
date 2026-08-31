import React from 'react';
import {
  X,
  Send,
  Paperclip,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Car,
  User as UserIcon,
  Building2,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { User, IncidentChatMessage } from '../../types';

interface IncidentClarificationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  token: string;
  currentUser: User;
  onMessageSent?: () => void;
}

export default function IncidentClarificationChatModal({
  isOpen,
  onClose,
  complaintId,
  token,
  currentUser,
  onMessageSent
}: IncidentClarificationChatModalProps) {
  const [messages, setMessages] = React.useState<IncidentChatMessage[]>([]);
  const [complaint, setComplaint] = React.useState<any>(null);
  const [dispute, setDispute] = React.useState<any>(null);
  const [inputText, setInputText] = React.useState('');
  const [attachmentData, setAttachmentData] = React.useState<{ name: string; url: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [error, setError] = React.useState('');

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pollingRef = React.useRef<any>(null);

  const isAdmin = currentUser.role === 'admin';

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const fetchMessages = async (silent = false) => {
    if (!complaintId || !token) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${complaintId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages');

      setComplaint(data.complaint);
      setDispute(data.dispute);
      setMessages(data.messages || []);
      setError('');
    } catch (err: any) {
      if (!silent) setError(err.message || 'Unable to connect to incident chat.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load and polling setup
  React.useEffect(() => {
    if (isOpen && complaintId) {
      fetchMessages(false);
      // Poll every 3 seconds for sub-second sync
      pollingRef.current = setInterval(() => {
        fetchMessages(true);
      }, 3000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, complaintId]);

  // Scroll on new messages
  React.useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachmentData) || sending) return;

    const messageText = inputText.trim();
    setSending(true);
    setError('');

    // Optimistic message update
    const tempId = 'temp_' + Date.now();
    const optimisticMsg: IncidentChatMessage = {
      id: tempId,
      complaint_id: complaintId,
      sender_id: currentUser.id,
      sender_name: isAdmin ? (currentUser.name || 'Compliance Admin') : (currentUser.name || 'Fleet Operator'),
      sender_role: isAdmin ? 'admin' : 'fleet_owner',
      message: messageText,
      attachment_name: attachmentData?.name,
      attachment_url: attachmentData?.url,
      read_by: [currentUser.id],
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    const currentAttachment = attachmentData;
    setAttachmentData(null);
    scrollToBottom();

    try {
      const res = await fetch(`/api/incidents/${complaintId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText,
          attachment_name: currentAttachment?.name,
          attachment_url: currentAttachment?.url
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      // Replace optimistic message with actual
      setMessages(prev => prev.map(m => (m.id === tempId ? data.chatMessage : m)));
      if (onMessageSent) onMessageSent();
    } catch (err: any) {
      setError(err.message || 'Message delivery failed.');
      // Remove failed optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentData({
        name: file.name,
        url: reader.result as string
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const quickClarificationPrompts = isAdmin
    ? [
        'Please provide the official SAPS police case number.',
        'Could you upload a clearer copy of the vehicle repair quote?',
        'Has the outstanding rental balance or vehicle been returned?',
        'Please clarify the exact handover date vs incident date.'
      ]
    : [
        'Vehicle has been successfully recovered.',
        'Uploaded the stamped SAPS police affidavit.',
        'Driver has acknowledged liability and signed an acknowledgment of debt.',
        'Attached the itemized repair and panel beating invoice.'
      ];

  if (!isOpen) return null;

  return (
    <div
      id="incident-clarification-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="incident-clarification-modal"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[90vh] max-h-[700px] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-3 truncate">
            <div className="h-9 w-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm text-white tracking-tight truncate">
                  Dispute & Incident Clarification
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0">
                  {complaint ? complaint.status : 'Loading'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {complaint
                  ? `Ref #${complaint.id.slice(0, 8)} • ${complaint.driver_name} (${complaint.vehicle_make_model || 'Vehicle'})`
                  : 'Connecting to real-time thread...'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => fetchMessages(false)}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              title="Refresh messages"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Incident Context & Rebuttal Bar */}
        {complaint && (
          <div className="bg-slate-50 border-b border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full px-5 py-2 flex items-center justify-between text-slate-700 hover:bg-slate-100/80 transition-colors text-[11px] font-bold select-none cursor-pointer"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[10px]">
                  {complaint.category.replace('_', ' ')}
                </span>
                <span className="text-slate-500 font-medium truncate">
                  Filed by: <strong>{complaint.fleet_owner_company}</strong>
                </span>
                {dispute && (
                  <span className="inline-flex items-center text-red-600 font-bold gap-1 text-[10px] bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Dispute Active</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-slate-400 font-semibold">
                <span>{isDetailsOpen ? 'Hide Case Facts' : 'View Case Facts'}</span>
                {isDetailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </div>
            </button>

            {isDetailsOpen && (
              <div className="px-5 py-3 border-t border-slate-200 bg-white space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Driver</span>
                    <strong className="text-slate-800">{complaint.driver_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Vehicle Reg</span>
                    <strong className="text-slate-800">{complaint.vehicle_registration || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Incident Date</span>
                    <strong className="text-slate-800">{complaint.incident_date}</strong>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-700">
                  <span className="font-bold text-slate-500 block text-[10px] uppercase">Original Claim Description:</span>
                  <p className="italic">"{complaint.description}"</p>
                </div>

                {dispute && (
                  <div className="p-2.5 bg-red-50/70 rounded-xl border border-red-200 text-[11px] text-red-900">
                    <span className="font-bold text-red-700 block text-[10px] uppercase flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Driver Counter-Claim:
                    </span>
                    <p className="italic font-medium">"{dispute.dispute_text}"</p>
                    <p className="text-[10px] text-red-600 mt-1">Driver Contact: {dispute.driver_contact}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Message Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/60">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-stone-600" />
              <p className="text-xs font-medium">Loading clarification transcript...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-sm text-slate-800">No Clarification Messages Yet</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isAdmin
                    ? 'Start the thread by asking the Fleet Owner for specific proof, SAPS case references, or clarification on the driver dispute.'
                    : 'Send a message or attach supporting documents to assist the compliance team in moderating this incident.'}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender_id === currentUser.id;
              const isSenderAdmin = msg.sender_role === 'admin' || msg.sender_role === 'accountant';
              const timeString = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              const dateString = new Date(msg.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Header */}
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold mb-1 px-1">
                    <span>{msg.sender_name}</span>
                    {isSenderAdmin && (
                      <span className="px-1.5 py-0.2 bg-stone-800 text-white rounded text-[9px] font-extrabold uppercase">
                        Admin
                      </span>
                    )}
                    <span>• {timeString}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-2xs text-xs font-normal leading-relaxed break-words ${
                      isMe
                        ? 'bg-stone-900 text-white rounded-br-xs'
                        : isSenderAdmin
                        ? 'bg-white border border-stone-300 text-slate-900 rounded-bl-xs'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>

                    {/* Attachment preview if any */}
                    {msg.attachment_url && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/20 sm:border-slate-100 flex items-center space-x-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isMe ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate flex-1">
                          <span
                            className={`block font-bold text-[11px] truncate ${
                              isMe ? 'text-white' : 'text-slate-800'
                            }`}
                          >
                            {msg.attachment_name || 'Attached File'}
                          </span>
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={msg.attachment_name || 'evidence-attachment'}
                            className={`text-[10px] font-bold underline ${
                              isMe ? 'text-stone-300 hover:text-white' : 'text-stone-900 hover:text-black'
                            }`}
                          >
                            Download Attachment
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message status */}
                  <div className="text-[9px] text-slate-400 mt-1 px-1 flex items-center space-x-1">
                    <span>{dateString}</span>
                    {isMe && (
                      <span className="font-semibold">
                        {msg.read_by && msg.read_by.length > 1 ? '• Read' : '• Delivered'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sparkles className="h-3 w-3 text-amber-500" /> Quick Replies:
          </span>
          {quickClarificationPrompts.map((promptText, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputText(promptText)}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 border border-slate-200"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Active Attachment Chip */}
        {attachmentData && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <Paperclip className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span className="font-bold truncate">Attachment ready: {attachmentData.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachmentData(null)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer ml-2"
            >
              Remove
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3.5 bg-white border-t border-slate-200 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Attach document, invoice, or screenshot"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                isAdmin
                  ? 'Type clarification request to fleet owner...'
                  : 'Type response or dispute clarification...'
              }
              disabled={sending}
              className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 min-h-[44px] text-slate-900 placeholder:text-slate-400 bg-slate-50/50"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !attachmentData) || sending}
              className="px-4 py-2.5 bg-stone-900 hover:bg-black disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 min-h-[44px] flex items-center space-x-1.5"
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
