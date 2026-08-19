import React from 'react';
import { ShieldCheck, LogOut, User as UserIcon, Settings, Lock, Menu, X, ChevronDown, Building2, Users } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  isVerified: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSelectLoginRole?: (role: 'fleet_owner' | 'driver' | 'admin') => void;
}

export default function Navbar({ user, isVerified, activeTab, setActiveTab, onLogout, onSelectLoginRole }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLoginDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleLoginSelect = (role: 'fleet_owner' | 'driver' | 'admin') => {
    setLoginDropdownOpen(false);
    setIsOpen(false);
    if (onSelectLoginRole) {
      onSelectLoginRole(role);
    }
    setActiveTab('login');
  };

  return (
    <nav className="bg-white border-b border-stone-200/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-2.5 text-stone-900 font-bold text-xl tracking-tight hover:opacity-90 cursor-pointer"
              id="nav-logo"
            >
              <div className="bg-stone-900 text-white p-1.5 rounded-xl flex items-center justify-center shadow-2xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-stone-900">FleetCheck</span>
            </button>
            
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'home' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                Home
              </button>
              
              <button
                onClick={() => setActiveTab('driver-marketplace')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'driver-marketplace' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold border border-stone-200' : 'text-stone-600 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                <Users className="h-4 w-4 text-[#1f1f1f]" />
                <span>Driver Marketplace</span>
              </button>

              <button
                onClick={() => setActiveTab('how-it-works')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'how-it-works' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => setActiveTab('dispute-portal')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'dispute-portal' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                Dispute Record
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'privacy' ? 'text-[#1f1f1f] bg-[#f6f7ed] font-semibold' : 'text-stone-500 hover:text-[#1f1f1f] hover:bg-stone-50'
                }`}
              >
                Privacy Policy
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <button
                    onClick={() => setActiveTab('admin-dashboard')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 bg-[#f6f7ed] text-[#1f1f1f] hover:bg-stone-100 transition-colors ${
                      activeTab === 'admin-dashboard' ? 'ring-2 ring-stone-400' : ''
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </button>
                ) : user.role === 'driver' ? (
                  <button
                    onClick={() => setActiveTab('driver-dashboard')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 bg-[#f6f7ed] text-[#1f1f1f] hover:bg-stone-100 transition-colors ${
                      activeTab === 'driver-dashboard' ? 'ring-2 ring-stone-400' : ''
                    }`}
                  >
                    <UserIcon className="h-4 w-4 text-[#1f1f1f]" />
                    <span>Driver Portal</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('fleet-owner-dashboard')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 bg-[#f6f7ed] text-[#1f1f1f] hover:bg-stone-100 transition-colors ${
                      (activeTab === 'fleet-owner-dashboard' || activeTab === 'owner-dashboard') ? 'ring-2 ring-stone-400' : ''
                    }`}
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Fleet Dashboard</span>
                    {isVerified ? (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#1f1f1f] text-white rounded font-bold uppercase tracking-wider">
                        Verified
                      </span>
                    ) : (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-stone-200 text-[#1f1f1f] rounded font-bold uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                  </button>
                )}

                <div className="h-4 w-px bg-stone-200"></div>

                <div className="text-right">
                  <div className="text-xs font-bold text-[#1f1f1f] max-w-[120px] truncate">{user.name}</div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">{user.role}</div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-400 hover:text-[#1f1f1f] rounded-xl hover:bg-stone-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                {/* Login Button with Dropdown for Driver, Fleet Owner, Admin */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                    className="px-3.5 py-2 text-sm font-semibold text-[#1f1f1f] hover:text-black hover:bg-stone-100 rounded-xl transition-colors flex items-center space-x-1.5 border border-stone-200 bg-white shadow-2xs cursor-pointer"
                  >
                    <span>Log In</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-stone-500 transition-transform ${loginDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {loginDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 divide-y divide-stone-100">
                      <div className="px-3.5 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Select Login Portal
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => handleRoleLoginSelect('fleet_owner')}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50 hover:text-[#1f1f1f] flex items-center space-x-3 transition-colors cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-stone-100 text-[#1f1f1f]">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#1f1f1f]">Fleet Owner</div>
                            <div className="text-[10px] text-stone-400 font-normal">Manage fleet & driver checks</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleRoleLoginSelect('driver')}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50 hover:text-[#1f1f1f] flex items-center space-x-3 transition-colors cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-stone-100 text-[#1f1f1f]">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#1f1f1f]">Driver</div>
                            <div className="text-[10px] text-stone-400 font-normal">Manage profile & responses</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleRoleLoginSelect('admin')}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-stone-50 hover:text-[#1f1f1f] flex items-center space-x-3 transition-colors cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-stone-100 text-[#1f1f1f]">
                            <Lock className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#1f1f1f]">System Admin</div>
                            <div className="text-[10px] text-stone-400 font-normal">Platform moderation</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('register')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#1f1f1f] hover:bg-black rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Register Fleet
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-2 py-3 space-y-1 shadow-lg">
          <button
            onClick={() => { setActiveTab('home'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Home
          </button>
          <button
            onClick={() => { setActiveTab('driver-marketplace'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-900 bg-[#f4f3ec] font-bold"
          >
            Driver Marketplace
          </button>
          <button
            onClick={() => { setActiveTab('how-it-works'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            How It Works
          </button>
          <button
            onClick={() => { setActiveTab('dispute-portal'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Dispute Record
          </button>
          <button
            onClick={() => { setActiveTab(user?.role === 'driver' ? 'driver-dashboard' : 'register'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Driver Portal
          </button>
          <button
            onClick={() => { setActiveTab('privacy'); setIsOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:bg-stone-50"
          >
            Privacy Policy
          </button>

          <div className="border-t border-stone-100 my-2 pt-2"></div>

          {user ? (
            <div className="px-3 py-2">
              <div className="font-semibold text-stone-900 text-sm">{user.name}</div>
              <div className="text-xs text-stone-400 capitalize mb-2">{user.role}</div>
              
              {user.role === 'admin' ? (
                <button
                  onClick={() => { setActiveTab('admin-dashboard'); setIsOpen(false); }}
                  className="flex items-center justify-center space-x-2 w-full py-2 border border-red-200 bg-red-50 text-red-700 rounded-md font-semibold text-sm mb-2"
                >
                  <Lock className="h-4 w-4" />
                  <span>Admin Panel</span>
                </button>
              ) : user.role === 'driver' ? (
                <button
                  onClick={() => { setActiveTab('driver-dashboard'); setIsOpen(false); }}
                  className="flex items-center justify-center space-x-2 w-full py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-md font-semibold text-sm mb-2"
                >
                  <UserIcon className="h-4 w-4 text-emerald-600" />
                  <span>Driver Portal</span>
                </button>
              ) : (
                <button
                  onClick={() => { setActiveTab('fleet-owner-dashboard'); setIsOpen(false); }}
                  className="flex items-center justify-center space-x-2 w-full py-2 border border-stone-200 bg-stone-50 text-stone-700 rounded-md font-semibold text-sm mb-2"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Fleet Dashboard ({isVerified ? 'Verified' : 'Pending'})</span>
                </button>
              )}
              
              <button
                onClick={() => { onLogout(); setIsOpen(false); }}
                className="flex items-center justify-center space-x-2 w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-semibold text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 px-3 pt-2">
              <div className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Log In Options</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRoleLoginSelect('fleet_owner')}
                  className="py-2 text-center text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Fleet Owner
                </button>
                <button
                  onClick={() => handleRoleLoginSelect('driver')}
                  className="py-2 text-center text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Driver
                </button>
                <button
                  onClick={() => handleRoleLoginSelect('admin')}
                  className="py-2 text-center text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Admin
                </button>
              </div>
              <button
                onClick={() => { setActiveTab('register'); setIsOpen(false); }}
                className="w-full text-center py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold shadow-2xs mt-1 cursor-pointer"
              >
                Register Fleet
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
