import React, { useState } from 'react';
import {
  Car, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  Award, FileCheck, Key, Plus, RefreshCw, AlertCircle, Wrench
} from 'lucide-react';
import {
  Project,
  ProjectMemberSlot,
  ProjectBenefitDelivery,
  User
} from '../../types';

interface VehicleBenefitPipelineProps {
  project: Project;
  slots: ProjectMemberSlot[];
  benefits: ProjectBenefitDelivery[];
  user: User;
  token: string;
  onRefresh: () => void;
}

export default function VehicleBenefitPipeline({
  project,
  slots,
  benefits,
  user,
  token,
  onRefresh
}: VehicleBenefitPipelineProps) {
  const isPrivileged = user.role === 'admin' || user.role === 'accountant';
  const isAdmin = user.role === 'admin';

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id || '');
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Rumion 1.5 TX');
  const [vehicleYear, setVehicleYear] = useState('2023');
  const [vinNumber, setVinNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(245000);
  const [dealerName, setDealerName] = useState('McCarthy Toyota Boksburg');
  const [trackerDeviceRef, setTrackerDeviceRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handover confirmation modal
  const [completingBenefitId, setCompletingBenefitId] = useState<string | null>(null);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [handoverLoading, setHandoverLoading] = useState(false);

  const handleOpenRecord = (slotId?: string) => {
    if (slotId) setSelectedSlotId(slotId);
    setVinNumber(`AHTZZ${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setRegistrationNumber(`CA ${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`);
    setTrackerDeviceRef(`CT-${Math.floor(100000 + Math.random() * 900000)}`);
    setErrorMsg('');
    setSuccessMsg('');
    setIsRecordModalOpen(true);
  };

  const handleSaveBenefitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetSlot = slots.find(s => s.id === selectedSlotId);
      if (!targetSlot) throw new Error('Select a valid member slot before recording a vehicle acquisition.');

      const res = await fetch(`/api/stokvel/projects/${project.id}/vehicle-benefits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          slot_id: selectedSlotId,
          user_id: targetSlot.user_id,
          user_name: targetSlot.user_name,
          payout_position: targetSlot.payout_position,
          payout_amount: targetSlot.payout_amount,
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          vehicle_year: vehicleYear,
          vin: vinNumber,
          registration_number: registrationNumber,
          purchase_price: Number(purchasePrice),
          seller_dealer_name: dealerName,
          tracker_installed: true,
          tracker_provider: 'Cartrack',
          tracker_reference: trackerDeviceRef,
          insurance_confirmed: true,
          member_approved_costs: true,
          status: 'purchased',
          admin_notes: notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record vehicle benefit');

      setSuccessMsg('Vehicle acquisition record saved. Ready for member handover.');
      setTimeout(() => {
        setIsRecordModalOpen(false);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteHandover = async () => {
    if (!completingBenefitId) return;
    setHandoverLoading(true);

    try {
      const res = await fetch(`/api/stokvel/projects/${project.id}/vehicle-benefits/${completingBenefitId}/handover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          grace_period_days: gracePeriodDays,
          handover_notes: 'Vehicle keys transferred with Cartrack certificate and Santam policy.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete handover');

      alert('Vehicle successfully handed over! 1-Week grace period initiated and post-benefit contribution rate adjustment applied.');
      setCompletingBenefitId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setHandoverLoading(false);
    }
  };

  const sortedSlots = [...slots].sort((a, b) => (a.payout_position || 99) - (b.payout_position || 99));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Car className="w-5 h-5 text-purple-600" />
            <span>Vehicle Acquisition & Handover Pipeline</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Tracking vehicle inspections, Cartrack installations, Santam fleet insurance, and post-benefit contribution rate adjustments.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => handleOpenRecord()}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Record Vehicle Acquisition</span>
          </button>
        )}
      </div>

      {/* Sequential Ladder Cards */}
      <div className="space-y-4">
        {sortedSlots.map((slot, idx) => {
          const benefit = benefits.find(b => b.slot_id === slot.id);
          const isNext = !slot.benefit_received && sortedSlots.slice(0, idx).every(s => s.benefit_received);

          return (
            <div
              key={slot.id}
              className={`bg-white border rounded-2xl p-5 sm:p-6 transition-all shadow-xs ${
                slot.benefit_received
                  ? 'border-purple-200 bg-purple-50/20'
                  : isNext
                  ? 'border-amber-300 ring-2 ring-amber-400/20'
                  : 'border-stone-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-stone-900 text-white font-black text-xs rounded-lg">
                      Position #{slot.payout_position}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200">
                      {slot.slot_type_name}
                    </span>
                    {slot.benefit_received ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Handover Complete
                      </span>
                    ) : isNext ? (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 animate-pulse">
                        Current Priority for Acquisition
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500 font-medium">
                        Queued in Sequence
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-stone-900">{slot.user_name}</h3>
                  {/* Non-privileged viewers only receive full financial figures for their OWN
                      slot - other members' slots are sanitized for privacy by the API (see
                      GET .../slots in projectRoutes.ts), so these fields are undefined here. */}
                  {typeof slot.payout_amount === 'number' && typeof (slot.current_weekly_contribution ?? slot.weekly_contribution) === 'number' ? (
                    <p className="text-xs text-stone-500">
                      Acquisition Target: <strong className="text-stone-800">R {slot.payout_amount.toLocaleString()}</strong> |
                      Post-Handover Weekly Rate: <strong className="text-purple-700">R {(slot.current_weekly_contribution ?? slot.weekly_contribution)!.toLocaleString()}/wk (+{slot.slot_type === 'full' ? 'R1,000' : 'R700'})</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 italic">Financial details are private.</p>
                  )}
                </div>

                {/* Right Side: Benefit Status & Details */}
                <div className="flex flex-wrap items-center gap-3">
                  {benefit ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs space-y-1.5 min-w-[260px]">
                      <div className="flex justify-between font-bold text-stone-900">
                        <span>{benefit.vehicle_year} {benefit.vehicle_make} {benefit.vehicle_model}</span>
                        <span>R {benefit.purchase_price.toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex justify-between">
                        <span>Plate: {benefit.registration_number}</span>
                        <span className="font-mono">{benefit.vin_number}</span>
                      </div>
                      <div className="pt-1 border-t border-stone-200 flex items-center gap-2 text-[10px] text-stone-600">
                        <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Inspected
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Cartrack
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Santam
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-stone-400 italic">
                      No vehicle filed yet.
                    </div>
                  )}

                  {isPrivileged && (
                    <div className="flex flex-col gap-2">
                      {!benefit && (
                        <button
                          onClick={() => handleOpenRecord(slot.id)}
                          className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Record Vehicle Specs
                        </button>
                      )}

                      {benefit && benefit.status !== 'completed' && (
                        <button
                          onClick={() => setCompletingBenefitId(benefit.id)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Execute Handover
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Record Vehicle Specs Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">Record Vehicle Acquisition Data</h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveBenefitRecord} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700 uppercase">Target Slot</label>
                <select
                  value={selectedSlotId}
                  onChange={e => setSelectedSlotId(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                >
                  {slots.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.payout_position} - {s.user_name} ({s.slot_type_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 uppercase">Make</label>
                  <input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-xl" required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 uppercase">Model</label>
                  <input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-xl" required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 uppercase">Year</label>
                  <input type="text" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-xl" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 uppercase">VIN Number</label>
                  <input type="text" value={vinNumber} onChange={e => setVinNumber(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-xl font-mono" required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 uppercase">Registration Plate</label>
                  <input type="text" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-xl font-mono" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 uppercase">Purchase Price (ZAR)</label>
                  <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(Number(e.target.value))} className="w-full p-2.5 border border-stone-300 rounded-xl font-bold" required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 uppercase">Dealer Name</label>
                  <input type="text" value={dealerName} onChange={e => setDealerName(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-xl" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 uppercase">Cartrack Device Serial Ref</label>
                <input type="text" value={trackerDeviceRef} onChange={e => setTrackerDeviceRef(e.target.value)} className="w-full p-2.5 border border-stone-300 rounded-xl font-mono" required />
              </div>

              {errorMsg && <div className="p-3 bg-red-50 text-red-800 font-semibold rounded-xl">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 text-emerald-800 font-semibold rounded-xl">{successMsg}</div>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsRecordModalOpen(false)} className="flex-1 py-2.5 bg-stone-100 font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-stone-900 text-white font-bold rounded-xl">
                  {submitting ? 'Saving...' : 'Save Acquisition Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover Confirmation Modal */}
      {completingBenefitId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 text-purple-900 rounded-xl">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Confirm Vehicle Handover</h3>
                <p className="text-xs text-stone-500">Initiate grace period & post-benefit rate adjustment</p>
              </div>
            </div>

            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-1.5">
              <p className="font-bold">Constitutional Rule Execution:</p>
              <ul className="list-disc pl-4 space-y-1 text-purple-900">
                <li>A <strong>1-week grace period ({gracePeriodDays} days)</strong> will commence immediately.</li>
                <li>Future weekly contribution rate will increase automatically by <strong>+R1,000/wk (Full Slot)</strong> or <strong>+R700/wk (Half Slot)</strong>.</li>
                <li>Member will receive active fleet access certificate.</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompletingBenefitId(null)}
                className="flex-1 py-2.5 bg-stone-100 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={handoverLoading}
                onClick={handleExecuteHandover}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                {handoverLoading ? 'Executing...' : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
