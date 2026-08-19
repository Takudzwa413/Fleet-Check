import React from 'react';
import { Search, Info, Shield, CheckCircle, AlertTriangle, Eye, ArrowRight, BookOpen, AlertCircle, FileCheck, Landmark, Check } from 'lucide-react';
import { MaskedDriver, User } from '../types';

interface PublicPagesProps {
  user: User | null;
  isVerified: boolean;
  activeTab: 'home' | 'how-it-works' | 'privacy' | 'terms';
  setActiveTab: (tab: string) => void;
  onSearch: (filters: any) => Promise<MaskedDriver[]>;
  onSelectDriver: (driverId: string) => void;
}

export default function PublicPages({
  user,
  isVerified,
  activeTab,
  setActiveTab,
  onSearch,
  onSelectDriver
}: PublicPagesProps) {
  // Search state
  const [name, setName] = React.useState('');
  const [surname, setSurname] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [platform, setPlatform] = React.useState('All');
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<MaskedDriver[] | null>(null);
  const [error, setError] = React.useState('');

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !surname && !phone && !email) {
      setError('Please provide at least a Name, Surname, Phone, or Email to search.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await onSearch({ name, surname, phone, email, city: '', province: '', platform: platform === 'All' ? '' : platform });
      setResults(res);
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'none': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'low': return 'bg-stone-100 text-stone-800 border-stone-200';
      case 'medium': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'high': return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'critical': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  if (activeTab === 'home') {
    return (
      <div className="space-y-8 sm:space-y-12">
        {/* Simple elegant Hero */}
        <div className="text-center py-4 sm:py-8 max-w-3xl mx-auto space-y-4 px-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#1f1f1f] leading-tight">
            Verified Driver Risk & Reference System
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
            A secure, moderated platform enabling fleet operators to make informed, reference-backed decisions before handing over vehicles to e-hailing drivers.
          </p>
          <div className="flex justify-center gap-2 sm:gap-3 flex-wrap pt-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-stone-700 font-semibold text-xs rounded-full border border-stone-200 shadow-2xs">
              <Shield className="h-3.5 w-3.5 text-[#1f1f1f]" />
              <span>Strictly Moderated</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-stone-700 font-semibold text-xs rounded-full border border-stone-200 shadow-2xs">
              <Check className="h-3.5 w-3.5 text-[#1f1f1f]" />
              <span>Evidence Required</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-stone-700 font-semibold text-xs rounded-full border border-stone-200 shadow-2xs">
              <Info className="h-3.5 w-3.5 text-stone-600" />
              <span>Driver Right of Dispute</span>
            </span>
          </div>
        </div>

        {/* Unified Search Section */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden" id="search-section">
          <div className="border-b border-stone-200 bg-[#f6f7ed] px-5 sm:px-6 py-4 sm:py-5">
            <h2 className="text-sm sm:text-base font-bold text-[#1f1f1f] flex items-center space-x-2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[#1f1f1f]" />
              <span>Quick Driver Search Gateway</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Public search results are masked to ensure driver privacy. Full details and evidence are restricted to verified operators.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sipho"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full min-h-[44px] text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all placeholder-stone-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">Surname</label>
                <input
                  type="text"
                  placeholder="e.g. Kumalo"
                  value={surname}
                  onChange={e => setSurname(e.target.value)}
                  className="w-full min-h-[44px] text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all placeholder-stone-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0831112222"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full min-h-[44px] text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all placeholder-stone-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. driver@mail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full min-h-[44px] text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all placeholder-stone-400 bg-white"
                />
              </div>
            </div>

            <div className="pt-1">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">Preferred Platform</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full min-h-[44px] text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all text-[#1f1f1f]"
                >
                  <option value="All">All Platforms</option>
                  <option value="Uber">Uber</option>
                  <option value="Bolt">Bolt</option>
                  <option value="inDrive">inDrive</option>
                  <option value="Didi">DiDi</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto min-h-[44px] px-6 py-3 text-sm font-semibold text-white bg-[#1f1f1f] hover:bg-black disabled:bg-stone-300 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Run Incident Scan</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Block */}
          {results !== null && (
            <div className="border-t border-stone-200 bg-[#f6f7ed]/50 p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#1f1f1f]">
                Found {results.length} record match(es)
              </h3>

              {results.length === 0 ? (
                <div className="text-center py-10 sm:py-12 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-2xs px-4">
                  <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
                  <h4 className="text-[#1f1f1f] font-bold text-sm">No Active Incidents Found</h4>
                  <p className="text-stone-500 text-xs max-w-md mx-auto leading-relaxed font-normal">
                    No approved incident or risk logs were found matching those exact search parameters. Always verify drivers directly with physical interviews.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map(drv => (
                    <div
                      key={drv.id}
                      className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-all"
                    >
                      <div className="space-y-2 w-full sm:w-auto">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-[#1f1f1f] text-base">{drv.first_name} {drv.surname}</h4>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded-full uppercase tracking-wider ${getRiskColor(drv.risk_level)}`}>
                            {drv.risk_level} Risk
                          </span>
                          {drv.is_disputed && (
                            <span className="px-2 py-0.5 text-[10px] bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold uppercase tracking-wider flex items-center space-x-0.5">
                              <span>Under Dispute</span>
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-600">
                          <div><span className="font-semibold text-stone-400">Phone:</span> {drv.phone_masked}</div>
                          <div><span className="font-semibold text-stone-400">Email:</span> {drv.email_masked}</div>
                          <div><span className="font-semibold text-stone-400">Location:</span> {drv.city}, {drv.province}</div>
                          <div><span className="font-semibold text-stone-400">Platform:</span> {drv.platform}</div>
                        </div>

                        {user && (isVerified || user.role === 'admin') ? (
                          <div className="text-xs bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 mt-2 leading-relaxed">
                            <strong>Verified Factor:</strong> {drv.risk_explanation}
                          </div>
                        ) : null}
                      </div>

                      <div className="self-stretch sm:self-center flex flex-col justify-end items-stretch sm:items-end gap-2 w-full sm:w-auto">
                        {user && (isVerified || user.role === 'admin') ? (
                          <button
                            onClick={() => onSelectDriver(drv.id)}
                            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#1f1f1f] hover:bg-black text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Dossier</span>
                          </button>
                        ) : (
                          <div className="text-left sm:text-right space-y-1.5 w-full">
                            <span className="block text-[11px] font-semibold text-stone-500">
                              {drv.approved_complaints_count} incident record(s) verified
                            </span>
                            <button
                              onClick={() => setActiveTab(user ? 'owner-dashboard' : 'login')}
                              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-[#f6f7ed] border border-stone-200 text-[#1f1f1f] hover:bg-stone-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                              <span>Unlock Dossier & Evidence</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!user || (!isVerified && user.role !== 'admin')) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5 mt-4 leading-relaxed">
                      <div className="font-bold flex items-center space-x-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                        <span>Verification Required for Unmasked Records</span>
                      </div>
                      <p>
                        To view detailed complaint categories, complete evidence (photos, signed agreements, invoices), or to submit reports yourself, you must be a registered and verified Fleet Owner. Registration takes less than 2 minutes.
                      </p>
                      <div className="pt-1.5">
                        <button
                          onClick={() => setActiveTab('register')}
                          className="font-bold underline text-[#1f1f1f] hover:text-stone-700 flex items-center space-x-1 min-h-[36px]"
                        >
                          <span>Apply for Fleet Owner Access now</span>
                          <ArrowRight className="h-3 w-3 inline" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature Cards / Informational */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-2xs">
            <div className="bg-[#f6f7ed] text-[#1f1f1f] p-2.5 rounded-xl w-max border border-stone-200">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#1f1f1f] text-base">Not a Public Blacklist</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              We do not publish driver names publicly. All search outputs for guest visitors are securely masked. We focus strictly on lawful fleet risk-mitigation, complying with major data protection regulations.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-2xs">
            <div className="bg-[#f6f7ed] text-[#1f1f1f] p-2.5 rounded-xl w-max border border-stone-200">
              <CheckCircle className="h-5 w-5 text-[#1f1f1f]" />
            </div>
            <h3 className="font-bold text-[#1f1f1f] text-base">Two-Sided Moderation</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Every complaint is reviewed by hand by trained system administrators. Fleet owners must upload physical evidence (such as rental agreements, damage photos, invoice scans). Hearsay reports are instantly rejected.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-2xs sm:col-span-2 md:col-span-1">
            <div className="bg-[#f6f7ed] text-[#1f1f1f] p-2.5 rounded-xl w-max border border-stone-200">
              <BookOpen className="h-5 w-5 text-[#1f1f1f]" />
            </div>
            <h3 className="font-bold text-[#1f1f1f] text-base">Right of Reply & Dispute</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Drivers have an absolute right of reply. Any driver can input a complaint ID, submit counter-evidence, and dispute records. Disputed complaints are flagged visually on the system during review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'how-it-works') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4 px-2 sm:px-0">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1f1f1f]">How FleetCheck Operates</h2>
          <p className="text-stone-500 text-xs sm:text-sm max-w-lg mx-auto">Building accountability and transparency in e-hailing, step-by-step.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-8 space-y-6 sm:space-y-8 shadow-2xs">
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-[#1f1f1f] flex items-center space-x-3">
              <span className="bg-[#1f1f1f] text-white rounded-xl w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Operator Registration & Verification</span>
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed sm:pl-11">
              Fleet owners register their accounts by uploading proof of identification, company registration certificates (CIPC), and physical proof of vehicle ownership (logbooks or operating licenses). Every fleet owner must be approved manually by our administrators before acquiring search or reporting rights.
            </p>
          </div>

          <div className="h-px bg-stone-100"></div>

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-[#1f1f1f] flex items-center space-x-3">
              <span className="bg-[#1f1f1f] text-white rounded-xl w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Standardized Risk Scanning</span>
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed sm:pl-11">
              Before handing over keys to a new driver, operators scan their details. If verified incident records exist (e.g. vehicle abandonment, unrecovered rentals, severe reckless accidents), they receive an objective risk report detailing dates and severity levels.
            </p>
          </div>

          <div className="h-px bg-stone-100"></div>

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-[#1f1f1f] flex items-center space-x-3">
              <span className="bg-[#1f1f1f] text-white rounded-xl w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Reporting Approved Complaints</span>
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed sm:pl-11">
              If a driver abandons a car or commits a severe agreement breach, verified operators file an incident. They must provide precise dates, platform names, vehicle registration, and concrete evidence (photos, invoice scans, WhatsApp receipts). All submissions require a lawful declaration.
            </p>
          </div>

          <div className="h-px bg-stone-100"></div>

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-[#1f1f1f] flex items-center space-x-3">
              <span className="bg-[#1f1f1f] text-white rounded-xl w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Administrative Moderation & Action</span>
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed sm:pl-11">
              Our admins verify the validity of evidence, rate its strength, check for duplicates, and approve/reject complaints. Unapproved complaints never display anywhere. When approved, transparent risk scores are updated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'privacy') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-2 sm:py-4 text-stone-800 px-2 sm:px-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1f1f1f]">Privacy Policy & POPIA Statement</h2>
          <p className="text-xs text-stone-400 mt-1">Last updated: June 2026</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-6 text-xs sm:text-sm leading-relaxed shadow-2xs">
          <div className="space-y-2">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base flex items-center space-x-2">
              <Shield className="h-4.5 w-4.5 text-[#1f1f1f] shrink-0" />
              <span>1. Data Minimization & Privacy by Design</span>
            </h3>
            <p className="text-stone-600">
              FleetCheck is built to conform to the Protection of Personal Information Act (POPIA) of South Africa and the General Data Protection Regulation (GDPR). We enforce strict data minimization, gathering only identifiers essential for protecting commercial fleet vehicles from risk.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base flex items-center space-x-2">
              <Landmark className="h-4.5 w-4.5 text-[#1f1f1f] shrink-0" />
              <span>2. Secure Data Masking & Authorization</span>
            </h3>
            <p className="text-stone-600">
              Driver personal details (full phone numbers, email addresses, national ID cards, and supporting evidence files) are highly encrypted inside our database. Guest visitors can only view masked search results. Detailed risk profiles are strictly locked behind verified, logged-in operator authentication walls.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base flex items-center space-x-2">
              <FileCheck className="h-4.5 w-4.5 text-[#1f1f1f] shrink-0" />
              <span>3. Mandatory Audit Logs</span>
            </h3>
            <p className="text-stone-600">
              To prevent abuse, scraping, or malicious surveillance, every user action—including search strings, view requests, logins, and downloads—is permanently logged in an administrator-only, tamper-resistant audit trail. Accounts displaying suspicious searching patterns are automatically flagged and suspended.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base">4. Right to Deletion, Correction & Dispute</h3>
            <p className="text-stone-600">
              Drivers have an absolute legal right to dispute any complaint recorded on this platform. Drivers can request copies of all personal records saved about them by contacting <span className="font-bold text-[#1f1f1f] hover:underline">compliance@fleetcheck.org</span>. Outdated files or complaints older than 3 years are automatically archived or soft-deleted under data retention directives.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'terms') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-2 sm:py-4 text-stone-800 px-2 sm:px-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1f1f1f]">Terms of Service & Rules of Use</h2>
          <p className="text-xs text-stone-400 mt-1">Effective: June 2026</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-6 text-xs sm:text-sm leading-relaxed shadow-2xs">
          <p className="text-stone-600 font-medium">
            Welcome to FleetCheck. By accessing or registering for our platform, you agree to comply with these strictly enforced Terms of Use.
          </p>

          <div className="space-y-2">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base">1. Operator Qualification</h3>
            <p className="text-stone-600">
              Only legally registered fleet owners, vehicle rental providers, or operating members of commercial e-hailing agencies may apply for verified access. Submitting fraudulent registration papers or business permits constitutes a breach of contract and will result in immediate termination of access.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base">2. Ban on Unverified Blacklists</h3>
            <p className="text-stone-600">
              This platform is not an open blacklist or social media forum. You are strictly prohibited from using defamatory, hostile, or discriminatory language when filing reports. Reports must describe documented incidents objectively and neutrally.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base">3. Liability for Malicious Reporting</h3>
            <p className="text-stone-600">
              Operators are legally liable for the accuracy of complaints they submit. Submitting false, malicious, or fabricated complaints to damage a driver’s reputation will trigger permanent profile suspension, IP banning, and potential legal prosecution for defamation.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-[#1f1f1f] text-sm sm:text-base">4. Strict Anti-Scraping Policies</h3>
            <p className="text-stone-600">
              No automation, scraping, or bulk indexing is permitted. Public search routes are rate-limited. Anyone attempting to bypass security features will be blocked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

