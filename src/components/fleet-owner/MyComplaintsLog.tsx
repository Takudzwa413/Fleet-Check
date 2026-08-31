import React, { useState, useMemo } from 'react';
import { RefreshCw, History, HelpCircle, FileDown, Download, Filter, Search, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { Tooltip, StatusBadgeWithTooltip } from '../ui/Tooltip';
import { exportIncidentReportToPDF, exportAllIncidentsToPDF } from '../../utils/pdfExport';

interface MyComplaintsLogProps {
  token: string;
  getStatusBadge: (status: string) => string;
  onOpenChat?: (complaintId: string) => void;
}

type FilterCategoryKey =
  | 'all'
  | 'accident'
  | 'theft'
  | 'safety'
  | 'damage'
  | 'unpaid'
  | 'abandoned'
  | 'other';

interface FilterChipDef {
  key: FilterCategoryKey;
  label: string;
  matchCategories?: string[];
}

const FILTER_CHIPS: FilterChipDef[] = [
  { key: 'all', label: 'All Incidents' },
  { key: 'accident', label: 'Accident', matchCategories: ['accident'] },
  { key: 'theft', label: 'Theft & Fraud', matchCategories: ['theft_fraud_suspicion'] },
  { key: 'safety', label: 'Safety & Reckless', matchCategories: ['reckless_driving'] },
  { key: 'damage', label: 'Vehicle Damage', matchCategories: ['vehicle_damage'] },
  { key: 'unpaid', label: 'Unpaid Rental', matchCategories: ['unpaid_rental', 'fines_unpaid'] },
  { key: 'abandoned', label: 'Abandoned', matchCategories: ['vehicle_abandoned'] },
  { key: 'other', label: 'Breach / Other', matchCategories: ['breach_agreement', 'unauthorized_use', 'poor_communication', 'other'] }
];

export default function MyComplaintsLog({
  token,
  getStatusBadge,
  onOpenChat
}: MyComplaintsLogProps) {
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [myComplaintsLoading, setMyComplaintsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Compute counts for each filter chip
  const filterCounts = useMemo(() => {
    const counts: Record<FilterCategoryKey, number> = {
      all: myComplaints.length,
      accident: 0,
      theft: 0,
      safety: 0,
      damage: 0,
      unpaid: 0,
      abandoned: 0,
      other: 0
    };

    myComplaints.forEach((c) => {
      FILTER_CHIPS.forEach((chip) => {
        if (chip.key !== 'all' && chip.matchCategories && chip.matchCategories.includes(c.category)) {
          counts[chip.key]++;
        }
      });
    });

    return counts;
  }, [myComplaints]);

  // Filtered complaints based on selected chip and search text
  const filteredComplaints = useMemo(() => {
    return myComplaints.filter((comp) => {
      // 1. Filter chip check
      if (selectedFilter !== 'all') {
        const chipDef = FILTER_CHIPS.find(c => c.key === selectedFilter);
        if (chipDef?.matchCategories && !chipDef.matchCategories.includes(comp.category)) {
          return false;
        }
      }

      // 2. Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const driverName = (comp.driver_name || '').toLowerCase();
        const vehReg = (comp.vehicle_registration || '').toLowerCase();
        const vehModel = (comp.vehicle_make_model || '').toLowerCase();
        const desc = (comp.description || '').toLowerCase();
        const cat = (comp.category || '').replace('_', ' ').toLowerCase();

        return driverName.includes(q) || vehReg.includes(q) || vehModel.includes(q) || desc.includes(q) || cat.includes(q);
      }

      return true;
    });
  }, [myComplaints, selectedFilter, searchQuery]);

  const handleExportSingle = (complaint: any) => {
    exportIncidentReportToPDF({
      id: complaint.id,
      driver_name: complaint.driver_name,
      driver_id_number: complaint.driver_id_number,
      vehicle_registration: complaint.vehicle_registration,
      vehicle_make_model: complaint.vehicle_make_model,
      category: complaint.category,
      severity: complaint.severity,
      incident_date: complaint.incident_date,
      handover_date: complaint.handover_date,
      description: complaint.description,
      status: complaint.status,
      resolution_status: complaint.resolution_status,
      admin_notes: complaint.admin_notes,
      created_at: complaint.created_at
    });
  };

  const handleExportAll = () => {
    const targetList = filteredComplaints.length > 0 ? filteredComplaints : myComplaints;
    if (targetList.length === 0) return;
    exportAllIncidentsToPDF(
      targetList.map(c => ({
        id: c.id,
        driver_name: c.driver_name,
        category: c.category,
        severity: c.severity,
        incident_date: c.incident_date,
        vehicle_registration: c.vehicle_registration,
        status: c.status,
        resolution_status: c.resolution_status
      }))
    );
  };

  const severityExplanations: Record<string, string> = {
    critical: 'Critical Severity (+35 pts): Vehicle theft, reckless endangerment, unauthorized subletting, or fraudulent documentation.',
    high: 'High Severity (+20 pts): Serious damage, major payment default, or severe contract breach.',
    medium: 'Medium Severity (+10 pts): Moderate late returns, vehicle neglect, or disputed operational fees.',
    low: 'Low Severity (+5 pts): Minor disagreements or low-impact administrative issues.'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">Your Incident Filing Logs</h3>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-full text-xs font-bold border border-slate-200">
              {myComplaints.length} Total
            </span>
          </div>
          <p className="text-slate-500 text-xs">
            Verify current moderation states, pending responses, or disputes of your submitted driver complaints.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {myComplaints.length > 0 && (
            <button
              onClick={handleExportAll}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs min-h-[40px]"
              title={selectedFilter !== 'all' ? `Export ${filteredComplaints.length} filtered incident(s) to PDF` : 'Export all incidents to PDF'}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{selectedFilter !== 'all' ? `Export Filtered (${filteredComplaints.length})` : 'Export Audit PDF'}</span>
            </button>
          )}
          <button
            onClick={loadMyComplaints}
            className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Refresh incident records"
          >
            <RefreshCw className={`h-4 w-4 ${myComplaintsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Clickable Filter Chips & Search Bar */}
      {myComplaints.length > 0 && (
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by driver, plate, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-slate-400 min-h-[38px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Active filter count summary */}
            {(selectedFilter !== 'all' || searchQuery) && (
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <span>Showing <strong>{filteredComplaints.length}</strong> of {myComplaints.length} records</span>
                <button
                  onClick={() => { setSelectedFilter('all'); setSearchQuery(''); }}
                  className="text-xs text-stone-900 font-bold hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {/* Clickable Filter Chips Row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              <Filter className="h-3 w-3" />
              <span>Type:</span>
            </div>

            {FILTER_CHIPS.map((chip) => {
              const isSelected = selectedFilter === chip.key;
              const count = filterCounts[chip.key];
              return (
                <button
                  key={chip.key}
                  onClick={() => setSelectedFilter(chip.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Table or Empty State */}
      {myComplaintsLoading ? (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <RefreshCw className="animate-spin h-6 w-6 mx-auto text-stone-700" />
          <p className="text-xs font-semibold">Loading your incident filings...</p>
        </div>
      ) : myComplaints.length === 0 ? (
        <div className="py-12 border border-slate-200 border-dashed rounded-xl text-center space-y-2">
          <History className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-900 text-sm">No Incidents Logged</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You have not filed any incident claims yet. Approved filings are used to build anonymous platform risk scores.
          </p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="py-12 border border-slate-200 border-dashed rounded-xl text-center space-y-3 bg-slate-50/50">
          <Filter className="h-8 w-8 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No Matching Incidents Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No incident reports match the selected category chip <strong>"{FILTER_CHIPS.find(c => c.key === selectedFilter)?.label}"</strong> or your search term.
          </p>
          <button
            onClick={() => { setSelectedFilter('all'); setSearchQuery(''); }}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredComplaints.map((comp: any) => (
                <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{comp.driver_name}</td>
                  <td className="px-4 py-3 capitalize">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-semibold text-slate-700 border border-slate-200">
                      {comp.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{comp.incident_date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    <Tooltip
                      title={`${comp.severity.toUpperCase()} Severity`}
                      content={severityExplanations[comp.severity] || 'Severity level of the incident.'}
                      position="top"
                    >
                      <span className="capitalize cursor-help inline-flex items-center gap-1">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${
                          comp.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          comp.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          comp.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {comp.severity}
                        </span>
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      {onOpenChat && (
                        <button
                          onClick={() => onOpenChat(comp.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold rounded-lg transition-colors border border-amber-200 cursor-pointer shadow-2xs"
                          title="Clarify incident details with compliance admins"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
                          <span>Chat</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleExportSingle(comp)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-lg transition-colors border border-stone-300 cursor-pointer"
                        title="Download PDF Incident Dossier"
                      >
                        <FileDown className="h-3.5 w-3.5 text-stone-700" />
                        <span>PDF</span>
                      </button>
                    </div>
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

