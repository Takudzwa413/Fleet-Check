import React from 'react';
import {
  X,
  MessageSquare,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  Car,
  ChevronRight,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { User } from '../../types';

interface IncidentChatThreadsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectThread: (complaintId: string) => void;
  token: string;
  currentUser: User;
}

export default function IncidentChatThreadsDrawer({
  isOpen,
  onClose,
  onSelectThread,
  token,
  currentUser
}: IncidentChatThreadsDrawerProps) {
  const [threads, setThreads] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'unread' | 'disputed'>('all');
  const [loading, setLoading] = React.useState(false);

  const isAdmin = currentUser.role === 'admin';

  const loadThreads = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/incidents/chat-threads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('Failed to load incident chat threads:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredThreads = threads.filter(t => {
    if (filterType === 'unread' && t.unread_count === 0) return false;
    if (filterType === 'disputed' && !t.is_disputed) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.driver_name?.toLowerCase().includes(q) ||
      t.vehicle_make_model?.toLowerCase().includes(q) ||
      t.vehicle_registration?.toLowerCase().includes(q) ||
      t.fleet_owner_company?.toLowerCase().includes(q) ||
      t.complaint_id?.toLowerCase().includes(q) ||
      t.last_message?.message?.toLowerCase().includes(q)
    );
  });

  const totalUnread = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);

  return (
    <div
      id="incident-chat-threads-overlay"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="incident-chat-threads-drawer"
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm text-white">Incident Clarifications</h3>
                {totalUnread > 0 && (
                  <span className="px-2 py-0.2 bg-amber-500 text-stone-950 font-black text-[10px] rounded-full">
                    {totalUnread} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                {isAdmin
                  ? 'Active compliance clarification channels with fleet owners'
                  : 'Direct clarification channels with compliance admins'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={loadThreads}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              title="Refresh threads"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by driver, plate, or company..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterType === 'all'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({threads.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterType === 'unread'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Unread ({threads.filter(t => t.unread_count > 0).length})
            </button>
            <button
              onClick={() => setFilterType('disputed')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterType === 'disputed'
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Disputed ({threads.filter(t => t.is_disputed).length})
            </button>
          </div>
        </div>

        {/* Thread List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 bg-slate-50/50">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-stone-600" />
              <p className="text-xs font-medium">Loading clarification threads...</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No Clarification Threads Found</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'No incident threads match your search query.'
                  : 'There are no active incident chats currently open.'}
              </p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <div
                key={thread.complaint_id}
                onClick={() => {
                  onSelectThread(thread.complaint_id);
                  onClose();
                }}
                className={`p-3.5 rounded-xl transition-all cursor-pointer border flex flex-col space-y-2 ${
                  thread.unread_count > 0
                    ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60 shadow-2xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-xs text-slate-900 truncate">
                        {thread.driver_name}
                      </span>
                      {thread.is_disputed && (
                        <span className="px-1.5 py-0.2 bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold rounded uppercase shrink-0">
                          Disputed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {isAdmin ? `🏢 ${thread.fleet_owner_company}` : `🚗 ${thread.vehicle_make_model || 'Vehicle'}`}
                      {thread.vehicle_registration ? ` • ${thread.vehicle_registration}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-col items-end shrink-0 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {thread.last_activity ? new Date(thread.last_activity).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    {thread.unread_count > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 text-[10px] font-black rounded-full">
                        {thread.unread_count} new
                      </span>
                    )}
                  </div>
                </div>

                {/* Last message snippet */}
                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <p className="text-[11px] text-slate-600 truncate italic flex-1">
                    {thread.last_message ? (
                      <>
                        <strong className="font-semibold not-italic text-slate-800">
                          {thread.last_message.sender_role === 'admin' ? 'Admin: ' : 'Owner: '}
                        </strong>
                        {thread.last_message.message || 'Attached file'}
                      </>
                    ) : (
                      'No messages yet. Click to start clarification.'
                    )}
                  </p>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
