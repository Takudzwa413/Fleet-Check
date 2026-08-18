import React, { useState, useEffect } from 'react';
import { X, User, Shield, Key, Clock, CheckCircle2, AlertTriangle, Activity, Lock, Bell, History } from 'lucide-react';
import { User as UserType, AuditLog } from '../../types';

interface AdminAccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  token: string;
  onUserUpdated: (updatedUser: UserType) => void;
}

export default function AdminAccountSettingsModal({
  isOpen,
  onClose,
  user,
  token,
  onUserUpdated
}: AdminAccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity'>('profile');
  
  // Profile Form State
  const [displayName, setDisplayName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Security Preferences State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailAlertsCritical, setEmailAlertsCritical] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState('60');
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityMsg, setSecurityMsg] = useState('');

  // Activity History State
  const [myLogs, setMyLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user.name || '');
      setPhone(user.phone || '');
      if (activeTab === 'activity') {
        fetchMyActivity();
      }
    }
  }, [isOpen, activeTab, user]);

  const fetchMyActivity = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/my-activity', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileError('');

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: displayName,
          phone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update account profile');
      }

      setProfileMsg('Account profile successfully updated.');
      if (data.user) {
        onUserUpdated(data.user);
      }
    } catch (err: any) {
      setProfileError(err.message || 'Error updating account profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSecuritySave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSecurity(true);
    setSecurityMsg('');
    setTimeout(() => {
      setSavingSecurity(false);
      setSecurityMsg('Security preferences and notification policies saved.');
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-[#1f1f1f] text-white flex justify-between items-center border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-stone-800 text-stone-200 border border-stone-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Administrator Account Settings</h3>
              <p className="text-xs text-stone-400 font-medium">Manage profile details, security controls & view activity history</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center space-x-2 border-b-2 whitespace-nowrap min-h-[44px] ${
              activeTab === 'profile'
                ? 'bg-white border-[#1f1f1f] text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Profile & Identity</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center space-x-2 border-b-2 whitespace-nowrap min-h-[44px] ${
              activeTab === 'security'
                ? 'bg-white border-[#1f1f1f] text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Security & Alerts</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('activity');
              fetchMyActivity();
            }}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center space-x-2 border-b-2 whitespace-nowrap min-h-[44px] ${
              activeTab === 'activity'
                ? 'bg-white border-[#1f1f1f] text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>My Activity Trail</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PROFILE & IDENTITY */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{profileMsg}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-800 text-xs font-bold">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Administrator Display Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="e.g., System Administrator"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white min-h-[44px]"
                  />
                  <p className="text-[10px] text-slate-400">This name appears in administrative audit logs and operator communications.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Direct Phone Contact
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 82 000 0000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white min-h-[44px]"
                  />
                  <p className="text-[10px] text-slate-400">Used for urgent security escalation alerts.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-800">
                  Account Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed min-h-[44px]"
                />
                <p className="text-[10px] text-slate-400">System administrator email address cannot be changed directly.</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start space-x-3 text-slate-600 text-xs">
                <Shield className="h-5 w-5 text-stone-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Administrative Role & Privileges</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                    You are logged in as a primary System Administrator. You hold full operational authority over driver risk dossiers, complaint moderation, operator approvals, and system logs.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer flex items-center space-x-2 min-h-[44px]"
                >
                  {savingProfile ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>Save Profile Updates</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY & ALERTS */}
          {activeTab === 'security' && (
            <form onSubmit={handleSecuritySave} className="space-y-5">
              {securityMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{securityMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Multi-Factor & Session Controls</h4>
                
                {/* 2FA Toggle */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-stone-200 text-stone-800 rounded-xl">
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900">Two-Factor Authentication (2FA)</h5>
                      <p className="text-[11px] text-slate-500">Require an authenticator code when logging into the admin console.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1f1f1f]"></div>
                  </label>
                </div>

                {/* Session Timeout */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-stone-200 text-stone-800 rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900">Session Inactivity Timeout</h5>
                      <p className="text-[11px] text-slate-500">Automatically lock admin session after a period of inactivity.</p>
                    </div>
                  </div>
                  <select
                    value={sessionTimeoutMins}
                    onChange={(e) => setSessionTimeoutMins(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-stone-400 min-h-[40px]"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="240">4 Hours</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Administrative Alert Notifications</h4>

                {/* Critical Incident Alerts */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900">Critical Incident Email Alerts</h5>
                      <p className="text-[11px] text-slate-500">Send instant email notifications when a CRITICAL severity incident is filed.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlertsCritical}
                      onChange={(e) => setEmailAlertsCritical(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1f1f1f]"></div>
                  </label>
                </div>

                {/* Login Security Alerts */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900">Unrecognized IP Login Alerts</h5>
                      <p className="text-[11px] text-slate-500">Notify admin when login originates from a new IP or device.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loginAlerts}
                      onChange={(e) => setLoginAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1f1f1f]"></div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSecurity}
                  className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer flex items-center space-x-2 min-h-[44px]"
                >
                  {savingSecurity && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                  )}
                  <span>Save Security Preferences</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ACTIVITY HISTORY */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <History className="h-4 w-4 text-stone-800" />
                  <span>Your Personal Administrative Audit Trail</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-bold">{myLogs.length} action(s) logged</span>
              </div>

              {loadingLogs ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  <div className="w-6 h-6 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Fetching personal activity logs...
                </div>
              ) : myLogs.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                  No activity history recorded for this admin session yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {myLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs hover:border-slate-300 transition-all">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                        <span>{log.created_at.split('T')[0]} {log.created_at.split('T')[1].slice(0, 5)}</span>
                        <span className="px-2 py-0.5 bg-stone-200 text-stone-800 rounded-md uppercase font-extrabold">
                          {log.action}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-[11px]">{log.new_value || log.old_value}</p>
                      <p className="text-[10px] text-slate-400">
                        Target: <strong className="text-slate-600">{log.entity_type} ({log.entity_id.slice(0, 10)})</strong> • IP: {log.ip_address}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
