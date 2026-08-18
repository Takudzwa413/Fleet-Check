import React from 'react';
import { ShieldCheck, Clock, User as UserIcon, FileText, ArrowRight } from 'lucide-react';
import { ProjectAuditLog } from '../../types';

interface AuditLogsViewerProps {
  logs: ProjectAuditLog[];
}

export default function AuditLogsViewer({ logs }: AuditLogsViewerProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Immutable Stokvel Audit Trail</span>
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Cryptographically recorded log of all financial reviews, emergency payout overrides, penalty waivers, and constitution events.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor / Role</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target Entity</th>
              <th className="px-4 py-3">Audit Details / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 font-mono text-[11px]">
            {logs.length > 0 ? (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-stone-50/70">
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-900">
                    {log.user_name} <span className="text-stone-400 font-normal">({log.user_role})</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-purple-800 uppercase">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ''}
                  </td>
                  <td className="px-4 py-3 text-stone-700 font-sans">
                    {log.reason || log.notes || (typeof log.details === 'object' ? JSON.stringify(log.details) : log.details) || log.new_value || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400 text-xs font-sans">
                  No audit logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
