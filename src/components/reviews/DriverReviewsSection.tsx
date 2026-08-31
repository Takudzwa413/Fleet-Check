import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, MessageSquare, ThumbsUp, Plus, CheckCircle2, AlertCircle, Sparkles, X, UserCheck, Calendar } from 'lucide-react';
import { DriverReview, DriverReviewSummary } from '../../types';

interface DriverReviewsSectionProps {
  driverId: string;
  driverName: string;
  isVerifiedFleetOwner: boolean;
  token?: string;
  onReviewSubmitted?: () => void;
}

export default function DriverReviewsSection({
  driverId,
  driverName,
  isVerifiedFleetOwner,
  token,
  onReviewSubmitted
}: DriverReviewsSectionProps) {
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [summary, setSummary] = useState<DriverReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Form State
  const [overallRating, setOverallRating] = useState(5);
  const [drivingBehavior, setDrivingBehavior] = useState(5);
  const [vehicleCare, setVehicleCare] = useState(5);
  const [punctualityPayment, setPunctualityPayment] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/drivers/${driverId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to load driver reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      fetchReviews();
    }
  }, [driverId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setSubmitError('Authentication session required to leave a review.');
      return;
    }
    if (!reviewText.trim() || reviewText.trim().length < 5) {
      setSubmitError('Please provide detailed performance notes (minimum 5 characters).');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const res = await fetch(`/api/drivers/${driverId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          overall_rating: overallRating,
          driving_behavior: drivingBehavior,
          vehicle_care: vehicleCare,
          punctuality_payment: punctualityPayment,
          review_text: reviewText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSubmitSuccess('Your verified performance feedback has been posted.');
      setReviewText('');
      await fetchReviews();
      if (onReviewSubmitted) onReviewSubmitted();
      setTimeout(() => {
        setShowReviewModal(false);
        setSubmitSuccess('');
      }, 1200);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  // Star selector helper component
  const StarPicker = ({
    value,
    onChange,
    label
  }: {
    value: number;
    onChange: (val: number) => void;
    label: string;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-stone-500 font-bold">{value} / 5</span>
      </div>
      <div className="flex items-center space-x-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => onChange(star)}
            className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition-colors cursor-pointer"
          >
            <Star
              className={`h-5 w-5 ${
                star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Fleet Owner Performance Feedback & Ratings
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-bold border border-stone-200">
              Verified Reviews
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Real peer references and performance metrics logged by verified fleet operators.
          </p>
        </div>

        {isVerifiedFleetOwner ? (
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[38px]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Leave Performance Review</span>
          </button>
        ) : (
          <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-stone-400" />
            <span>Only verified fleet owners can submit reviews</span>
          </div>
        )}
      </div>

      {/* Aggregate Score Card */}
      {summary && (
        <div className="bg-[#fcfbf7] border border-stone-200/90 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Main Average */}
          <div className="md:col-span-4 text-center md:text-left space-y-1.5 border-b md:border-b-0 md:border-r border-stone-200 pb-4 md:pb-0 md:pr-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center md:justify-start space-x-2">
              <span>{summary.average_overall > 0 ? summary.average_overall.toFixed(1) : 'No Ratings'}</span>
              {summary.average_overall > 0 && (
                <span className="text-base text-slate-400 font-normal">/ 5.0</span>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(summary.average_overall)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-stone-300'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-500 font-semibold ml-1.5">
                ({summary.total_reviews} {summary.total_reviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Audited feedback from South African fleet partners.
            </p>
          </div>

          {/* Subcategory Metrics */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-stone-200/80 rounded-xl p-3 space-y-1 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Driving Behavior</div>
              <div className="text-lg font-black text-slate-900 flex items-center space-x-1">
                <span>{summary.average_driving_behavior > 0 ? summary.average_driving_behavior.toFixed(1) : 'N/A'}</span>
                {summary.average_driving_behavior > 0 && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-[10px] text-slate-400">Smooth trips & vehicle handling</p>
            </div>

            <div className="bg-white border border-stone-200/80 rounded-xl p-3 space-y-1 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vehicle Care</div>
              <div className="text-lg font-black text-slate-900 flex items-center space-x-1">
                <span>{summary.average_vehicle_care > 0 ? summary.average_vehicle_care.toFixed(1) : 'N/A'}</span>
                {summary.average_vehicle_care > 0 && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-[10px] text-slate-400">Cleanliness & tyre/fluid care</p>
            </div>

            <div className="bg-white border border-stone-200/80 rounded-xl p-3 space-y-1 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Punctuality & Targets</div>
              <div className="text-lg font-black text-slate-900 flex items-center space-x-1">
                <span>{summary.average_punctuality_payment > 0 ? summary.average_punctuality_payment.toFixed(1) : 'N/A'}</span>
                {summary.average_punctuality_payment > 0 && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-[10px] text-slate-400">Timeous handover & deposits</p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading performance feedback...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-1.5">
            <MessageSquare className="h-6 w-6 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No Fleet Owner Reviews Logged Yet</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Be the first verified fleet operator to leave performance and behavioral feedback on {driverName}.
            </p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center space-x-2">
                  <div className="h-7 w-7 rounded-lg bg-[#1f1f1f] text-white flex items-center justify-center font-bold text-xs">
                    {rev.fleet_owner_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>{rev.fleet_owner_company || rev.fleet_owner_name}</span>
                      {rev.verified_fleet_owner && (
                        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          <span>Verified Owner</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Reviewed by {rev.fleet_owner_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= rev.overall_rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(rev.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100 italic">
                "{rev.review_text}"
              </p>

              {/* Sub-ratings badges */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                {rev.driving_behavior && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Driving: <strong>{rev.driving_behavior}/5</strong>
                  </span>
                )}
                {rev.vehicle_care && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Vehicle Care: <strong>{rev.vehicle_care}/5</strong>
                  </span>
                )}
                {rev.punctuality_payment && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Punctuality & Target: <strong>{rev.punctuality_payment}/5</strong>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Leave Performance Review
                </h3>
                <p className="text-xs text-slate-500">
                  Rating driver: <strong>{driverName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* Star Selectors */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-3.5 border border-slate-200/80">
                <StarPicker
                  label="Overall Rating & Satisfaction"
                  value={overallRating}
                  onChange={setOverallRating}
                />
                <div className="h-px bg-slate-200/70" />
                <StarPicker
                  label="Driving Behavior & Safety"
                  value={drivingBehavior}
                  onChange={setDrivingBehavior}
                />
                <div className="h-px bg-slate-200/70" />
                <StarPicker
                  label="Vehicle Care & Cleanliness"
                  value={vehicleCare}
                  onChange={setVehicleCare}
                />
                <div className="h-px bg-slate-200/70" />
                <StarPicker
                  label="Punctuality & Payment Target Compliance"
                  value={punctualityPayment}
                  onChange={setPunctualityPayment}
                />
              </div>

              {/* Review Text */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Detailed Performance Commentary & Reference Notes
                </label>
                <textarea
                  required
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="e.g. Sipho operated a Toyota Corolla for 8 months. Consistent weekly deposits, returned vehicle immaculate, zero speeding infractions..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-slate-400 leading-relaxed"
                />
                <span className="text-[10px] text-slate-400 block">
                  Your feedback is verified with your registered fleet owner identity and helps keep the industry safe.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <span>Publishing...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Post Verified Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
