import React from 'react';
import { ShieldCheck, Mail, Lock, User as UserIcon, Phone, Briefcase, MapPin, Layers, FileText, CheckSquare, RefreshCw, AlertCircle, KeyRound, Info, Check, Building2 } from 'lucide-react';
import { auth as clientAuth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { compressImageFile, CompressedFileResult } from '../utils/imageCompressor';

interface AuthPagesProps {
  activeTab: 'login' | 'register';
  setActiveTab: (tab: 'login' | 'register' | 'home') => void;
  onLoginSuccess: (data: any) => void;
  onRegisterSuccess: (message: string) => void;
  selectedRolePreset?: 'fleet_owner' | 'driver' | 'admin';
  onSelectRolePreset?: (role: 'fleet_owner' | 'driver' | 'admin') => void;
}

export default function AuthPages({
  activeTab,
  setActiveTab,
  onLoginSuccess,
  onRegisterSuccess,
  selectedRolePreset = 'fleet_owner',
  onSelectRolePreset
}: AuthPagesProps) {
  // Login Role Tab
  const [loginRoleTab, setLoginRoleTab] = React.useState<'fleet_owner' | 'driver' | 'admin'>(selectedRolePreset);

  React.useEffect(() => {
    if (selectedRolePreset) {
      setLoginRoleTab(selectedRolePreset);
    }
  }, [selectedRolePreset]);

  // Login State
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [loginLoading, setLoginLoading] = React.useState(false);

  // Register State
  const [regRole, setRegRole] = React.useState<'fleet_owner' | 'driver'>('fleet_owner');
  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPhone, setRegPhone] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');
  
  // Fleet Owner Specific Fields
  const [regCompany, setRegCompany] = React.useState('');
  const [regNumber, setRegNumber] = React.useState('');
  const [regAddress, setRegAddress] = React.useState('');
  const [regFleetSize, setRegFleetSize] = React.useState('5');
  const [regPlatforms, setRegPlatforms] = React.useState<string[]>([]);
  const [regFleetScreenshot, setRegFleetScreenshot] = React.useState<File | null>(null);
  const [regCompressedScreenshot, setRegCompressedScreenshot] = React.useState<CompressedFileResult | null>(null);
  const [screenshotCompressing, setScreenshotCompressing] = React.useState(false);

  // Driver Specific Fields
  const [driverFirstName, setDriverFirstName] = React.useState('');
  const [driverSurname, setDriverSurname] = React.useState('');
  const [driverIdNumber, setDriverIdNumber] = React.useState('');
  const [driverPlatforms, setDriverPlatforms] = React.useState<string[]>(['Uber', 'Bolt']);
  const [driverUberRating, setDriverUberRating] = React.useState('4.85');
  const [driverExperience, setDriverExperience] = React.useState('3');
  const [driverCity, setDriverCity] = React.useState('Johannesburg');
  const [driverProvince, setDriverProvince] = React.useState('Gauteng');
  const [driverBio, setDriverBio] = React.useState('');
  const [driverReferences, setDriverReferences] = React.useState<Array<{ name: string; company_name: string; phone: string; email: string; relationship: string }>>([
    { name: '', company_name: '', phone: '', email: '', relationship: 'Former Fleet Owner' }
  ]);

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setRegFleetScreenshot(null);
      setRegCompressedScreenshot(null);
      return;
    }
    setRegFleetScreenshot(file);
    setScreenshotCompressing(true);
    try {
      const res = await compressImageFile(file, 150 * 1024);
      setRegCompressedScreenshot(res);
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      setScreenshotCompressing(false);
    }
  };
  
  const [regDeclaration, setRegDeclaration] = React.useState(false);
  const [regError, setRegError] = React.useState('');
  const [regSuccess, setRegSuccess] = React.useState('');
  const [regLoading, setRegLoading] = React.useState(false);

  // Forgot / Reset Password states
  const [subMode, setSubMode] = React.useState<'none' | 'forgot' | 'reset'>('none');
  const [forgotEmail, setForgotEmail] = React.useState('');
  const [forgotLoading, setForgotLoading] = React.useState(false);
  const [forgotSuccess, setForgotSuccess] = React.useState('');
  const [forgotError, setForgotError] = React.useState('');
  const [simulatedToken, setSimulatedToken] = React.useState('');

  const [resetToken, setResetToken] = React.useState('');
  const [resetNewPassword, setResetNewPassword] = React.useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = React.useState('');
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetSuccess, setResetSuccess] = React.useState('');
  const [resetError, setResetError] = React.useState('');

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Email address is required.');
      return;
    }
    setForgotError('');
    setForgotSuccess('');
    setSimulatedToken('');
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit password reset request.');
      
      setForgotSuccess(data.message);
      if (data.simulatedToken) {
        setSimulatedToken(data.simulatedToken);
        setResetToken(data.simulatedToken);
      }
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !resetNewPassword || !resetConfirmPassword) {
      setResetError('All fields are required.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      
      setResetSuccess(data.message);
      setLoginEmail(forgotEmail || '');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setResetToken('');
      
      setTimeout(() => {
        setSubMode('none');
        setResetSuccess('');
      }, 3000);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Quick Demo Login Helper
  const handleDemoLogin = async (email: string, pass: string) => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      onLoginSuccess(data);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoginError('');
    setRegError('');
    setLoginLoading(true);
    try {
      const result = await signInWithPopup(clientAuth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed.');
      
      onLoginSuccess(data);
    } catch (err: any) {
      if (activeTab === 'login') {
        setLoginError(err.message || 'Google Sign-In failed.');
      } else {
        setRegError(err.message || 'Google Sign-Up failed.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Email and Password are required.');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials.');
      onLoginSuccess(data);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    // Validations
    if (!regName || !regEmail || !regPhone || !regPassword) {
      setRegError('All fields with * are required.');
      return;
    }

    if (regRole === 'fleet_owner' && (!regCompany || !regAddress)) {
      setRegError('Company Name and Business Address are required for fleet owners.');
      return;
    }

    if (!regDeclaration) {
      setRegError('You must accept the terms of use, privacy declarations, and accuracy rules.');
      return;
    }

    setRegLoading(true);
    try {
      const payload: any = {
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        user_role: regRole
      };

      if (regRole === 'fleet_owner') {
        payload.company_name = regCompany;
        payload.registration_number = regNumber;
        payload.business_address = regAddress;
        payload.fleet_size = regFleetSize;
        payload.platforms_used = regPlatforms;
      } else {
        const parts = regName.trim().split(' ');
        payload.first_name = driverFirstName || parts[0] || regName;
        payload.surname = driverSurname || parts.slice(1).join(' ') || 'Driver';
        payload.id_number = driverIdNumber;
        payload.platforms = driverPlatforms;
        payload.uber_rating = parseFloat(driverUberRating) || 4.8;
        payload.experience_years = parseInt(driverExperience) || 2;
        payload.city = driverCity;
        payload.province = driverProvince;
        payload.bio = driverBio;
        payload.references = driverReferences.filter(r => r.name.trim() !== '');
      }

      // Step 1: Register Account
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Registration failed.');

      // Automatically simulate a login to get token
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword })
      });
      const loginData = await loginRes.json();
      
      if (loginRes.ok && loginData.token && regRole === 'fleet_owner') {
        // Step 2: Upload Simulated Documents for Fleet Owner
        const token = loginData.token;
        const uploadDoc = async (type: string, name: string, fileData: string) => {
          await fetch('/api/verification/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              document_type: type,
              file_name: name,
              file_data: fileData
            })
          });
        };

        if (regCompressedScreenshot) {
          await uploadDoc('proof_of_ownership', regCompressedScreenshot.fileName, regCompressedScreenshot.base64);
        } else if (regFleetScreenshot) {
          await uploadDoc('proof_of_ownership', regFleetScreenshot.name, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        }
      }

      onRegisterSuccess(regData.message);
      setRegSuccess(
        regRole === 'driver'
          ? 'Your driver account & profile CV were created successfully! Please sign in with your credentials to view your driver portal.'
          : 'Your account and fleet ownership proof filings were registered successfully. Please log in with your credentials.'
      );
      // Clear forms
      setRegName(''); setRegEmail(''); setRegPhone(''); setRegPassword(''); setRegCompany(''); setRegAddress(''); setRegNumber('');
      setRegFleetScreenshot(null);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const handlePlatformCheck = (plat: string) => {
    if (regPlatforms.includes(plat)) {
      setRegPlatforms(regPlatforms.filter(p => p !== plat));
    } else {
      setRegPlatforms([...regPlatforms, plat]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-6 sm:py-12 px-3 sm:px-6">
      <div className="bg-white border border-stone-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-xs">
          {activeTab === 'login' ? (
            subMode === 'forgot' ? (
              <div className="space-y-6">
                <div className="text-center sm:text-left space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-[#1f1f1f]">Forgot Password</h2>
                  <p className="text-stone-500 text-xs">Enter your email address to receive a secure password reset token.</p>
                </div>

                {forgotSuccess ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 space-y-2">
                      <p className="font-semibold">{forgotSuccess}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          setSubMode('reset');
                          if (simulatedToken) setResetToken(simulatedToken);
                          setResetError('');
                          setResetSuccess('');
                        }}
                        className="flex-1 py-3 bg-[#1f1f1f] hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer text-center min-h-[44px]"
                      >
                        Proceed to Reset Password
                      </button>
                      <button
                        onClick={() => {
                          setSubMode('none');
                          setForgotSuccess('');
                          setSimulatedToken('');
                        }}
                        className="flex-1 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-sm rounded-xl transition-all cursor-pointer text-center min-h-[44px]"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. james@urbanfleets.co.za"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          className="w-full text-sm pl-11 pr-3.5 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                        />
                      </div>
                    </div>

                    {forgotError && (
                      <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold flex items-center space-x-2">
                        <AlertCircle className="h-4.5 w-4.5 text-stone-800" />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      {forgotLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Sending Token...</span>
                        </>
                      ) : (
                        <span>Request Password Reset</span>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSubMode('none');
                          setForgotError('');
                        }}
                        className="text-xs text-stone-500 hover:text-stone-900 font-bold underline transition-colors cursor-pointer py-2"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : subMode === 'reset' ? (
              <div className="space-y-6">
                <div className="text-center sm:text-left space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-[#1f1f1f]">Reset Your Password</h2>
                  <p className="text-stone-500 text-xs">Enter the secure reset token and your new password credentials below.</p>
                </div>

                {resetSuccess ? (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 font-semibold space-y-2 flex flex-col items-center py-6">
                    <div className="p-2 bg-stone-200 text-stone-900 rounded-full">
                      <ShieldCheck className="h-6 w-6 animate-pulse" />
                    </div>
                    <p>{resetSuccess}</p>
                    <p className="text-[10px] text-stone-500">Redirecting to sign in screen...</p>
                  </div>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Reset Token *</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. rst_..."
                          value={resetToken}
                          onChange={e => setResetToken(e.target.value)}
                          className="w-full text-sm pl-11 pr-3.5 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all font-mono placeholder-stone-400 min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">New Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <input
                          type="password"
                          required
                          placeholder="At least 8 chars, A-Z, a-z, 1-9, special"
                          value={resetNewPassword}
                          onChange={e => setResetNewPassword(e.target.value)}
                          className="w-full text-sm pl-11 pr-3.5 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Confirm New Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <input
                          type="password"
                          required
                          placeholder="Re-enter password"
                          value={resetConfirmPassword}
                          onChange={e => setResetConfirmPassword(e.target.value)}
                          className="w-full text-sm pl-11 pr-3.5 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                        />
                      </div>
                    </div>

                    {resetError && (
                      <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold flex items-center space-x-2">
                        <AlertCircle className="h-4.5 w-4.5 text-stone-800" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      {resetLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Resetting Password...</span>
                        </>
                      ) : (
                        <span>Reset Password</span>
                      )}
                    </button>

                    <div className="flex flex-col sm:flex-row justify-between pt-2 gap-2 text-center sm:text-left">
                      <button
                        type="button"
                        onClick={() => {
                          setSubMode('forgot');
                          setResetError('');
                        }}
                        className="text-xs text-stone-500 hover:text-stone-900 font-bold hover:underline transition-colors cursor-pointer py-1"
                      >
                        Back to Request Token
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubMode('none');
                          setResetError('');
                        }}
                        className="text-xs text-stone-500 hover:text-stone-900 font-bold hover:underline transition-colors cursor-pointer py-1"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Role Switcher Tabs for Login */}
                <div className="bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider px-2 py-1 mb-1">
                    Select Account Role to Sign In
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRoleTab('fleet_owner');
                        if (onSelectRolePreset) onSelectRolePreset('fleet_owner');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[40px] ${
                        loginRoleTab === 'fleet_owner'
                          ? 'bg-white text-[#1f1f1f] shadow-xs border border-stone-200'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5 text-[#1f1f1f]" />
                      <span className="hidden xs:inline">Fleet Owner</span>
                      <span className="xs:hidden">Owner</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginRoleTab('driver');
                        if (onSelectRolePreset) onSelectRolePreset('driver');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[40px] ${
                        loginRoleTab === 'driver'
                          ? 'bg-white text-[#1f1f1f] shadow-xs border border-stone-200'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <UserIcon className="h-3.5 w-3.5 text-stone-700" />
                      <span>Driver</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginRoleTab('admin');
                        if (onSelectRolePreset) onSelectRolePreset('admin');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[40px] ${
                        loginRoleTab === 'admin'
                          ? 'bg-white text-[#1f1f1f] shadow-xs border border-stone-200'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5 text-stone-700" />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-[#1f1f1f] flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {loginRoleTab === 'fleet_owner' && 'Fleet Owner Sign In'}
                      {loginRoleTab === 'driver' && 'Driver Portal Sign In'}
                      {loginRoleTab === 'admin' && 'Administrator Access'}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-stone-100 text-stone-800 border border-stone-200">
                      {loginRoleTab === 'fleet_owner' ? 'Fleet Operator' : loginRoleTab === 'driver' ? 'Driver Account' : 'System Admin'}
                    </span>
                  </h2>
                  <p className="text-stone-500 text-xs">
                    {loginRoleTab === 'fleet_owner' && 'Access verified incident search, driver references, and fleet reports.'}
                    {loginRoleTab === 'driver' && 'Sign in to manage your driver profile CV, PDP license details, and dispute records.'}
                    {loginRoleTab === 'admin' && 'Platform administration for verification reviews, driver moderation, and dispute clearance.'}
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        placeholder={
                          loginRoleTab === 'fleet_owner' ? 'e.g. james@urbanfleets.co.za' :
                          loginRoleTab === 'driver' ? 'e.g. sipho.driver@gmail.com' : 'e.g. tvengai75@gmail.com'
                        }
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        className="w-full text-sm pl-11 pr-3.5 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setSubMode('forgot');
                          setForgotError('');
                          setForgotSuccess('');
                          setSimulatedToken('');
                        }}
                        className="text-xs text-stone-600 hover:text-stone-900 font-bold hover:underline transition-all cursor-pointer py-1"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        className="w-full text-sm pl-11 pr-3.5 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold flex items-center space-x-2">
                      <AlertCircle className="h-4.5 w-4.5 text-stone-800" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3.5 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                  >
                    {loginLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-stone-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-stone-400 font-bold tracking-wider">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loginLoading}
                  className="w-full py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-3 shadow-xs min-h-[44px]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4c0,-0.71 -0.06,-1.39 -0.18,-2H21.35z" fill="#4285F4" />
                      <path d="M12,20.6c2.59,0 4.77,-0.86 6.36,-2.3l-3.3,-2.6c-0.91,0.61 -2.08,0.98 -3.06,0.98 -2.48,0 -4.59,-1.68 -5.34,-3.93H3.21v2.7c1.58,3.15 4.84,5.15 8.79,5.15z" fill="#34A853" />
                      <path d="M6.66,12.75c-0.13,-0.38 -0.21,-0.79 -0.21,-1.2c0,-0.41 0.08,-0.82 0.21,-1.2V7.65H3.21C2.65,8.77 2.33,10.05 2.33,11.4c0,1.35 0.32,2.63 0.88,3.75l3.45,-2.4V12.75z" fill="#FBBC05" />
                      <path d="M12,5.25c1.41,0 2.68,0.49 3.68,1.44l2.76,-2.76C16.77,2.32 14.59,1.4 12,1.4c-3.95,0 -7.21,2 -8.79,5.15l3.45,2.7c0.75,-2.25 2.86,-3.93 5.34,-3.93z" fill="#EA4335" />
                    </g>
                  </svg>
                  <span>Google</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="text-xs text-stone-500 hover:text-stone-900 font-bold underline transition-colors cursor-pointer py-1"
                  >
                    Don't have an operator account? Register your fleet now.
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-[#1f1f1f]">Create Account</h2>
                <p className="text-stone-500 text-xs">Join FleetCheck as a Fleet Operator or as a Rideshare Driver looking for vehicles.</p>
              </div>

              {/* Account Type Selection Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setRegRole('fleet_owner')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 min-h-[44px] ${
                    regRole === 'fleet_owner'
                      ? 'bg-white text-[#1f1f1f] shadow-xs border border-stone-200'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <Briefcase className="h-4 w-4 text-[#1f1f1f]" />
                  <span>Fleet Owner Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('driver')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 min-h-[44px] ${
                    regRole === 'driver'
                      ? 'bg-white text-[#1f1f1f] shadow-xs border border-stone-200'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <UserIcon className="h-4 w-4 text-stone-700" />
                  <span>Join as Driver</span>
                </button>
              </div>

              {regError && (
                <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4.5 w-4.5 text-stone-800" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess ? (
                <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 shadow-2xs">
                  <h3 className="font-bold text-stone-900 text-sm">Account Registered Successfully</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{regSuccess}</p>
                  <button
                    onClick={() => setActiveTab('login')}
                    className="px-4 py-2.5 bg-[#1f1f1f] hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[44px]"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  {/* Account Login Credentials */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 pb-1.5">1. Account & Login Credentials</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700">Full Name *</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Sipho Ndlovu"
                            value={regName}
                            onChange={e => setRegName(e.target.value)}
                            className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700">Email Address *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                          <input
                            type="email"
                            required
                            placeholder="e.g. sipho@gmail.com"
                            value={regEmail}
                            onChange={e => setRegEmail(e.target.value)}
                            className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700">Phone Number *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. +27 83 456 7890"
                            value={regPhone}
                            onChange={e => setRegPhone(e.target.value)}
                            className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-700">Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                          <input
                            type="password"
                            required
                            placeholder="At least 8 chars"
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role Specific Sections */}
                  {regRole === 'fleet_owner' ? (
                    <>
                      {/* Fleet / Business details */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 pb-1.5">2. Company & Fleet Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Company Name *</label>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Urban Fleets SA"
                                value={regCompany}
                                onChange={e => setRegCompany(e.target.value)}
                                className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">CIPC Reg Number (Optional)</label>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                              <input
                                type="text"
                                placeholder="e.g. 2019/543210/07"
                                value={regNumber}
                                onChange={e => setRegNumber(e.target.value)}
                                className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                              />
                            </div>
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-bold text-stone-700">Business Address *</label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Newtown, Johannesburg"
                                value={regAddress}
                                onChange={e => setRegAddress(e.target.value)}
                                className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Active Fleet Size (Vehicles)</label>
                            <div className="relative">
                              <Layers className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
                              <input
                                type="number"
                                min="1"
                                value={regFleetSize}
                                onChange={e => setRegFleetSize(e.target.value)}
                                className="w-full text-sm pl-10 pr-3.5 py-2.5 sm:py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-600 transition-all placeholder-stone-400 min-h-[44px]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Driver Specific Sections */
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 pb-1.5">2. Driver Marketplace Profile Details</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="text-xs font-bold text-stone-700 block mb-1">SA ID Number or Passport</label>
                          <input
                            type="text"
                            placeholder="e.g. 9204125890081"
                            value={driverIdNumber}
                            onChange={e => setDriverIdNumber(e.target.value)}
                            className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-stone-700 block mb-1">City</label>
                          <input
                            type="text"
                            placeholder="e.g. Johannesburg"
                            value={driverCity}
                            onChange={e => setDriverCity(e.target.value)}
                            className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-stone-700 block mb-1">Province</label>
                          <input
                            type="text"
                            placeholder="e.g. Gauteng"
                            value={driverProvince}
                            onChange={e => setDriverProvince(e.target.value)}
                            className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-stone-700 block mb-1">Uber Rating (e.g. 4.88)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={driverUberRating}
                            onChange={e => setDriverUberRating(e.target.value)}
                            className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-stone-700 block mb-1">Experience (Years)</label>
                          <input
                            type="number"
                            value={driverExperience}
                            onChange={e => setDriverExperience(e.target.value)}
                            className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-700 block mb-1">Self Pitch / Bio to Fleet Owners</label>
                        <textarea
                          rows={2}
                          placeholder="Experienced Uber/Bolt driver with a high rating looking for a vehicle to hire..."
                          value={driverBio}
                          onChange={e => setDriverBio(e.target.value)}
                          className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-xl"
                        />
                      </div>

                      {/* Contactable References */}
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-stone-800">Contactable References (Former Fleet Owners)</label>
                          <button
                            type="button"
                            onClick={() => setDriverReferences([...driverReferences, { name: '', company_name: '', phone: '', email: '', relationship: 'Former Fleet Owner' }])}
                            className="text-xs text-stone-900 font-bold hover:underline cursor-pointer"
                          >
                            + Add Reference
                          </button>
                        </div>

                        {driverReferences.map((ref, i) => (
                          <div key={i} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                              <input
                                type="text"
                                placeholder="Reference Name *"
                                value={ref.name}
                                onChange={e => {
                                  const copy = [...driverReferences];
                                  copy[i].name = e.target.value;
                                  setDriverReferences(copy);
                                }}
                                className="px-2.5 py-2 border border-stone-200 rounded-lg bg-white min-h-[40px]"
                              />
                              <input
                                type="text"
                                placeholder="Company / Fleet Name"
                                value={ref.company_name}
                                onChange={e => {
                                  const copy = [...driverReferences];
                                  copy[i].company_name = e.target.value;
                                  setDriverReferences(copy);
                                }}
                                className="px-2.5 py-2 border border-stone-200 rounded-lg bg-white min-h-[40px]"
                              />
                              <input
                                type="text"
                                placeholder="Phone Number"
                                value={ref.phone}
                                onChange={e => {
                                  const copy = [...driverReferences];
                                  copy[i].phone = e.target.value;
                                  setDriverReferences(copy);
                                }}
                                className="px-2.5 py-2 border border-stone-200 rounded-lg bg-white min-h-[40px]"
                              />
                              <input
                                type="email"
                                placeholder="Email"
                                value={ref.email}
                                onChange={e => {
                                  const copy = [...driverReferences];
                                  copy[i].email = e.target.value;
                                  setDriverReferences(copy);
                                }}
                                className="px-2.5 py-2 border border-stone-200 rounded-lg bg-white min-h-[40px]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Declaration */}
                  <div className="p-4 bg-stone-50 rounded-xl space-y-3 border border-stone-200">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regDeclaration}
                        onChange={e => setRegDeclaration(e.target.checked)}
                        className="mt-1 rounded-sm border-stone-300 text-stone-900 focus:ring-stone-500 h-4.5 w-4.5"
                      />
                      <span className="text-xs text-stone-600 leading-relaxed">
                        I confirm that all registration details are accurate. I understand that submitting false credentials or false driver claims is a material breach of terms.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3.5 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                  >
                    {regLoading ? 'Registering Account...' : regRole === 'driver' ? 'Join Driver Marketplace' : 'Register Fleet Operator'}
                  </button>
                </form>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
