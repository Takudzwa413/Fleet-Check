import React, { useState, useEffect } from 'react';
import { Car, Search, Phone, CheckCircle2, Lock, Building2, Sparkles, Wallet, Banknote, Tag } from 'lucide-react';
import { MaskedVehicleListing, User as UserType } from '../types';

interface VehicleMarketplaceProps {
  currentUser: UserType | null;
  onNavigateRegister: () => void;
  onNavigateLogin: () => void;
}

export default function VehicleMarketplace({
  currentUser,
  onNavigateRegister,
  onNavigateLogin
}: VehicleMarketplaceProps) {
  const [listings, setListings] = useState<MaskedVehicleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  useEffect(() => {
    fetchMarketplaceVehicles();
  }, [currentUser]);

  const fetchMarketplaceVehicles = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('fc_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/marketplace/vehicles', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch vehicle marketplace');

      setListings(data.listings || []);
    } catch (err: any) {
      console.error('Error fetching vehicle marketplace:', err);
      setError(err.message || 'Unable to load vehicle listings');
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = searchQuery === '' ||
      listing.car_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.owner_company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    const matchesPlatform = selectedPlatform === 'all' || (listing.platforms && listing.platforms.includes(selectedPlatform));

    return matchesSearch && matchesCategory && matchesPlatform;
  });

  const canSeeFullInfo = currentUser?.role === 'admin' || currentUser?.role === 'driver';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#f4f3ed] rounded-3xl p-6 sm:p-10 border border-stone-200/80 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white text-stone-800 border border-stone-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-stone-900" />
            <span>Vehicle Marketplace & Hire Network</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
            Find Available E-Hailing Vehicles from Verified Fleet Owners
          </h1>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
            Browse vehicles listed by verified fleet operators for Uber, Bolt, inDrive and DiDi. Every listing is reviewed by FleetCheck before it appears here.
          </p>

          {!canSeeFullInfo && (
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onNavigateRegister}
                className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-2xs transition-colors flex items-center space-x-2 text-sm cursor-pointer"
              >
                <Building2 className="h-4 w-4" />
                <span>Register as Driver to Unmask Contact Info</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search car type, operator, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-stone-50/50 min-h-[44px]"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white min-h-[44px]"
            >
              <option value="all">All Categories</option>
              <option value="Comfort">Comfort</option>
              <option value="Go">Go</option>
              <option value="X">X</option>
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
        </div>
      </div>

      {/* Vehicle List Grid */}
      {loading ? (
        <div className="text-center py-16 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1f1f1f] mx-auto"></div>
          <p className="text-stone-500 text-sm">Loading available vehicles...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-stone-100 border border-stone-300 text-stone-900 rounded-xl text-sm text-center">
          {error}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-stone-200 text-center space-y-4">
          <Car className="h-12 w-12 text-stone-300 mx-auto" />
          <h3 className="text-lg font-bold text-stone-800">No Vehicles Found</h3>
          <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto">
            No vehicle listings match your current filter criteria. Try adjusting the search or category selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
            >
              {listing.photos && listing.photos.length > 0 ? (
                <img src={listing.photos[0].file_data} alt={listing.car_type} className="w-full h-40 object-cover border-b border-stone-100" />
              ) : (
                <div className="w-full h-40 bg-stone-100 flex items-center justify-center border-b border-stone-100">
                  <Car className="h-10 w-10 text-stone-300" />
                </div>
              )}

              <div className="p-5 space-y-4 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base">{listing.car_type}</h3>
                    <div className="text-xs text-stone-500 mt-0.5">{listing.owner_company}</div>
                  </div>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{listing.category}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100 text-xs">
                  <div>
                    <span className="text-stone-400 block font-medium">Weekly Target</span>
                    <div className="flex items-center space-x-1 font-bold text-stone-800 mt-0.5">
                      <Wallet className="h-4 w-4 text-stone-700" />
                      <span>R{listing.weekly_target.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Deposit</span>
                    <div className="flex items-center space-x-1 font-bold text-stone-800 mt-0.5">
                      <Banknote className="h-4 w-4 text-stone-700" />
                      <span>R{listing.deposit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-stone-400 font-medium mr-1">Platforms:</span>
                  {listing.platforms.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200">
                      {p}
                    </span>
                  ))}
                </div>

                {listing.description && (
                  <p className="text-stone-600 text-xs leading-relaxed line-clamp-3">
                    {listing.description}
                  </p>
                )}
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-100">
                {canSeeFullInfo ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-stone-800 flex items-center justify-between">
                      <span className="text-stone-500">Contact Operator:</span>
                      <span className="font-mono text-stone-900">{listing.owner_phone}</span>
                    </div>
                    <a
                      href={`tel:${listing.owner_phone}`}
                      className="w-full bg-[#1f1f1f] hover:bg-stone-800 text-white font-semibold py-2.5 rounded-xl text-xs text-center flex items-center justify-center space-x-1 transition-colors min-h-[40px]"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call {listing.owner_name}</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center space-y-2 py-1">
                    <div className="flex items-center justify-center space-x-1 text-stone-500 text-xs font-semibold">
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Contact Info Blurred</span>
                    </div>
                    <button
                      onClick={onNavigateRegister}
                      className="w-full bg-[#1f1f1f] hover:bg-stone-800 text-white font-semibold py-2.5 rounded-xl text-xs text-center shadow-xs transition-colors flex items-center justify-center space-x-1 min-h-[40px] cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-stone-300" />
                      <span>Register as Driver to Contact</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
