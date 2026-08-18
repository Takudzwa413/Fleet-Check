import React, { useState, useEffect } from 'react';
import { UserCheck, Star, ShieldCheck, Lock, Search, Filter, Phone, Mail, Award, CheckCircle2, User, FileText, ChevronRight, Briefcase, MapPin, Building2, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { MaskedMarketplaceDriver, User as UserType } from '../types';

interface DriverMarketplaceProps {
  currentUser: UserType | null;
  isVerifiedFleetOwner: boolean;
  onNavigateRegister: () => void;
  onNavigateLogin: () => void;
}

export default function DriverMarketplace({
  currentUser,
  isVerifiedFleetOwner,
  onNavigateRegister,
  onNavigateLogin
}: DriverMarketplaceProps) {
  const [drivers, setDrivers] = useState<MaskedMarketplaceDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedExp, setSelectedExp] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState<MaskedMarketplaceDriver | null>(null);

  useEffect(() => {
    fetchMarketplaceDrivers();
  }, [currentUser, isVerifiedFleetOwner]);

  const fetchMarketplaceDrivers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('fc_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/marketplace/drivers', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch driver marketplace');
      
      setDrivers(data.drivers || []);
    } catch (err: any) {
      console.error('Error fetching driver marketplace:', err);
      setError(err.message || 'Unable to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = searchQuery === '' ||
      driver.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (driver.surname && driver.surname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      driver.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.bio.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = selectedCity === 'all' || driver.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesPlatform = selectedPlatform === 'all' || (driver.platforms && driver.platforms.includes(selectedPlatform));
    const matchesExp = selectedExp === 'all' || 
      (selectedExp === '1-2' && driver.experience_years <= 2) ||
      (selectedExp === '3-5' && driver.experience_years >= 3 && driver.experience_years <= 5) ||
      (selectedExp === '5+' && driver.experience_years > 5);

    return matchesSearch && matchesCity && matchesPlatform && matchesExp;
  });

  const canSeeFullInfo = currentUser?.role === 'admin' || (currentUser?.role === 'fleet_owner' && isVerifiedFleetOwner);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#f4f3ed] rounded-3xl p-6 sm:p-10 border border-stone-200/80 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white text-stone-800 border border-stone-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-stone-900" />
            <span>Driver Marketplace & Hire Network</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
            Find Top Vetted Drivers with Verified Fleet References
          </h1>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
            Browse reliable Uber & Bolt drivers actively looking for vehicles to hire. Inspect verified ratings, PDP licenses, and contactable references verified against FleetCheck’s trusted owner network.
          </p>
          
          {!canSeeFullInfo && (
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onNavigateRegister}
                className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-2xs transition-colors flex items-center space-x-2 text-sm cursor-pointer"
              >
                <Building2 className="h-4 w-4" />
                <span>Register as Fleet Owner to Unmask Contact Info</span>
              </button>
              {!currentUser && (
                <button
                  onClick={onNavigateLogin}
                  className="bg-white hover:bg-stone-50 text-stone-800 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm border border-stone-200 cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2 md:col-span-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search driver, city, bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-stone-50/50 min-h-[44px]"
            />
          </div>

          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white min-h-[44px]"
            >
              <option value="all">All Cities</option>
              <option value="Johannesburg">Johannesburg</option>
              <option value="Cape Town">Cape Town</option>
              <option value="Durban">Durban</option>
              <option value="Pretoria">Pretoria</option>
              <option value="Gqeberha">Gqeberha</option>
            </select>
          </div>

          <div>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white min-h-[44px]"
            >
              <option value="all">All Platforms</option>
              <option value="Uber">Uber</option>
              <option value="Bolt">Bolt</option>
              <option value="inDrive">inDrive</option>
              <option value="DiDi">DiDi</option>
            </select>
          </div>

          <div>
            <select
              value={selectedExp}
              onChange={(e) => setSelectedExp(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white min-h-[44px]"
            >
              <option value="all">All Experience Levels</option>
              <option value="1-2">1 - 2 Years</option>
              <option value="3-5">3 - 5 Years</option>
              <option value="5+">5+ Years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Driver List Grid */}
      {loading ? (
        <div className="text-center py-16 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1f1f1f] mx-auto"></div>
          <p className="text-stone-500 text-sm">Loading available drivers...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-stone-100 border border-stone-300 text-stone-900 rounded-xl text-sm text-center">
          {error}
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-stone-200 text-center space-y-4">
          <User className="h-12 w-12 text-stone-300 mx-auto" />
          <h3 className="text-lg font-bold text-stone-800">No Drivers Found</h3>
          <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto">
            No drivers match your current filter criteria. Try adjusting the search or city selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredDrivers.map((driver) => {
            const hasVerifiedRef = driver.references?.some(r => r.is_verified_fleet_owner);

            return (
              <div
                key={driver.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
              >
                {/* Driver Top Section */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-xl bg-[#1f1f1f] text-white font-bold flex items-center justify-center text-lg shadow-2xs shrink-0">
                        {driver.first_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-stone-900 text-base">
                            {driver.first_name} {driver.surname || driver.surname_masked}
                          </h3>
                        </div>
                        <div className="flex items-center text-xs text-stone-500 space-x-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-stone-400" />
                          <span>{driver.city}, {driver.province}</span>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Available</span>
                    </span>
                  </div>

                  {/* Rating & Stats */}
                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100 text-xs">
                    <div>
                      <span className="text-stone-400 block font-medium">Uber Rating</span>
                      <div className="flex items-center space-x-1 font-bold text-stone-800 mt-0.5">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>{driver.uber_rating} / 5.0</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-medium">Experience</span>
                      <div className="flex items-center space-x-1 font-bold text-stone-800 mt-0.5">
                        <Briefcase className="h-4 w-4 text-stone-700" />
                        <span>{driver.experience_years} Years PDP</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Platforms */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-stone-400 font-medium mr-1">Platforms:</span>
                    {driver.platforms.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200">
                        {p}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-xs font-semibold border border-stone-200">
                      {driver.license_type}
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="text-stone-600 text-xs leading-relaxed line-clamp-3 italic">
                    "{driver.bio}"
                  </p>

                  {/* References Box */}
                  <div className="border-t border-stone-100 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-stone-700 flex items-center space-x-1">
                        <UserCheck className="h-3.5 w-3.5 text-stone-700" />
                        <span>References ({driver.references?.length || 0})</span>
                      </span>
                    </div>

                    {driver.references?.map((ref) => (
                      <div
                        key={ref.id}
                        className={`p-2.5 rounded-xl text-xs border transition-all ${
                          ref.is_verified_fleet_owner
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-stone-50 border-stone-200 text-stone-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold flex items-center space-x-1">
                              <span>{ref.name || ref.name_masked}</span>
                              <span className="text-stone-400 font-normal">({ref.relationship})</span>
                            </div>
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              {ref.company_name}
                            </div>
                          </div>

                          {ref.is_verified_fleet_owner ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-xs" title="Verified Fleet Owner in FleetCheck Network">
                              <ShieldCheck className="h-3 w-3" />
                              <span>Verified Owner</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">Unverified</span>
                          )}
                        </div>

                        {canSeeFullInfo && ref.phone && (
                          <div className="mt-2 text-[11px] font-mono text-stone-600 pt-1 border-t border-stone-200/50 flex items-center space-x-2">
                            <Phone className="h-3 w-3 text-stone-400" />
                            <span>{ref.phone}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Action / Masked Overlay */}
                <div className="p-4 bg-stone-50 border-t border-stone-100">
                  {canSeeFullInfo ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-stone-800 flex items-center justify-between">
                        <span className="text-stone-500">Contact Driver:</span>
                        <span className="font-mono text-stone-900">{driver.phone}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${driver.phone}`}
                          className="w-full bg-[#1f1f1f] hover:bg-stone-800 text-white font-semibold py-2.5 rounded-xl text-xs text-center flex items-center justify-center space-x-1 transition-colors min-h-[40px]"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>Call Driver</span>
                        </a>
                        <a
                          href={`mailto:${driver.email}`}
                          className="w-full bg-stone-700 hover:bg-stone-800 text-white font-semibold py-2.5 rounded-xl text-xs text-center flex items-center justify-center space-x-1 transition-colors min-h-[40px]"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 py-1">
                      <div className="flex items-center justify-center space-x-1 text-stone-500 text-xs font-semibold">
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                        <span>Contact Info & Full CV Blurred</span>
                      </div>
                      <button
                        onClick={onNavigateRegister}
                        className="w-full bg-[#1f1f1f] hover:bg-stone-800 text-white font-semibold py-2.5 rounded-xl text-xs text-center shadow-xs transition-colors flex items-center justify-center space-x-1 min-h-[40px] cursor-pointer"
                      >
                        <Building2 className="h-3.5 w-3.5 text-stone-300" />
                        <span>Register Fleet Owner to Hire</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
