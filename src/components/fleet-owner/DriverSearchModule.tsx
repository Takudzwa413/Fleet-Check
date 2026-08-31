import React from 'react';
import { Search, Info, RefreshCw, Eye, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle, AlertCircle, UserCheck, Flame, ArrowUpRight } from 'lucide-react';
import { MaskedDriver } from '../../types';
import { Tooltip, MetricTooltip, RiskBadgeWithTooltip, StatusBadgeWithTooltip } from '../ui/Tooltip';
import DriverReviewsSection from '../reviews/DriverReviewsSection';
import DriverVerificationModal from './DriverVerificationModal';

interface DriverSearchModuleProps {
  isVerified: boolean;
  token: string;
  getRiskColorBadge: (level: string) => string;
  initialQuery?: string;
  onSearchExecuted?: () => void;
}

export default function DriverSearchModule({
  isVerified,
  token,
  getRiskColorBadge,
  initialQuery,
  onSearchExecuted
}: DriverSearchModuleProps) {
  // Search State
  const [searchQuery, setSearchQuery] = React.useState(initialQuery || '');
  const [searchCity, setSearchCity] = React.useState('');
  const [searchProvince, setSearchProvince] = React.useState('');
  const [searchPlatform, setSearchPlatform] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<MaskedDriver[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');

  // Selected Driver Dossier State
  const [selectedDriver, setSelectedDriver] = React.useState<MaskedDriver | null>(null);
  const [dossierComplaints, setDossierComplaints] = React.useState<any[]>([]);
  const [dossierLoading, setDossierLoading] = React.useState(false);
  const [showVerifyModal, setShowVerifyModal] = React.useState(false);

  // Sync external query if passed or run initial search on mount
  React.useEffect(() => {
    if (initialQuery !== undefined) {
      setSearchQuery(initialQuery);
      executeSearchWithParams(initialQuery, searchPlatform, searchCity, searchProvince);
    } else {
      executeSearchWithParams('', searchPlatform, searchCity, searchProvince);
    }
  }, [initialQuery]);

  const executeSearchWithParams = async (q: string, platform?: string, city?: string, province?: string) => {
    if (!isVerified) {
      setSearchError('Access Denied. Your profile must be verified by an administrator before you can query driver records.');
      return;
    }
    setSearchError('');
    setSearchLoading(true);
    setSelectedDriver(null);
    try {
      const queryParams = new URLSearchParams({
        query: q,
        city: city || '',
        province: province || '',
        platform: platform || ''
      });
      const res = await fetch(`/api/drivers/search?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 100)}`);
      }
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setSearchResults(data.results || []);
      if (onSearchExecuted) onSearchExecuted();
    } catch (err: any) {
      setSearchError(err.message || 'Driver search query failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDriverSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearchWithParams(searchQuery, searchPlatform, searchCity, searchProvince);
  };

  const handleQuickTrendingSearch = (trendingTerm: string) => {
    setSearchQuery(trendingTerm);
    executeSearchWithParams(trendingTerm, searchPlatform, searchCity, searchProvince);
  };

  const loadDriverDossier = async (driverId: string) => {
    setDossierLoading(true);
    setSelectedDriver(null);
    try {
      const res = await fetch(`/api/drivers/${driverId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 100)}`);
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load driver dossier');
      setSelectedDriver(data.driver);
      setDossierComplaints(data.complaints || []);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to load driver dossier');
    } finally {
      setDossierLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
      {/* Left panel: Search filter */}
      <div className="xl:col-span-4 bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xs">
        <div>
          <h3 className="font-bold text-stone-900 text-base tracking-tight">Driver Search Gateway</h3>
          <p className="text-stone-500 text-xs mt-1">Enter driver identifiers to execute an exact match reference scan.</p>
        </div>
        
        <form onSubmit={handleDriverSearch} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Driver query (Name, Phone, Email, or ID)</label>
            <input
              type="text"
              placeholder="e.g. Sipho Sithole or 9204125..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 placeholder-stone-400 min-h-[44px] bg-stone-50/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">E-hailing Platform</label>
            <select
              value={searchPlatform}
              onChange={e => setSearchPlatform(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-stone-800 min-h-[44px]"
            >
              <option value="">All platforms</option>
              <option value="Uber">Uber</option>
              <option value="Bolt">Bolt</option>
              <option value="inDrive">inDrive</option>
            </select>
          </div>

          {searchError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
              {searchError}
            </div>
          )}

          <button
            type="submit"
            disabled={searchLoading}
            className="w-full py-2.5 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
          >
            {searchLoading ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-1.5" />
                <span>Scanning Registry...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-1.5" />
                <span>Execute Risk Scan</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Trending Searches */}
        <div className="space-y-2.5 pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-600" />
              <span>Trending Searches</span>
            </span>
            <span className="text-[10px] text-stone-400 font-medium">Quick scan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Sipho Sithole', q: 'Sipho Sithole' },
              { label: 'Uber Fleet JHB', q: 'Uber Fleet Drivers' },
              { label: 'Code 8 PDP', q: 'Bolt Code 8 PDP' },
              { label: 'Takudzwa', q: 'Takudzwa Hanyire' },
              { label: 'Zero Incident', q: 'Zero Incident Clearance' },
              { label: 'Cape Town inDrive', q: 'Cape Town inDrive' }
            ].map(chip => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleQuickTrendingSearch(chip.q)}
                className="px-2.5 py-1.5 bg-stone-50 hover:bg-[#f6f7ed] border border-stone-200 hover:border-stone-400 rounded-xl text-xs font-semibold text-stone-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>{chip.label}</span>
                <ArrowUpRight className="h-3 w-3 text-stone-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-stone-100"></div>
        <div className="text-[11px] text-stone-400 leading-relaxed flex items-start space-x-2 font-medium">
          <Info className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
          <span>All reference queries are logged immediately for compliance, audits, and POPIA privacy guidelines. Any mass scraping will cause account lockouts.</span>
        </div>
      </div>

      {/* Right panel: Search results or Dossier */}
      <div className="xl:col-span-8 space-y-4 w-full">
        {dossierLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3">
            <RefreshCw className="animate-spin h-6 w-6 mx-auto text-stone-700" />
            <p className="text-xs font-semibold">Generating Driver Risk Report...</p>
          </div>
        )}

        {/* Detailed Driver Dossier View */}
        {selectedDriver && !dossierLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs" id="driver-dossier">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold uppercase rounded-full">
                  Risk Dossier Report
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {selectedDriver.first_name} {selectedDriver.surname}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <strong>POPIA Masked ID:</strong> {selectedDriver.id_number_masked}
                    <Tooltip
                      title="POPIA Data Privacy Protection"
                      content="Driver personal identifiers are masked under the South African Protection of Personal Information Act. Full verification details are audited."
                      position="top"
                    />
                  </div>
                  <div><strong>Secured Contact:</strong> {selectedDriver.phone_masked}</div>
                  <div><strong>Active Town:</strong> {selectedDriver.city}, {selectedDriver.province}</div>
                  <div><strong>Placements:</strong> {selectedDriver.platform}</div>
                </div>
              </div>

              <div className="text-right flex flex-col justify-end items-end gap-2">
                <RiskBadgeWithTooltip
                  riskLevel={selectedDriver.risk_level}
                  score={selectedDriver.risk_score}
                  badgeClass={`px-3.5 py-1 text-sm font-black border rounded-full uppercase tracking-wider ${getRiskColorBadge(selectedDriver.risk_level)}`}
                />
                <Tooltip
                  title="Risk Score Algorithm (0-100)"
                  content="Scoring Formula: Baseline score 0. Weighted by verified incident severity (Critical: +35, High: +20, Medium: +10, Low: +5). Recency decay reduces impact of older resolved incidents."
                  position="left"
                >
                  <span className="text-[11px] text-slate-400 cursor-help flex items-center gap-1">
                    <span>Risk Rating Score: <strong>{selectedDriver.risk_score}/100</strong></span>
                    <HelpCircle className="h-3 w-3 text-stone-400" />
                  </span>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="mt-1 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verify Driver</span>
                </button>
              </div>
            </div>

            {/* Score breakdown metrics card */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Incident Summary</span>
                  <Tooltip
                    title="Verified Incidents"
                    content="Count of substantiated complaints filed by registered fleet owners and confirmed with supporting documentation."
                    position="top"
                  />
                </div>
                <span className="text-2xl font-black text-slate-900">{selectedDriver.approved_complaints_count} Record(s)</span>
                <span className="text-[10px] text-slate-500 block">Verified complaints approved by admins</span>
              </div>
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Last Record Date</span>
                  <Tooltip
                    title="Incident Timeline"
                    content="Date on which the most recent verified incident report was filed and approved."
                    position="top"
                  />
                </div>
                <span className="text-base font-bold text-slate-900">{selectedDriver.last_incident_date || 'No incident'}</span>
                <span className="text-[10px] text-slate-500 block">Date of last approved incident filing</span>
              </div>
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Suggested Caution</span>
                  <Tooltip
                    title="Fleet Vetting Advisory"
                    content="Automated risk recommendation calculated from incident severity and dispute status."
                    position="top"
                  />
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  {selectedDriver.risk_level === 'high' || selectedDriver.risk_level === 'critical' 
                    ? '🚫 Extreme Caution: Recommended to avoid handing over vehicle.' 
                    : selectedDriver.risk_level === 'medium'
                    ? '⚠️ Mild Caution: Double check references & secure high deposits.'
                    : '✅ Normal: Satisfactory standing in database.'}
                </p>
              </div>
            </div>

            {/* List of complaints details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Verified Incident Log Details</h4>
              
              {dossierComplaints.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-6">No specific complaints are listed for this profile.</p>
              ) : (
                <div className="space-y-4">
                  {dossierComplaints.map((comp: any) => {
                    const severityExplanations: Record<string, string> = {
                      critical: 'Critical Severity (+35 pts): Severe breach, unlawful vehicle retention, or severe safety violation.',
                      high: 'High Severity (+20 pts): Serious contractual breach, extensive damage, or substantial non-payment.',
                      medium: 'Medium Severity (+10 pts): Moderate infractions, late returns, or minor vehicle neglect.',
                      low: 'Low Severity (+5 pts): Minor operational disagreements or low-impact administrative issues.'
                    };
                    return (
                      <div key={comp.id} className="border border-slate-200 rounded-xl p-4 space-y-2.5 hover:bg-slate-50/20 transition-all shadow-2xs">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase tracking-wider border border-slate-200">
                              {comp.category.replace('_', ' ')}
                            </span>
                            <Tooltip
                              title={`${comp.severity.toUpperCase()} Severity Incident`}
                              content={severityExplanations[comp.severity] || 'Assigned severity rating based on platform incident matrix.'}
                              position="top"
                            >
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border cursor-help inline-flex items-center gap-1 ${
                                comp.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-100' :
                                comp.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                comp.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-700'
                              }`}>
                                <span>{comp.severity} Severity</span>
                                <HelpCircle className="h-2.5 w-2.5 opacity-60" />
                              </span>
                            </Tooltip>
                          </div>

                          <span className="text-xs text-slate-400 font-semibold">{comp.incident_date}</span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 italic">
                          "{comp.description}"
                        </p>

                        <div className="flex flex-wrap justify-between items-center text-[11px] text-slate-400 gap-2 border-t border-slate-100 pt-2 font-medium">
                          <div>
                            Reported by: <span className="font-bold text-slate-700">{comp.reporter_company}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span>Vehicle: <strong>{comp.vehicle_make_model} ({comp.vehicle_registration})</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span>Resolution:</span>
                              <StatusBadgeWithTooltip
                                status={comp.resolution_status}
                                badgeClass="font-bold text-slate-700"
                                customExplanation="Current dispute or settlement stage of this recorded incident."
                              />
                            </span>
                          </div>
                        </div>

                        {/* Disputes flag */}
                        {comp.status === 'disputed' && (
                          <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-800 space-y-1 font-semibold">
                            <span className="font-bold flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Record Disputed by Driver</span>
                            </span>
                            <p className="font-normal text-red-700">This incident is under active dispute review. Driver counter-arguments are being validated by the compliance desk.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Performance Ratings & Verified Feedback Section */}
            <DriverReviewsSection
              driverId={selectedDriver.id}
              driverName={`${selectedDriver.first_name} ${selectedDriver.surname}`}
              isVerifiedFleetOwner={isVerified}
              token={token}
            />

            <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Verify Driver Documentation</span>
              </button>

              <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Back to Results
              </button>
            </div>
          </div>
        )}

        {/* Driver Verification Modal */}
        {showVerifyModal && selectedDriver && (
          <DriverVerificationModal
            driverId={selectedDriver.id}
            driverName={`${selectedDriver.first_name} ${selectedDriver.surname}`}
            token={token}
            onClose={() => setShowVerifyModal(false)}
            onVerificationSubmitted={() => {}}
          />
        )}

        {/* Results Listings (Summary view) */}
        {!selectedDriver && !dossierLoading && (
          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <div className="bg-white border border-stone-200/90 rounded-3xl p-10 sm:p-14 text-center text-stone-500 space-y-4 shadow-2xs min-h-[380px] flex flex-col items-center justify-center">
                <div className="h-16 w-16 rounded-2xl bg-stone-100/80 border border-stone-200 flex items-center justify-center text-stone-400">
                  <CheckCircle className="h-8 w-8 text-stone-400" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h4 className="font-bold text-stone-900 text-base">No Active Search Selected</h4>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    Fill out the query form on the left to verify active risk incident reports, commercial track records, and licensing clearances.
                  </p>
                </div>
              </div>
            ) : (
              searchResults.map(drv => (
                <div
                  key={drv.id}
                  className="bg-white border border-stone-200/90 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs hover:shadow-xs transition-all hover:border-stone-300"
                >
                  <div className="space-y-2 w-full sm:w-auto flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-stone-900 text-base">{drv.first_name} {drv.surname}</h4>
                      <RiskBadgeWithTooltip
                        riskLevel={drv.risk_level}
                        score={drv.risk_score}
                        badgeClass={`px-2.5 py-0.5 text-[10px] font-bold border rounded-full uppercase tracking-wider ${getRiskColorBadge(drv.risk_level)}`}
                      />
                      {drv.is_disputed && (
                        <StatusBadgeWithTooltip
                          status="disputed"
                          label="Disputed"
                          badgeClass="px-2 py-0.5 bg-red-100 text-red-800 text-[9px] font-bold rounded uppercase"
                          customExplanation="Driver has formally disputed one or more records in this file. Compliance team is verifying counter-claims."
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-600 font-medium">
                      <div><span className="font-bold text-stone-400">Phone:</span> {drv.phone_masked}</div>
                      <div><span className="font-bold text-stone-400">Email:</span> {drv.email_masked}</div>
                      <div><span className="font-bold text-stone-400">ID Masked:</span> {drv.id_number_masked}</div>
                      <div><span className="font-bold text-stone-400">City:</span> {drv.city}, {drv.province}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => loadDriverDossier(drv.id)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px] shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Inspect Dossier</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
