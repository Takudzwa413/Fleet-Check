import React, { useState } from 'react';
import { FileText, Search, ShieldAlert, LogIn, CheckCircle, RefreshCw, AlertCircle, Filter, ShieldCheck, Layers, HelpCircle } from 'lucide-react';
import { AuditLog, SearchLog } from '../../types';

interface AuditTrailModuleProps {
  auditLogsList: AuditLog[];
  searchLogsList: SearchLog[];
  onRefresh: () => void;
  token: string;
}

export default function AuditTrailModule({
  auditLogsList,
  searchLogsList,
  onRefresh
}: AuditTrailModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'searches'>('audit');
  const [filterCategory, setFilterCategory] = useState<'all' | 'logins' | 'incidents' | 'verifications' | 'disputes_merges'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter audit logs
  const filteredAuditLogs = auditLogsList.filter((log) => {
    // Category match
    const act = (log.action || '').toUpperCase();
    if (filterCategory === 'logins' && !act.includes('LOGIN') && !act.includes('REGISTER') && !act.includes('EMAIL')) {
      return false;
    }
    if (filterCategory === 'incidents' && !act.includes('COMPLAINT') && !act.includes('INCIDENT') && !act.includes('REPORT')) {
      return false;
    }
    if (filterCategory === 'verifications' && !act.includes('VERIFY') && !act.includes('DOCUMENT')) {
      return false;
    }
    if (filterCategory === 'disputes_merges' && !act.includes('DISPUTE') && !act.includes('MERGE')) {
      return false;
    }

    // Text search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const userMatch = (log.user_name || '').toLowerCase().includes(q);
      const actionMatch = log.action.toLowerCase().includes(q);
      const valueMatch = (log.new_value || '').toLowerCase().includes(q);
      const ipMatch = (log.ip_address || '').toLowerCase().includes(q);
      const entityMatch = (log.entity_type || '').toLowerCase().includes(q);
      return userMatch || actionMatch || valueMatch || ipMatch || entityMatch;
    }

    return true;
  });

  const getActionBadgeStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN_SUCCESS')) {
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <LogIn className="h-3 w-3 text-emerald-600" /> };
    }
    if (act.includes('FAILED_LOGIN')) {
      return { bg: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle className="h-3 w-3 text-red-600" /> };
    }
    if (act.includes('COMPLAINT') || act.includes('INCIDENT')) {
      return { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: <ShieldAlert className="h-3 w-3 text-amber-600" /> };
    }
    if (act.includes('VERIFY')) {
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: <ShieldCheck className="h-3 w-3 text-blue-600" /> };
    }
    if (act.includes('MERGE')) {
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Layers className="h-3 w-3 text-purple-600" /> };
    }
    if (act.includes('DISPUTE')) {
      return { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: <HelpCircle className="h-3 w-3 text-orange-600" /> };
    }
    return { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: <FileText className="h-3 w-3 text-slate-500" /> };
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>System Platform Audit Trail & Compliance Inspections</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Chronological ledger recording logins, verification reviews, complaint submissions, and operator search activities across FleetCheck.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex border border-slate-200 bg-slate-50 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setActiveSubTab('audit')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeSubTab === 'audit' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sensitive Actions Audit ({auditLogsList.length})
              </button>
              <button
                onClick={() => setActiveSubTab('searches')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeSubTab === 'searches' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Search Query Logs ({searchLogsList.length})
              </button>
            </div>

            <button
              onClick={onRefresh}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {activeSubTab === 'audit' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center space-x-1 mr-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Category:</span>
                </span>
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Actions
                </button>
                <button
                  onClick={() => setFilterCategory('logins')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCategory === 'logins' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Logins & Security
                </button>
                <button
                  onClick={() => setFilterCategory('incidents')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCategory === 'incidents' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Incident Reports
                </button>
                <button
                  onClick={() => setFilterCategory('verifications')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCategory === 'verifications' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Verification Changes
                </button>
                <button
                  onClick={() => setFilterCategory('disputes_merges')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCategory === 'disputes_merges' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Disputes & Merges
                </button>
              </div>

              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter logs by actor, IP, action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Audit Logs List */}
            {filteredAuditLogs.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                No audit trail logs match the selected category filter or search query.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredAuditLogs.map((log: any) => {
                  const badge = getActionBadgeStyle(log.action);
                  const formattedTime = new Date(log.created_at).toLocaleString();

                  return (
                    <div
                      key={log.id}
                      className="p-4 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase tracking-wider flex items-center space-x-1 ${badge.bg}`}>
                            {badge.icon}
                            <span>{log.action}</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Entity: <strong className="text-slate-600">{log.entity_type} ({log.entity_id || 'Global'})</strong>
                          </span>
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          {formattedTime}
                        </span>
                      </div>

                      <p className="text-slate-900 font-bold leading-relaxed">
                        {log.new_value || log.old_value || 'Action recorded.'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-medium">
                        <span>
                          Actor / User: <strong className="text-slate-700">{log.user_name || log.user_id || 'System / Unauthenticated Guest'}</strong>
                        </span>
                        <span className="font-mono text-slate-500">
                          IP: {log.ip_address}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'searches' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Audit log of all search queries submitted by operators and guests to monitor scraping attempts or lookup activities.
            </p>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {searchLogsList.map((log: any) => (
                <div
                  key={log.id}
                  className="p-4 border border-slate-200 rounded-xl bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all space-y-1.5 text-xs shadow-2xs"
                >
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded uppercase font-extrabold">
                      {log.search_type}
                    </span>
                    <span className="font-mono">{new Date(log.created_at).toLocaleString()}</span>
                  </div>

                  <p className="text-slate-900 font-bold text-sm">
                    Search Query: <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">"{log.search_query}"</span>
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium pt-1">
                    <span>Operator: <strong className="text-slate-700">{log.user_name || 'Guest / Unauth'}</strong></span>
                    <span>Result Count: <strong className="text-slate-800">{log.result_count} record(s)</strong></span>
                    <span className="font-mono">IP: {log.ip_address}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
