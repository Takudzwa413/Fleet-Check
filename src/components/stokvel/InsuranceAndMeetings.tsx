import React, { useState } from 'react';
import {
  Shield, Calendar, FileText, CheckCircle2, AlertCircle,
  Download, Users, MapPin, Video, ExternalLink, Plus, RefreshCw
} from 'lucide-react';
import {
  Project,
  ProjectInsuranceRecord,
  ProjectAssemblyMeeting,
  ProjectMemberSlot,
  User
} from '../../types';

interface InsuranceAndMeetingsProps {
  project: Project;
  insuranceRecords: ProjectInsuranceRecord[];
  meetings: ProjectAssemblyMeeting[];
  slots: ProjectMemberSlot[];
  user: User;
  token: string;
  onRefresh: () => void;
}

export default function InsuranceAndMeetings({
  project,
  insuranceRecords,
  meetings,
  slots,
  user,
  token,
  onRefresh
}: InsuranceAndMeetingsProps) {
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';

  const [activeSubTab, setActiveSubTab] = useState<'meetings' | 'insurance' | 'constitution'>('meetings');

  return (
    <div className="space-y-6">
      {/* Sub Tab Switcher */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 shadow-xs flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSubTab('meetings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'meetings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Compulsory Assembly Meetings ({meetings.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('insurance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'insurance'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Santam Insurance & Tracking Records ({insuranceRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('constitution')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'constitution'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Stokvel Constitution</span>
        </button>
      </div>

      {/* Assembly Meetings Tab */}
      {activeSubTab === 'meetings' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-stone-900">Compulsory Member Assembly Schedule</h3>
              <p className="text-xs text-stone-500">Attendance is mandatory for all active slot holders. Absences attract a R500 constitutional fee.</p>
            </div>
            {project.next_meeting_date && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs">
                <span className="text-amber-800 font-bold block">Next Assembly Date:</span>
                <span className="text-stone-900 font-black">{new Date(project.next_meeting_date).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map(m => (
              <div key={m.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-stone-100 text-stone-800 font-bold text-xs rounded-lg border border-stone-200">
                    {new Date(m.meeting_date).toLocaleDateString()}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    m.status === 'scheduled' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <h4 className="font-black text-stone-900 text-sm">{m.agenda}</h4>

                <div className="text-xs text-stone-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{m.location_or_link || 'Standard Bank City / Online Stream'}</span>
                  </div>
                  {m.google_meet_url && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Video className="w-3.5 h-3.5 text-emerald-600" />
                      <a href={m.google_meet_url} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline">
                        Join Video Meeting Stream
                      </a>
                    </div>
                  )}
                </div>

                {m.minutes_notes && (
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-700 mt-2">
                    <span className="font-bold text-stone-900 block mb-0.5">Meeting Minutes Summary:</span>
                    {m.minutes_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insurance Records Tab */}
      {activeSubTab === 'insurance' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-stone-900">Santam Comprehensive Fleet Insurance & Cartrack Records</h3>
              <p className="text-xs text-stone-500">Every delivered vehicle maintains active comprehensive insurance & GPS telematics.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Member / Slot</th>
                  <th className="px-4 py-3">Insurer</th>
                  <th className="px-4 py-3">Policy Number</th>
                  <th className="px-4 py-3 text-right">Monthly Premium</th>
                  <th className="px-4 py-3 text-center">Due Day</th>
                  <th className="px-4 py-3 text-center">Tracking Provider</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {insuranceRecords.length > 0 ? (
                  insuranceRecords.map(ins => (
                    <tr key={ins.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-stone-900">{ins.user_name}</td>
                      <td className="px-4 py-3.5 font-semibold text-stone-800">{ins.insurance_provider}</td>
                      <td className="px-4 py-3.5 font-mono text-stone-700">{ins.policy_number}</td>
                      <td className="px-4 py-3.5 text-right font-black text-stone-900">R {ins.monthly_premium.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-stone-700">{ins.premium_due_day}th of month</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-semibold text-stone-800">{ins.tracker_provider}</span>
                        {ins.tracker_device_ref && (
                          <span className="block text-[10px] text-stone-400 font-mono">{ins.tracker_device_ref}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          ins.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800'
                        }`}>
                          {ins.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-400 text-xs">
                      No active insurance records yet. Records are generated upon vehicle benefit handover.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Constitution Document Tab */}
      {activeSubTab === 'constitution' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-xs font-bold uppercase tracking-wider">
                Official Legal Bylaws
              </span>
              <h3 className="text-xl font-black text-stone-900">{project.constitution_document_name || 'Action Pack Stokvel Constitution'}</h3>
              <p className="text-xs text-stone-500">Adopted and signed by all founding members. Binding under South African Law.</p>
            </div>

            <button
              onClick={() => alert('Downloading official signed PDF constitution...')}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Signed Constitution</span>
            </button>
          </div>

          <div className="space-y-4 text-xs text-stone-700 leading-relaxed max-w-4xl">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm">1. Purpose & Vehicle Acquisition Goal</h4>
              <p>The Action Pack Vehicle Acquisition Stokvel is established to pool weekly contributions over a 15-month operational cycle to acquire quality rideshare-ready passenger vehicles for member operators sequentially without exploitative predatory interest rates.</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm">2. Contribution Slots & Initial Deposit</h4>
              <p>Each Full Slot contributes R3,000 weekly with an initial security deposit of R15,000. Half Slots contribute R1,500 weekly with an initial deposit of R7,500. All EFT deposits must clear before Sunday 20:00.</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm">3. Post-Benefit Weekly Adjustment (+R1,000 / +R700)</h4>
              <p>Upon taking delivery of the acquired vehicle following roadworthy inspection, Cartrack installation, and Santam insurance, the beneficiary member receives a 1-week grace period. Thereafter, the weekly contribution increases by +R1,000/week (Full Slot) or +R700/week (Half Slot) for the remainder of the cycle.</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm">4. Default, Late Fees & Forfeiture Rules</h4>
              <p>Contributions unpaid after 24 hours of the weekly cutoff incur a 30% late penalty. Missed payments exceeding 3 consecutive weeks trigger immediate formal dismissal review, vehicle repossession, and forfeiture of 30% of paid capital to cover group losses.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
