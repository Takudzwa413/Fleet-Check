import React from 'react';
import { ShieldCheck, Mail, Lock, User as UserIcon, Phone, Briefcase, MapPin, Layers, FileText, CheckSquare, RefreshCw, AlertCircle, KeyRound, Info, Check, Building2 } from 'lucide-react';
import { compressImageFile, CompressedFileResult } from '../utils/imageCompressor';

interface AuthPagesProps {
  activeTab: 'login' | 'register';
  setActiveTab: (tab: 'login' | 'register' | 'home') => void;
  onLoginSuccess: (data: any) => void;
  onRegisterSuccess: (message: string) => void;
  selectedRolePreset?: 'fleet_owner' | 'driver' | 'admin';
  onSelectRolePreset?: (role: 'fleet_owner' | 'driver' | 'admin') => void;
  // True only when this page was reached via the hidden admin portal URL.
  // Public visitors never get here, so the login form skips straight to the
  // admin-only view instead of exposing an "Admin" option in the role switcher.
  isAdminPortal?: boolean;
}

export default function AuthPages({
  activeTab,
  setActiveTab,
  onLoginSuccess,
  onRegisterSuccess,
  selectedRolePreset = 'fleet_owner',
  onSelectRolePreset,
  isAdminPortal = false
}: AuthPagesProps) {
  // Login Role Tab
  const [loginRoleTab, setLoginRoleTab] = React.useState<'fleet_owner' | 'driver' | 'admin'>(
    isAdminPortal ? 'admin' : (selectedRolePreset === 'admin' ? 'fleet_owner' : selectedRolePreset)
  );

  React.useEffect(() => {
    if (isAdminPortal) {
      setLoginRoleTab('admin');
    } else if (selectedRolePreset && selectedRolePreset !== 'admin') {
      setLoginRoleTab(selectedRolePreset);
    }
  }, [selectedRolePreset, isAdminPortal]);

  // Login State
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [loginLoading, setLoginLoading] = React.useState(false);

  // Register State
  const [regRole, setRegRole] = React.useState<'fleet_owner' | 'driver'>(
    selectedRolePreset === 'driver' ? 'driver' : 'fleet_owner'
  );

  React.useEffect(() => {
    if (selectedRolePreset === 'driver' || selectedRolePreset === 'fleet_owner') {
      setRegRole(selectedRolePreset);
    }
  }, [selectedRolePreset]);
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
  const [driverBoltRating, setDriverBoltRating] = React.useState('4.90');
  const [driverExperience, setDriverExperience] = React.useState('3');
  const [driverCity, setDriverCity] = React.useState('Johannesburg');
  const [driverProvince, setDriverProvince] = React.useState('Gauteng');
  const [driverBio, setDriverBio] = React.useState('');
  const [driverReferences, setDriverReferences] = React.useState<Array<{ name: string; company_name: string; phone: string; email: string; relationship: string }>>([
    { name: '', company_name: '', phone: '', email: '', relationship: 'Former Fleet Owner' }
  ]);

  // Driver optional verification documents (uploaded post-registration, before verification)
  const [driverLicenseDoc, setDriverLicenseDoc] = React.useState<CompressedFileResult | null>(null);
  const [driverProfileScreenshotDoc, setDriverProfileScreenshotDoc] = React.useState<CompressedFileResult | null>(null);
  const [driverPassportDoc, setDriverPassportDoc] = React.useState<CompressedFileResult | null>(null);
  const [driverSafetyCheckDoc, setDriverSafetyCheckDoc] = React.useState<CompressedFileResult | null>(null);
  const [driverDocsCompressing, setDriverDocsCompressing] = React.useState<Record<string, boolean>>({});

  const handleDriverPlatformCheck = (plat: string) => {
    if (driverPlatforms.includes(plat)) {
      setDriverPlatforms(driverPlatforms.filter(p => p !== plat));
    } else {
      setDriverPlatforms([...driverPlatforms, plat]);
    }
  };

  const handleDriverDocChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<CompressedFileResult | null>>,
    key: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      setter(null);
      return;
    }
    setDriverDocsCompressing(prev => ({ ...prev, [key]: true }));
    try {
      const res = await compressImageFile(file, 150 * 1024);
      setter(res);
    } catch (err: any) {
      console.error(`Failed to process ${key} document:`, err);
      setter(null);
      setRegError(`Failed to process the ${key.replace(/_/g, ' ')} document: ` + (err?.message || 'unsupported or corrupted file. Please try a different image.'));
    } finally {
      setDriverDocsCompressing(prev => ({ ...prev, [key]: false }));
    }
  };

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
    } catch (err: any) {
      console.error('Failed to compress image:', err);
      setRegFleetScreenshot(null);
      setRegCompressedScreenshot(null);
      setRegError('Failed to process the fleet screenshot: ' + (err?.message || 'unsupported or corrupted file. Please try a different image.'));
    } finally {
      setScreenshotCompressing(false);
    }
  };

  // Fleet owner passport upload (optional, for identity verification alongside proof of fleet)
  const [regPassportDoc, setRegPassportDoc] = React.useState<File | null>(null);
  const [regCompressedPassport, setRegCompressedPassport] = React.useState<CompressedFileResult | null>(null);
  const [passportCompressing, setPassportCompressing] = React.useState(false);

  const handlePassportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setRegPassportDoc(null);
      setRegCompressedPassport(null);
      return;
    }
    setRegPassportDoc(file);
    setPassportCompressing(true);
    try {
      const res = await compressImageFile(file, 150 * 1024);
      setRegCompressedPassport(res);
    } catch (err: any) {
      console.error('Failed to compress passport image:', err);
      setRegPassportDoc(null);
      setRegCompressedPassport(null);
      setRegError('Failed to process the passport document: ' + (err?.message || 'unsupported or corrupted file. Please try a different image.'));
    } finally {
      setPassportCompressing(false);
    }
  };

  const [regDeclaration, setRegDeclaration] = React.useState(false);
  const [regPopiConsent, setRegPopiConsent] = React.useState(true);
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

    const hasUppercase = /[A-Z]/.test(regPassword);
    const hasLowercase = /[a-z]/.test(regPassword);
    const hasDigit = /\d/.test(regPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(regPassword);
    if (regPassword.length < 8 || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
      setRegError('Password must be at least 8 characters long, and contain an uppercase letter, lowercase letter, digit, and special character.');
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

    if (!regPopiConsent) {
      setRegError('You must consent to POPI Act data processing to register on FleetCheck.');
      return;
    }

    setRegLoading(true);
    try {
      const payload: any = {
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        role: regRole,
        user_role: regRole,
        popi_consent_accepted: regPopiConsent
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
        payload.surname = driverSurname || parts.slice(1).join(' ') || '';
        payload.id_number = driverIdNumber;
        payload.platforms = driverPlatforms;
        payload.uber_rating = parseFloat(driverUberRating) || 4.8;
        payload.bolt_rating = parseFloat(driverBoltRating) || 4.9;
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

      let docUploadFailures: string[] = [];

      if (loginRes.ok && loginData.token && regRole === 'fleet_owner') {
        // Step 2: Upload Documents for Fleet Owner (proof of fleet + optional passport)
        const token = loginData.token;
        const uploadFleetDoc = async (label: string, type: string, name: string, fileData: string) => {
          try {
            const res = await fetch('/api/verification/upload', {
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
            if (!res.ok) docUploadFailures.push(label);
          } catch {
            docUploadFailures.push(label);
          }
        };

        if (regCompressedScreenshot) {
          await uploadFleetDoc('Fleet Screenshot', 'proof_of_ownership', regCompressedScreenshot.fileName, regCompressedScreenshot.base64);
        } else if (regFleetScreenshot) {
          await uploadFleetDoc('Fleet Screenshot', 'proof_of_ownership', regFleetScreenshot.name, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        }

        if (regCompressedPassport) {
          await uploadFleetDoc('Passport', 'passport', regCompressedPassport.fileName, regCompressedPassport.base64);
        }
      }

      if (loginRes.ok && loginData.token && regRole === 'driver' && loginData.driverProfile?.id) {
        // Step 2: Upload optional verification documents for the new driver profile
        const token = loginData.token;
        const driverProfileId = loginData.driverProfile.id;
        const uploadDriverDoc = async (label: string, type: string, name: string, fileData: string) => {
          try {
            const res = await fetch(`/api/drivers/${driverProfileId}/verification-docs`, {
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
            if (!res.ok) docUploadFailures.push(label);
          } catch {
            docUploadFailures.push(label);
          }
        };

        if (driverLicenseDoc) await uploadDriverDoc("Driver's Licence", 'license', driverLicenseDoc.fileName, driverLicenseDoc.base64);
        if (driverProfileScreenshotDoc) await uploadDriverDoc('Platform Profile Screenshot', 'platform_profile', driverProfileScreenshotDoc.fileName, driverProfileScreenshotDoc.base64);
        if (driverPassportDoc) await uploadDriverDoc('Passport', 'passport', driverPassportDoc.fileName, driverPassportDoc.base64);
        if (driverSafetyCheckDoc) await uploadDriverDoc('Safety Check', 'safety_clearance', driverSafetyCheckDoc.fileName, driverSafetyCheckDoc.base64);
      }

      const hadDocsToUpload = regRole === 'driver'
        ? !!(driverLicenseDoc || driverProfileScreenshotDoc || driverPassportDoc || driverSafetyCheckDoc)
        : !!(regCompressedScreenshot || regFleetScreenshot || regCompressedPassport);

      if (regRole === 'driver') {
        setLoginRoleTab('driver');
        if (onSelectRolePreset) onSelectRolePreset('driver');
      } else {
        setLoginRoleTab('fleet_owner');
        if (onSelectRolePreset) onSelectRolePreset('fleet_owner');
      }

      onRegisterSuccess(regData.message);

      const portalName = regRole === 'driver' ? 'Driver Portal' : 'Fleet Owner Portal';
      let successMessage = regRole === 'driver'
        ? 'Your Driver account & marketplace CV were registered successfully! Sign in to access your Driver Portal.'
        : 'Your Fleet Owner account was registered successfully. Please log in with your credentials.';

      if (!loginRes.ok && hadDocsToUpload) {
        successMessage = `Your account was registered successfully, but we couldn't automatically attach your documents. Please sign in and upload them again from your ${portalName}.`;
      } else if (docUploadFailures.length > 0) {
        successMessage = `Your account was registered successfully, but the following document(s) failed to upload: ${docUploadFailures.join(', ')}. Please sign in and upload them again from your ${portalName}.`;
      } else if (hadDocsToUpload && regRole === 'fleet_owner') {
        successMessage = 'Your Fleet Owner account and verification documents were registered successfully. Please log in with your credentials.';
      }

      setRegSuccess(successMessage);
      // Clear forms
      setRegName(''); setRegEmail(''); setRegPhone(''); setRegPassword(''); setRegCompany(''); setRegAddress(''); setRegNumber('');
      setRegFleetScreenshot(null);
      setRegPassportDoc(null); setRegCompressedPassport(null);
      setDriverLicenseDoc(null); setDriverProfileScreenshotDoc(null); setDriverPassportDoc(null); setDriverSafetyCheckDoc(null);
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
                {/* Role Switcher Tabs for Login — the Admin option is never shown here;
                    admin sign-in is only reachable via the hidden portal URL below. */}
                {!isAdminPortal && (
                  <div className="bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider px-2 py-1 mb-1">
                      Select Account Role to Sign In
                    </div>
                    <div className="grid grid-cols-2 gap-1">
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
                        <span>Fleet Owner</span>
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
                    </div>
                  </div>
                )}

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
                          loginRoleTab === 'driver' ? 'e.g. sipho.driver@gmail.com' : 'e.g. admin@fleetcheck.co.za'
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

                {!isAdminPortal && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setActiveTab('register')}
                      className="text-xs text-stone-500 hover:text-stone-900 font-bold underline transition-colors cursor-pointer py-1"
                    >
                      Don't have an operator account? Register your fleet now.
                    </button>
                  </div>
                )}
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
                            placeholder="At least 8 chars, A-Z, a-z, 1-9, special"
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

                      {/* Verification Documents */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 pb-1.5">3. Verification Documents (Optional)</h3>
                        <p className="text-[11px] text-stone-500">You can upload these now or later from your dashboard. An administrator must review them before your account is fully verified.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Screenshot of Fleet (Proof of Ownership)</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleScreenshotChange}
                              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 border border-stone-200 rounded-xl min-h-[44px] flex items-center"
                            />
                            {screenshotCompressing && <p className="text-[10px] text-stone-400">Compressing image...</p>}
                            {regCompressedScreenshot && <p className="text-[10px] text-emerald-600 font-semibold">Attached: {regCompressedScreenshot.fileName}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Passport / ID Document</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handlePassportChange}
                              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 border border-stone-200 rounded-xl min-h-[44px] flex items-center"
                            />
                            {passportCompressing && <p className="text-[10px] text-stone-400">Compressing image...</p>}
                            {regCompressedPassport && <p className="text-[10px] text-emerald-600 font-semibold">Attached: {regCompressedPassport.fileName}</p>}
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
                          <label className="text-xs font-bold text-stone-700 block mb-1">Bolt Rating (e.g. 4.90)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={driverBoltRating}
                            onChange={e => setDriverBoltRating(e.target.value)}
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
                        <label className="text-xs font-bold text-stone-700 block mb-1.5">Platform of Choice</label>
                        <div className="flex flex-wrap gap-3">
                          {['Uber', 'Bolt', 'inDrive', 'DiDi'].map(plat => (
                            <label key={plat} className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                              <input
                                type="checkbox"
                                checked={driverPlatforms.includes(plat)}
                                onChange={() => handleDriverPlatformCheck(plat)}
                                className="rounded-sm border-stone-300 text-stone-900 focus:ring-stone-500 h-3.5 w-3.5"
                              />
                              <span>{plat}</span>
                            </label>
                          ))}
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

                      {/* Verification Documents */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs font-bold text-stone-800">Verification Documents (Optional)</label>
                          <p className="text-[11px] text-stone-500 mt-0.5">You can upload these now or later from your Driver Portal. An administrator must review them before your profile is fully verified.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Driver's Licence</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => handleDriverDocChange(e, setDriverLicenseDoc, 'license')}
                              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 border border-stone-200 rounded-xl min-h-[44px] flex items-center"
                            />
                            {driverDocsCompressing.license && <p className="text-[10px] text-stone-400">Compressing image...</p>}
                            {driverLicenseDoc && <p className="text-[10px] text-emerald-600 font-semibold">Attached: {driverLicenseDoc.fileName}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Screenshot of Platform Profile (Uber/Bolt)</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => handleDriverDocChange(e, setDriverProfileScreenshotDoc, 'platform_profile')}
                              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 border border-stone-200 rounded-xl min-h-[44px] flex items-center"
                            />
                            {driverDocsCompressing.platform_profile && <p className="text-[10px] text-stone-400">Compressing image...</p>}
                            {driverProfileScreenshotDoc && <p className="text-[10px] text-emerald-600 font-semibold">Attached: {driverProfileScreenshotDoc.fileName}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Passport / ID Document</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => handleDriverDocChange(e, setDriverPassportDoc, 'passport')}
                              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 border border-stone-200 rounded-xl min-h-[44px] flex items-center"
                            />
                            {driverDocsCompressing.passport && <p className="text-[10px] text-stone-400">Compressing image...</p>}
                            {driverPassportDoc && <p className="text-[10px] text-emerald-600 font-semibold">Attached: {driverPassportDoc.fileName}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700">Safety Check (Police Clearance / PDP Safety Certificate)</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => handleDriverDocChange(e, setDriverSafetyCheckDoc, 'safety_clearance')}
                              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 border border-stone-200 rounded-xl min-h-[44px] flex items-center"
                            />
                            {driverDocsCompressing.safety_clearance && <p className="text-[10px] text-stone-400">Compressing image...</p>}
                            {driverSafetyCheckDoc && <p className="text-[10px] text-emerald-600 font-semibold">Attached: {driverSafetyCheckDoc.fileName}</p>}
                          </div>
                        </div>
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

                  {/* POPI Act Consent */}
                  <div className="p-4 bg-stone-50 rounded-xl space-y-3 border border-stone-200">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regPopiConsent}
                        onChange={e => setRegPopiConsent(e.target.checked)}
                        className="mt-1 rounded-sm border-stone-300 text-stone-900 focus:ring-stone-500 h-4.5 w-4.5"
                      />
                      <span className="text-xs text-stone-600 leading-relaxed">
                        I consent, in terms of the Protection of Personal Information Act (POPIA), to FleetCheck processing my personal information and that of the {regRole === 'driver' ? 'fleet owner(s)' : 'driver(s)'} I engage with on this platform, for the purposes of driver verification, incident reference checks, and dispute resolution.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading || screenshotCompressing || passportCompressing || Object.values(driverDocsCompressing).some(Boolean)}
                    className="w-full py-3.5 bg-[#1f1f1f] hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                  >
                    {regLoading
                      ? 'Registering Account...'
                      : (screenshotCompressing || passportCompressing || Object.values(driverDocsCompressing).some(Boolean))
                      ? 'Processing Documents...'
                      : regRole === 'driver' ? 'Join Driver Marketplace' : 'Register Fleet Operator'}
                  </button>
                </form>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
