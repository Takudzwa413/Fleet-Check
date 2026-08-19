import React from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PublicPages from './components/PublicPages';
import AuthPages from './components/AuthPages';
import FleetOwnerDashboard from './components/FleetOwnerDashboard';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import AccountantDashboard from './components/AccountantDashboard';
import StokvelDashboard from './components/stokvel/StokvelDashboard';
import DriverMarketplace from './components/DriverMarketplace';
import DisputeForm from './components/DisputeForm';
import { User, FleetOwnerProfile, MaskedDriver } from './types';
import { ShieldCheck, Info } from 'lucide-react';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<FleetOwnerProfile | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>('home');
  const [selectedRolePreset, setSelectedRolePreset] = React.useState<'fleet_owner' | 'driver' | 'admin' | 'accountant'>('fleet_owner');

  // Try to load user session from localStorage on mount
  React.useEffect(() => {
    const cachedToken = localStorage.getItem('fc_token');
    if (cachedToken) {
      validateSession(cachedToken);
    }
  }, []);

  const validateSession = async (tokenStr: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenStr}`
        }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setToken(tokenStr);
        setUser(data.user);
        setProfile(data.profile);
        setIsVerified(data.user.role === 'admin' || data.user.role === 'accountant' ? true : !!data.isVerified);
        
        // If logged in, automatically head to respective dashboard
        if (data.user.role === 'admin') {
          setActiveTab('admin-dashboard');
        } else if (data.user.role === 'accountant') {
          setActiveTab('accountant-dashboard');
        } else if (data.user.role === 'driver') {
          setActiveTab('driver-dashboard');
        } else {
          setActiveTab('fleet-owner-dashboard');
        }
      } else {
        // Clear stale session
        handleLogout();
      }
    } catch (err) {
      console.error('Session validation error:', err);
      handleLogout();
    }
  };

  const handleLoginSuccess = (data: any) => {
    setToken(data.token);
    setUser(data.user);
    setProfile(data.profile);
    setIsVerified(data.user.role === 'admin' || data.user.role === 'accountant' ? true : !!data.isVerified);
    localStorage.setItem('fc_token', data.token);

    if (data.user.role === 'admin') {
      setActiveTab('admin-dashboard');
    } else if (data.user.role === 'accountant') {
      setActiveTab('accountant-dashboard');
    } else if (data.user.role === 'driver') {
      setActiveTab('driver-dashboard');
    } else {
      setActiveTab('fleet-owner-dashboard');
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setToken(null);
    setUser(null);
    setProfile(null);
    setIsVerified(false);
    localStorage.removeItem('fc_token');
    setActiveTab('home');
  };

  const handleRegisterSuccess = (message: string) => {
    // Navigate back to login
    setActiveTab('login');
  };

  // Perform search (either public or private depending on logged-in state)
  const handleDriverSearch = async (filters: any): Promise<MaskedDriver[]> => {
    const queryParams = new URLSearchParams(filters);
    
    let url = `/api/public/search?${queryParams.toString()}`;
    const headers: Record<string, string> = {};

    if (token && (isVerified || user?.role === 'admin' || user?.role === 'accountant')) {
      const q = filters.name || filters.surname || filters.phone || filters.email || '';
      url = `/api/drivers/search?query=${encodeURIComponent(q)}&city=${encodeURIComponent(filters.city || '')}&province=${encodeURIComponent(filters.province || '')}&platform=${encodeURIComponent(filters.platform || '')}`;
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');
    return data.results || [];
  };

  const handleSelectDriverFromSearch = (driverId: string) => {
    if (user?.role === 'admin') {
      setActiveTab('admin-dashboard');
    } else if (user?.role === 'accountant') {
      setActiveTab('accountant-dashboard');
    } else {
      setActiveTab('fleet-owner-dashboard');
    }
  };

  const isDashboardView = ['fleet-owner-dashboard', 'owner-dashboard', 'driver-dashboard', 'admin-dashboard', 'accountant-dashboard', 'stokvel-project'].includes(activeTab);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-stone-800 antialiased selection:bg-stone-200">
      <Navbar
        user={user}
        isVerified={isVerified}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onSelectLoginRole={(role) => {
          setSelectedRolePreset(role);
        }}
      />

      <main className={`flex-grow w-full ${isDashboardView ? 'max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6 py-4' : 'max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8'}`}>
        {/* Animated route wrappers */}
        <div className="fade-in-transition">
          {/* Public Visitor Pages */}
          {(activeTab === 'home' || activeTab === 'how-it-works' || activeTab === 'privacy' || activeTab === 'terms') && (
            <PublicPages
              user={user}
              isVerified={isVerified}
              activeTab={activeTab as any}
              setActiveTab={setActiveTab}
              onSearch={handleDriverSearch}
              onSelectDriver={handleSelectDriverFromSearch}
            />
          )}

          {/* Driver Marketplace */}
          {activeTab === 'driver-marketplace' && (
            <DriverMarketplace
              currentUser={user}
              isVerifiedFleetOwner={isVerified}
              onNavigateRegister={() => setActiveTab('register')}
              onNavigateLogin={() => setActiveTab('login')}
            />
          )}

          {/* Right of reply Dispute Portal */}
          {activeTab === 'dispute-portal' && (
            <DisputeForm />
          )}

          {/* Dedicated Stokvel Module View for any authenticated user */}
          {activeTab === 'stokvel-project' && user && (
            <div className="space-y-6">
              <StokvelDashboard
                user={user}
                token={token || ''}
                projectId="proj_action_pack_01"
              />
            </div>
          )}

          {/* Authentication System */}
          {(activeTab === 'login' || activeTab === 'register') && (
            <AuthPages
              activeTab={activeTab as any}
              setActiveTab={setActiveTab as any}
              onLoginSuccess={handleLoginSuccess}
              onRegisterSuccess={handleRegisterSuccess}
              selectedRolePreset={selectedRolePreset}
              onSelectRolePreset={setSelectedRolePreset}
            />
          )}

          {/* Accountant Dashboard */}
          {activeTab === 'accountant-dashboard' && user && (
            user.role === 'accountant' || user.role === 'admin' ? (
              <AccountantDashboard
                user={user}
                token={token || ''}
                onLogout={handleLogout}
              />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto space-y-4">
                <div className="p-3 bg-red-100 text-red-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Accountant Access Restricted</h2>
                <p className="text-sm text-slate-600">
                  You are logged in as a <strong className="capitalize">{user.role}</strong>. Financial accounting controls are reserved for the Senior Project Accountant and Administrators.
                </p>
                <button
                  onClick={() => setActiveTab(user.role === 'driver' ? 'driver-dashboard' : 'fleet-owner-dashboard')}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm cursor-pointer"
                >
                  Go to My Portal
                </button>
              </div>
            )
          )}

          {/* Verified Fleet Owner Dashboard */}
          {(activeTab === 'fleet-owner-dashboard' || activeTab === 'owner-dashboard') && user && (
            user.role === 'fleet_owner' ? (
              <FleetOwnerDashboard
                user={user}
                profile={profile}
                isVerified={isVerified}
                onLogout={handleLogout}
                token={token || ''}
              />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto space-y-4">
                <div className="p-3 bg-red-100 text-red-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Fleet Owner Portal Access Restricted</h2>
                <p className="text-sm text-slate-600">
                  You are logged in as a <strong className="capitalize">{user.role}</strong>. Fleet Owner features are exclusively available to registered Fleet Owner accounts.
                </p>
                <button
                  onClick={() => setActiveTab(user.role === 'driver' ? 'driver-dashboard' : user.role === 'accountant' ? 'accountant-dashboard' : 'admin-dashboard')}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm cursor-pointer"
                >
                  Go to My Portal
                </button>
              </div>
            )
          )}

          {/* Driver Portal Dashboard */}
          {activeTab === 'driver-dashboard' && user && (
            user.role === 'driver' ? (
              <DriverDashboard
                user={user}
                onLogout={handleLogout}
              />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto space-y-4">
                <div className="p-3 bg-red-100 text-red-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Driver Portal Access Restricted</h2>
                <p className="text-sm text-slate-600">
                  You are logged in as a <strong className="capitalize">{user.role}</strong>. Driver Portal features are exclusively available to registered Driver accounts.
                </p>
                <button
                  onClick={() => setActiveTab(user.role === 'fleet_owner' ? 'fleet-owner-dashboard' : user.role === 'accountant' ? 'accountant-dashboard' : 'admin-dashboard')}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm cursor-pointer"
                >
                  Go to My Portal
                </button>
              </div>
            )
          )}

          {/* System Admin Dashboard */}
          {activeTab === 'admin-dashboard' && user && (
            user.role === 'admin' ? (
              <AdminDashboard
                user={user}
                token={token || ''}
                onLogout={handleLogout}
              />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto space-y-4">
                <div className="p-3 bg-red-100 text-red-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Admin Panel Access Restricted</h2>
                <p className="text-sm text-slate-600">
                  You are logged in as a <strong className="capitalize">{user.role}</strong>. System Administrator features are exclusively available to authorized Admin accounts.
                </p>
                <button
                  onClick={() => setActiveTab(user.role === 'driver' ? 'driver-dashboard' : user.role === 'accountant' ? 'accountant-dashboard' : 'fleet-owner-dashboard')}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm cursor-pointer"
                >
                  Go to My Portal
                </button>
              </div>
            )
          )}
        </div>
      </main>

      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
