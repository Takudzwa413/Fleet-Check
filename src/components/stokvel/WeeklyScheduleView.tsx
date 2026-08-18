import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, Clock, AlertCircle, ShieldAlert,
  DollarSign, Filter, RefreshCw, ChevronRight, Award, Info
} from 'lucide-react';
import {
  Project,
  ProjectContributionSchedule,
  ProjectMemberSlot,
  User
} from '../../types';

interface WeeklyScheduleViewProps {
  project: Project;
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  onOpenUploadPOP: (slotId?: string) => void;
}

export default function WeeklyScheduleView({
  project,
  slots,
  user,
  token,
  onOpenUploadPOP
}: WeeklyScheduleViewProps) {
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';
  const userSlot = slots.find(s => s.user_id === user.id);
  
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    userSlot ? userSlot.id : (slots[0]?.id || '')
  );
  const [schedules, setSchedules] = useState<ProjectContributionSchedule[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedSlotId || isPrivileged) {
      fetchSchedules();
    }
  }, [selectedSlotId, project.id]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      let url = `/api/stokvel/projects/${project.id}/schedules`;
      if (selectedSlotId) {
        url += `?slot_id=${selectedSlotId}`;
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeSlot = slots.find(s => s.id === selectedSlotId);

  const filteredSchedules = schedules.filter(s => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unpaid') return s.status !== 'paid';
    return s.status === statusFilter;
  });

  const paidCount = schedules.filter(s => s.status === 'paid').length;
  const totalWeeks = schedules.length || project.total_weeks;
  const totalDueAmount = schedules.reduce((acc, s) => acc + s.expected_amount, 0);
  const totalPaidAmount = schedules.reduce((acc, s) => acc + s.amount_paid, 0);
  const totalOutstanding = schedules.reduce((acc, s) => acc + s.outstanding_amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Filter & Slot Selector Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span>Weekly Contribution Schedule ({project.duration_months} Months)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Full breakdown of weekly obligations from Week 1 to Week {project.total_weeks}. Cycle Anchor: Every {project.week_start_day}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isPrivileged && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-500">Slot:</label>
                <select
                  value={selectedSlotId}
                  onChange={e => setSelectedSlotId(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl outline-none"
                >
                  {slots.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.payout_position} - {s.user_name} ({s.slot_type_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => onOpenUploadPOP(selectedSlotId)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Make Weekly Payment
            </button>
          </div>
        </div>

        {/* Slot Summary Chips */}
        {activeSlot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 block text-[10px] uppercase font-bold">Slot Standing</span>
              <span className="font-black text-stone-900 capitalize">{activeSlot.status.replace('_', ' ')}</span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 block text-[10px] uppercase font-bold">Weeks Completed</span>
              <span className="font-black text-emerald-700">{paidCount} of {totalWeeks}</span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 block text-[10px] uppercase font-bold">Total Paid</span>
              <span className="font-black text-stone-900">R {totalPaidAmount.toLocaleString()}</span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 block text-[10px] uppercase font-bold">Total Outstanding</span>
              <span className={`font-black ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                R {totalOutstanding.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Weeks ({schedules.length})
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'unpaid' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Unpaid / Due ({schedules.filter(s => s.status !== 'paid').length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'paid' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Paid ({paidCount})
          </button>
        </div>

        <span className="text-xs text-stone-500">
          Showing {filteredSchedules.length} obligations
        </span>
      </div>

      {/* Schedule Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-center">Week</th>
                <th className="px-4 py-3">Cycle Date Range</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Expected</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-stone-50/70 transition-colors ${
                      item.status === 'due' ? 'bg-amber-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-stone-100 text-stone-900 font-bold rounded-lg text-xs">
                        W{item.week_number}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-stone-800">
                      {item.week_start_date} <span className="text-stone-400">→</span> {item.week_end_date}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">
                      {item.due_date}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                      R {item.expected_amount.toLocaleString()}
                      {item.notes && (
                        <span className="block text-[10px] font-normal text-purple-600">
                          {item.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                      R {item.amount_paid.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold">
                      {item.outstanding_amount > 0 ? (
                        <span className="text-red-600">R {item.outstanding_amount.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-700">R 0</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        item.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'partially_paid'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : item.status === 'due'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : item.status === 'in_arrears'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {item.status !== 'paid' ? (
                        <button
                          onClick={() => onOpenUploadPOP(item.slot_id)}
                          className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          Pay POP
                        </button>
                      ) : (
                        <span className="text-emerald-600 text-xs font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-400 text-xs">
                    No weekly obligations found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
