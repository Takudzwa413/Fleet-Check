import React, { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, AlertTriangle, FileText, CheckCircle2, Clock, X, ArrowRight, Volume2 } from 'lucide-react';

export interface AdminNotification {
  id: string;
  type: 'incident' | 'high_risk_driver' | 'verification' | 'dispute';
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  message: string;
  created_at: string;
  link_tab: string;
  item_id?: string;
  read?: boolean;
}

interface RealtimeNotificationFeedProps {
  token: string;
  onSelectTab: (tab: string) => void;
}

export default function RealtimeNotificationFeed({ token, onSelectTab }: RealtimeNotificationFeedProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [activeToast, setActiveToast] = useState<AdminNotification | null>(null);
  const previousNotifIds = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const incoming: AdminNotification[] = data.notifications || [];

        // Detect newly arrived notifications for toast banner trigger
        if (previousNotifIds.current.size > 0) {
          const newNotifs = incoming.filter(n => !previousNotifIds.current.has(n.id));
          if (newNotifs.length > 0) {
            // Trigger toast for most severe new notification
            const topNotif = newNotifs.find(n => n.severity === 'critical') || newNotifs[0];
            setActiveToast(topNotif);

            // Auto dismiss toast after 6 seconds
            setTimeout(() => {
              setActiveToast(null);
            }, 6000);
          }
        }

        // Update tracking set
        const newSet = new Set<string>();
        incoming.forEach(n => newSet.add(n.id));
        previousNotifIds.current = newSet;

        setNotifications(incoming);
      }
    } catch (err) {
      console.error('Failed to poll real-time notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-poll real-time updates every 8 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 8000);

    return () => clearInterval(interval);
  }, [token]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleNotificationClick = (notif: AdminNotification) => {
    setReadIds(prev => new Set(prev).add(notif.id));
    setIsOpen(false);
    setActiveToast(null);
    if (notif.link_tab) {
      onSelectTab(notif.link_tab);
    }
  };

  const handleMarkAllRead = () => {
    const allIds = new Set(readIds);
    notifications.forEach(n => allIds.add(n.id));
    setReadIds(allIds);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[9px] font-black uppercase rounded">Critical Alert</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded">High Risk</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-black uppercase rounded">Medium</span>;
      default:
        return <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black uppercase rounded">Info</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Real-time Toast Banner Popup (Top Right) */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-3 duration-300 flex items-start space-x-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            activeToast.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          }`}>
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-red-400 flex items-center space-x-1">
                <Volume2 className="h-3 w-3 animate-pulse" />
                <span>Live Event Alert</span>
              </span>
              <button
                onClick={() => setActiveToast(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <h4 className="font-extrabold text-xs text-white leading-snug">{activeToast.title}</h4>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{activeToast.message}</p>

            <button
              onClick={() => handleNotificationClick(activeToast)}
              className="pt-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>View in Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bell Icon Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
        title="Real-time Admin Notifications"
      >
        <Bell className="h-5 w-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-red-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notification Feed Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden space-y-0 animate-in fade-in duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-blue-400" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider">Real-time Incident Alerts</h3>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-blue-300 hover:text-white font-bold cursor-pointer underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications Feed List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active notifications or alerts.
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = readIds.has(notif.id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer space-y-1 ${
                      !isRead ? 'bg-blue-50/40 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        {getSeverityBadge(notif.severity)}
                        <span>{notif.type.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{notif.created_at.split('T')[0]}</span>
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{notif.title}</h4>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{notif.message}</p>

                    <div className="pt-1 flex justify-end">
                      <span className="text-[10px] font-bold text-blue-600 flex items-center space-x-1">
                        <span>Inspect Queue</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-semibold">
              Live polling active • System checks for new driver reports automatically
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
