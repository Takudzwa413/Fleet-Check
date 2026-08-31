import React from 'react';
import { ShieldCheck, LogOut, User as UserIcon, Settings, Lock, Menu, X, ChevronDown, Building2, Users, Bell, CheckCheck, MessageSquare, AlertCircle, AlertTriangle, ShieldAlert, Clock, Search, Car } from 'lucide-react';
import { User, UserNotification } from '../types';

interface NavbarProps {
  user: User | null;
  token?: string | null;
  isVerified: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSelectLoginRole?: (role: 'fleet_owner' | 'driver' | 'admin') => void;
  onOpenChat?: (complaintId: string) => void;
  onOpenChatThreads?: () => void;
  unreadChatCount?: number;
}

export default function Navbar({
  user,
  token,
  isVerified,
  activeTab,
  setActiveTab,
  onLogout,
  onSelectLoginRole,
  onOpenChat,
  onOpenChatThreads,
  unreadChatCount = 0
}: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = React.useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loadingNotifs, setLoadingNotifs] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!token || !user) return;
    try {
      setLoadingNotifs(true);
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  React.useEffect(() => {
    if (user && token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLoginDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleRoleLoginSelect = (role: 'fleet_owner' | 'driver' | 'admin') => {
    setLoginDropdownOpen(false);
    setIsOpen(false);
    if (onSelectLoginRole) {
      onSelectLoginRole(role);
    }
    setActiveTab('login');
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'chat_message':
        return <MessageSquare className="h-4 w-4 text-amber-600" />;
      case 'dispute_update':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'complaint_update':
        return <ShieldAlert className="h-4 w-4 text-blue-600" />;
      case 'driver_review':
        return <MessageSquare className="h-4 w-4 text-emerald-600" />;
      default:
        return <Bell className="h-4 w-4 text-stone-600" />;
    }
  };

  return (
    <nav className="bg-white border-b border-stone-200/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-2.5 text-stone-900 font-bold text-xl tracking-tight hover:opacity-90 cursor-pointer"
              id="nav-logo"
            >
              <div className="bg-stone-900 text-white p-1.5 rounded-xl flex items-center justify-center shadow-2xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-stone-900">FleetCheck</span>
            </button>
            
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'home' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                Home
              </button>
              
              <button
                onClick={() => setActiveTab('driver-marketplace')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'driver-marketplace' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold border border-stone-200' : 'text-stone-600 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                <Users className="h-4 w-4 text-[#1f1f1f]" />
                <span>Driver Marketplace</span>
              </button>

              <button
                onClick={() => setActiveTab('vehicle-marketplace')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'vehicle-marketplace' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold border border-stone-200' : 'text-stone-600 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                <Car className="h-4 w-4 text-[#1f1f1f]" />
                <span>Vehicle Marketplace</span>
              </button>

              <button
                onClick={() => setActiveTab('how-it-works')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'how-it-works' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => setActiveTab('dispute-portal')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'dispute-portal' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                Dispute Record
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'privacy' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                Privacy Policy
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <button
                    onClick={() => setActiveTab('admin-dashboard')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 bg-[#f6f7ed] text-[#1f1f1f] hover:bg-stone-100 transition-colors cursor-pointer ${
                      activeTab === 'admin-dashboard' ? 'ring-2 ring-stone-400' : ''
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </button>
                ) : user.role === 'driver' ? (
                  <button
                    onClick={() => setActiveTab('driver-dashboard')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 bg-[#f6f7ed] text-[#1f1f1f] hover:bg-stone-100 transition-colors cursor-pointer ${
                      activeTab === 'driver-dashboard' ? 'ring-2 ring-stone-400' : ''
                    }`}
                  >
                    <UserIcon className="h-4 w-4 text-[#1f1f1f]" />
                    <span>Driver Portal</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('fleet-owner-dashboard')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 bg-[#f6f7ed] text-[#1f1f1f] hover:bg-stone-100 transition-colors cursor-pointer ${
                      (activeTab === 'fleet-owner-dashboard' || activeTab === 'owner-dashboard') ? 'ring-2 ring-stone-400' : ''
                    }`}
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Fleet Dashboard</span>
                    {isVerified ? (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#1f1f1f] text-white rounded font-bold uppercase tracking-wider">
                        Verified
                      </span>
                    ) : (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-stone-200 text-[#1f1f1f] rounded font-bold uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                  </button>
                )}

                {/* Incident Clarification Chat Button (Fleet Owners, Drivers & Admins) */}
                {(user.role === 'admin' || user.role === 'fleet_owner' || user.role === 'driver') && onOpenChatThreads && (
                  <button
                    onClick={onOpenChatThreads}
                    className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200/80 bg-white"
                    title="Incident & Dispute Clarifications"
                  >
                    <MessageSquare className="h-4 w-4 text-stone-800" />
                    {unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-950 font-black text-[9px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Notifications Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setNotificationDropdownOpen(!notificationDropdownOpen);
                      if (!notificationDropdownOpen) fetchNotifications();
                    }}
                    className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200/80 bg-white"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 py-3 z-50 max-h-[460px] flex flex-col">
                      {/* Header */}
                      <div className="px-4 pb-2.5 border-b border-stone-100 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                              {unreadCount} unread
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 flex items-center space-x-1 cursor-pointer"
                          >
                            <CheckCheck className="h-3 w-3" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="overflow-y-auto divide-y divide-stone-100 flex-1">
                        {notifications.length === 0 ? (
                          <div className="py-8 px-4 text-center text-slate-400 space-y-1.5">
                            <Bell className="h-6 w-6 mx-auto text-slate-300" />
                            <div className="text-xs font-bold text-slate-700">No Notifications</div>
                            <p className="text-[11px] text-slate-400">
                              Dispute moderation outcomes and incident alerts will appear here.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (!notif.read) handleMarkAsRead(notif.id);
                                if (notif.type === 'chat_message' && notif.related_id && onOpenChat) {
                                  onOpenChat(notif.related_id);
                                  setNotificationDropdownOpen(false);
                                } else if (notif.type === 'dispute_update' || notif.type === 'complaint_update') {
                                  if (user.role === 'fleet_owner') setActiveTab('fleet-owner-dashboard');
                                }
                              }}
                              className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 ${
                                notif.read ? 'hover:bg-slate-50 opacity-80' : 'bg-stone-50/70 hover:bg-stone-100/80 font-medium'
                              }`}
                            >
                              <div className="p-1.5 bg-white rounded-lg border border-stone-200 shrink-0 mt-0.5 shadow-2xs">
                                {getNotifIcon(notif.type)}
                              </div>
                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {notif.title}
                                  </span>
                                  {!notif.read && (
                                    <span className="h-2 w-2 rounded-full bg-red-600 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug">
                                  {notif.message}
                                </p>
                                {notif.admin_notes && (
                                  <div className="text-[10px] bg-white p-1.5 rounded border border-stone-200 text-slate-700 italic">
                                    <strong>Admin Note:</strong> {notif.admin_notes}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 flex items-center space-x-1 pt-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>{new Date(notif.created_at).toLocaleString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-stone-200"></div>

                <div className="text-right">
                  <div className="text-xs font-bold text-[#1f1f1f] max-w-[120px] truncate">{user.name}</div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">{user.role}</div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-400 hover:text-[#1f1f1f] rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                {/* Login Button with Dropdown for Driver, Fleet Owner, Admin */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                    className="px-3.5 py-2 text-sm font-semibold text-[#1f1f1f] hover:text-black hover:bg-stone-100 rounded-xl transition-colors flex items-center space-x-1.5 border border-stone-200 bg-white shadow-2xs cursor-pointer"
                  >
                    <span>Log In</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-stone-500 transition-transform ${loginDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {loginDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 divide-y divide-stone-100">
                      <div className="px-3.5 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Select Login Portal
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => handleRoleLoginSelect('fleet_owner')}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50 hover:text-[#1f1f1f] flex items-center space-x-3 transition-colors cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-stone-100 text-[#1f1f1f]">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#1f1f1f]">Fleet Owner</div>
                            <div className="text-[10px] text-stone-400 font-normal">Manage fleet & driver checks</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleRoleLoginSelect('driver')}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50 hover:text-[#1f1f1f] flex items-center space-x-3 transition-colors cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-stone-100 text-[#1f1f1f]">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#1f1f1f]">Driver</div>
                            <div className="text-[10px] text-stone-400 font-normal">Manage profile & responses</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleRoleLoginSelect('admin')}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50 hover:text-[#1f1f1f] flex items-center space-x-3 transition-colors cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-stone-100 text-[#1f1f1f]">
                            <Lock className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#1f1f1f]">System Admin</div>
                            <div className="text-[10px] text-stone-400 font-normal">Platform moderation</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('register')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#1f1f1f] hover:bg-black rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Register Fleet
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex items-center space-x-2 md:hidden">
            {user && unreadCount > 0 && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-stone-600 hover:text-stone-900 rounded-md"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 bg-red-600 text-white font-black text-[9px] min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-2 py-3 space-y-1 shadow-lg max-h-[85vh] overflow-y-auto">
          <button
            onClick={() => { setActiveTab('home'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Home
          </button>
          <button
            onClick={() => { setActiveTab('driver-marketplace'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-900 bg-[#f4f3ec] font-bold"
          >
            Driver Marketplace
          </button>
          <button
            onClick={() => { setActiveTab('vehicle-marketplace'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Vehicle Marketplace
          </button>
          <button
            onClick={() => { setActiveTab('how-it-works'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            How It Works
          </button>
          <button
            onClick={() => { setActiveTab('dispute-portal'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Dispute Record
          </button>
          <button
            onClick={() => { setActiveTab(user?.role === 'driver' ? 'driver-dashboard' : 'register'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Driver Portal
          </button>
          <button
            onClick={() => { setActiveTab('privacy'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Privacy Policy
          </button>

          {user && notifications.length > 0 && (
            <div className="border-t border-stone-100 my-2 pt-2 px-3">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  <span>Recent Alerts ({unreadCount} unread)</span>
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-bold text-stone-500"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) handleMarkAsRead(n.id);
                      if (user.role === 'fleet_owner') setActiveTab('fleet-owner-dashboard');
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                      n.read ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/80 border-amber-200 font-medium'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-stone-100 my-2 pt-2"></div>

          {user ? (
            <div className="px-3 py-2">
              <div className="font-semibold text-stone-900 text-sm">{user.name}</div>
              <div className="text-xs text-stone-400 capitalize mb-2">{user.role}</div>
              
              {user.role === 'admin' ? (
                <button
                  onClick={() => { setActiveTab('admin-dashboard'); setIsOpen(false); }}
                  className="flex items-center justify-center space-x-2 w-full py-2 border border-red-200 bg-red-50 text-red-700 rounded-md font-semibold text-sm mb-2"
                >
                  <Lock className="h-4 w-4" />
                  <span>Admin Panel</span>
                </button>
              ) : user.role === 'driver' ? (
                <button
                  onClick={() => { setActiveTab('driver-dashboard'); setIsOpen(false); }}
                  className="flex items-center justify-center space-x-2 w-full py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-md font-semibold text-sm mb-2"
                >
                  <UserIcon className="h-4 w-4 text-emerald-600" />
                  <span>Driver Portal</span>
                </button>
              ) : (
                <button
                  onClick={() => { setActiveTab('fleet-owner-dashboard'); setIsOpen(false); }}
                  className="flex items-center justify-center space-x-2 w-full py-2 border border-stone-200 bg-stone-50 text-stone-700 rounded-md font-semibold text-sm mb-2"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Fleet Dashboard ({isVerified ? 'Verified' : 'Pending'})</span>
                </button>
              )}
              
              <button
                onClick={() => { onLogout(); setIsOpen(false); }}
                className="flex items-center justify-center space-x-2 w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-semibold text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 px-3 pt-2">
              <div className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Log In Options</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRoleLoginSelect('fleet_owner')}
                  className="py-2 text-center text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Fleet Owner
                </button>
                <button
                  onClick={() => handleRoleLoginSelect('driver')}
                  className="py-2 text-center text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Driver
                </button>
                <button
                  onClick={() => handleRoleLoginSelect('admin')}
                  className="py-2 text-center text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Admin
                </button>
              </div>
              <button
                onClick={() => { setActiveTab('register'); setIsOpen(false); }}
                className="w-full text-center py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold shadow-2xs mt-1 cursor-pointer"
              >
                Register Fleet
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
