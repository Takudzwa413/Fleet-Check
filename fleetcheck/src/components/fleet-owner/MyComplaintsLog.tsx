import React from 'react';
import { RefreshCw, History, HelpCircle } from 'lucide-react';
import { Tooltip, StatusBadgeWithTooltip } from '../ui/Tooltip';

interface MyComplaintsLogProps {
  token: string;
  getStatusBadge: (status: string) => string;
}

export default function MyComplaintsLog({
  token,
  getStatusBadge
}: MyComplaintsLogProps) {
  const [myComplaints, setMyComplaints] = React.useState<any[]>([]);
  const [myComplaintsLoading, setMyComplaintsLoading] = React.useState(false);

  const loadMyComplaints = async () => {
    setMyComplaintsLoading(true);
    try {
      const res = await fetch('/api/complaints/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMyComplaints(data.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setMyComplaintsLoading(false);
    }
  };

  React.useEffect(() => {
    loadMyComplaints();
  }, []);

  const severityExplanations: Record<string, string> = {
    critical: 'Critical Severity (+35 pts): Vehicle theft, reckless endangerment, unauthorized subletting, or fraudulent documentation.',
    high: 'High Severity (+20 pts): Serious damage, major payment default, or severe contract breach.',
    medium: 'Medium Severity (+10 pts): Moderate late returns, vehicle neglect, or disputed operational fees.',
    low: 'Low Severity (+5 pts): Minor disagreements or low-impact administrative issues.'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900">Your Incident Filing Logs</h3>
          <p className="text-slate-500 text-xs">Verify current moderation states, pending responses, or disputes of your submitted driver complaints.</p>
        </div>
        <button
          onClick={loadMyComplaints}
          className="p-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {myComplaintsLoading ? (
        <div className="py-12 text-center text-slate-500">
          <RefreshCw className="animate-spin h-6 w-6 mx-auto text-stone-700" />
        </div>
      ) : myComplaints.length === 0 ? (
        <div className="py-12 border border-slate-200 border-dashed rounded-xl text-center space-y-2">
          <History className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-900 text-sm">No Incidents Logged</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">You have not filed any incident claims yet. Approved filings are used to build anonymous platform risk scores.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-500">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Driver Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Incident Date</th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span>Severity</span>
                    <Tooltip
                      title="Incident Severity Scale"
                      content="Severity level dictates the mathematical weight assigned to the driver's risk score."
                      position="top"
                    />
                  </div>
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span>Filing State</span>
                    <Tooltip
                      title="Compliance Review Status"
                      content="Incident reports are audited by compliance admins before being published to the national driver registry."
                      position="top"
                    />
                  </div>
                </th>
                <th className="px-4 py-3">Resolution</th>
                <th className="px-4 py-3">Admin Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {myComplaints.map((comp: any) => (
                <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{comp.driver_name}</td>
                  <td className="px-4 py-3 capitalize">{comp.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-medium">{comp.incident_date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    <Tooltip
                      title={`${comp.severity.toUpperCase()} Severity`}
                      content={severityExplanations[comp.severity] || 'Severity level of the incident.'}
                      position="top"
                    >
                      <span className="capitalize cursor-help inline-flex items-center gap-1">
                        <span>{comp.severity}</span>
                        <HelpCircle className="h-2.5 w-2.5 opacity-50" />
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadgeWithTooltip
                      status={comp.status}
                      badgeClass={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider ${getStatusBadge(comp.status)}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-600 capitalize">
                    <StatusBadgeWithTooltip
                      status={comp.resolution_status}
                      badgeClass="text-slate-700"
                    />
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate" title={comp.admin_notes || comp.rejected_reason}>
                    {comp.status === 'rejected' ? (
                      <span className="text-red-700 font-bold">Rejected: {comp.rejected_reason || 'No reason specified'}</span>
                    ) : (
                      comp.admin_notes || <span className="text-slate-300">No notes</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

