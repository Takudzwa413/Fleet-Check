import React, { useState, useEffect } from 'react';
import { User, DriverProfile, Complaint, DriverReference, DriverLinkRequest } from '../types';
import {
  ShieldCheck, AlertTriangle, FileText, CheckCircle2, Clock, Plus, Trash2, Edit3, Send,
  Upload, Star, MapPin, Phone, Mail, Award, Info, RefreshCw, User as UserIcon, Building2,
  Search, Check, X, Link, ArrowUpRight
} from 'lucide-react';
import DashboardLayout, { NavItem, StatChip } from './layout/DashboardLayout';

interface DriverDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function DriverDashboard({ user, onLogout }: DriverDashboardProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'fleet_link' | 'complaints'>('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [complaints, setComplaints] = useState<(Complaint & { dispute?: any })[]>([]);
  const [linkRequests, setLinkRequests] = useState<DriverLinkRequest[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing profile state
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [status, setStatus] = useState<'looking_for_vehicle' | 'employed' | 'not_available'>('looking_for_vehicle');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [uberRating, setUberRating] = useState(4.8);
  const [boltRating, setBoltRating] = useState(4.9);
  const [experienceYears, setExperienceYears] = useState(2);
  const [licenseType, setLicenseType] = useState('Code 8 PDP');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Uber', 'Bolt']);
  const [references, setReferences] = useState<DriverReference[]>([]);
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // Fleet Owner Search & Link Request State
  const [searchOwnerQuery, setSearchOwnerQuery] = useState('');
  const [ownerSearchResults, setOwnerSearchResults] = useState<any[]>([]);
  const [searchingOwners, setSearchingOwners] = useState(false);
  const [requestingOwnerId, setRequestingOwnerId] = useState<string | null>(null);

  // Dispute / Rebuttal Modal State
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [disputeText, setDisputeText] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    fetchDriverData();
    fetchLinkRequests();
  }, [user]);

  const fetchDriverData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch('/api/driver/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load driver details');

      setProfile(data.profile);
      setComplaints(data.complaints || []);

      // Populate edit fields
      if (data.profile) {
        setFirstName(data.profile.first_name || user.name.split(' ')[0] || '');
        setSurname(data.profile.surname || user.name.split(' ').slice(1).join(' ') || '');
        setPhone(data.profile.phone || user.phone || '');
        setEmail(data.profile.email || user.email || '');
        setIdNumber(data.profile.id_number || '');
        setStatus(data.profile.status || 'looking_for_vehicle');
        setBio(data.profile.bio || '');
        setCity(data.profile.city || '');
        setProvince(data.profile.province || '');
        setUberRating(data.profile.uber_rating || 4.8);
        setBoltRating(data.profile.bolt_rating || 4.9);
        setExperienceYears(data.profile.experience_years || 2);
        setLicenseType(data.profile.license_type || 'Code 8 PDP');
        setSelectedPlatforms(data.profile.platforms || ['Uber', 'Bolt']);
        setReferences(data.profile.references || []);
      }
    } catch (err: any) {
      console.error('Error loading driver data:', err);
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkRequests = async () => {
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch('/api/driver/link-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLinkRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load link requests:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch('/api/driver/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: firstName,
          surname,
          phone,
          email,
          id_number: idNumber,
          status,
          bio,
          city,
          province,
          platforms: selectedPlatforms,
          uber_rating: uberRating,
          bolt_rating: boltRating,
          experience_years: experienceYears,
          license_type: licenseType,
          references
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfile(data.profile);
      setIsEditing(false);
      setSuccessMsg('Your driver profile details and references have been updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile changes');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleSearchFleetOwners = async (queryStr: string) => {
    setSearchOwnerQuery(queryStr);
    if (!queryStr.trim() || queryStr.trim().length < 2) {
      setOwnerSearchResults([]);
      return;
    }

    setSearchingOwners(true);
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch(`/api/driver/search-fleet-owners?q=${encodeURIComponent(queryStr)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setOwnerSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Error searching fleet owners:', err);
    } finally {
      setSearchingOwners(false);
    }
  };

  const handleRequestOwnerLink = async (fleetOwnerUserId: string) => {
    setRequestingOwnerId(fleetOwnerUserId);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch('/api/driver/request-fleet-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fleet_owner_user_id: fleetOwnerUserId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send request');

      setSuccessMsg(data.message || 'Assignment request sent to Fleet Owner!');
      setSearchOwnerQuery('');
      setOwnerSearchResults([]);
      fetchDriverData();
      fetchLinkRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to send assignment request');
    } finally {
      setRequestingOwnerId(null);
    }
  };

  const handleCancelLinkRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch(`/api/driver/cancel-link-request/${requestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel request');

      setSuccessMsg('Fleet Owner link request cancelled.');
      fetchDriverData();
      fetchLinkRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    }
  };

  const handleTogglePlatform = (plat: string) => {
    if (selectedPlatforms.includes(plat)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== plat));
    } else {
      setSelectedPlatforms([...selectedPlatforms, plat]);
    }
  };

  const handleAddReference = () => {
    setReferences([
      ...references,
      {
        id: 'ref_' + Math.random().toString(36).substr(2, 9),
        name: '',
        company_name: '',
        phone: '',
        email: '',
        relationship: 'Former Fleet Owner'
      }
    ]);
  };

  const handleRemoveReference = (id: string) => {
    setReferences(references.filter(r => r.id !== id));
  };

  const handleReferenceChange = (id: string, field: keyof DriverReference, val: string) => {
    setReferences(references.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint || !disputeText.trim()) return;

    setSubmittingDispute(true);
    setError('');

    try {
      const token = localStorage.getItem('fc_token');
      const evidenceList = evidenceFileName ? [{ file_name: evidenceFileName, file_path: evidenceFileName }] : [];

      const res = await fetch('/api/driver/respond-complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          complaint_id: activeComplaint.id,
          dispute_text: disputeText,
          evidence_list: evidenceList
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit response');

      setSuccessMsg('Your response comment and evidence have been recorded! The report status is now marked as Disputed.');
      setActiveComplaint(null);
      setDisputeText('');
      setEvidenceFileName('');
      fetchDriverData();
    } catch (err: any) {
      setError(err.message || 'Failed to record response');
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1f1f1f] mx-auto"></div>
        <p className="text-stone-500 text-sm">Loading your driver portal...</p>
      </div>
    );
  }

  const navItems: NavItem[] = [
    {
      id: 'profile',
      label: 'Digital CV & Profile',
      icon: <UserIcon className="h-4 w-4" />,
      category: 'OVERVIEW',
      tooltipTitle: 'Digital CV & Profile',
      tooltip: 'Your verified commercial driver profile, contact credentials, experience, and references.'
    },
    {
      id: 'fleet_link',
      label: 'Fleet Owner Link',
      icon: <Building2 className="h-4 w-4" />,
      category: 'OPERATIONS',
      badge: linkRequests.length > 0 ? linkRequests.length : undefined,
      badgeColor: 'bg-stone-900 text-white',
      tooltipTitle: 'Fleet Owner Link & Applications',
      tooltip: 'Connect with verified fleet owners, accept vehicle invitations, or request fleet assignment.'
    },
    {
      id: 'complaints',
      label: 'Incident Records & Rebuttals',
      icon: <FileText className="h-4 w-4" />,
      category: 'OPERATIONS',
      badge: complaints.length > 0 ? complaints.length : undefined,
      badgeColor: complaints.length > 0 ? 'bg-stone-900 text-white' : undefined,
      tooltipTitle: 'Incident Records & Right of Reply',
      tooltip: 'Review incident reports filed on your profile and exercise your statutory Right of Reply.'
    }
  ];

  const statChips: StatChip[] = [
    {
      label: 'Marketplace Status',
      value: profile?.status === 'looking_for_vehicle' ? 'Looking for Vehicle' : 'Employed',
      subtext: profile?.status === 'looking_for_vehicle' ? 'Visible to Fleet Owners' : 'Currently Driving',
      icon: <UserIcon className="h-5 w-5" />,
      iconBgColor: 'bg-stone-100',
      iconTextColor: 'text-stone-800',
      trend: 'Active',
      trendUp: true,
      tooltipTitle: 'Marketplace Visibility Status',
      tooltip: 'When set to Looking for Vehicle, your profile and verified CV are surfaced in Fleet Owner directory searches.'
    },
    {
      label: 'Driver Rating',
      value: `${profile?.uber_rating || 4.8} / 5.0`,
      subtext: `${profile?.experience_years || 2} Years Experience`,
      icon: <Star className="h-5 w-5" />,
      iconBgColor: 'bg-amber-50',
      iconTextColor: 'text-amber-700',
      trend: 'Top 5%',
      trendUp: true,
      tooltipTitle: 'Platform Rating & Experience',
      tooltip: 'Aggregated driver ratings across Uber, Bolt, and inDrive platforms reflecting high passenger satisfaction.'
    },
    {
      label: 'Assigned Operator',
      value: profile?.fleet_owner_name ? 'Linked' : 'Independent',
      subtext: profile?.fleet_owner_name || 'No fleet currently linked',
      icon: <Building2 className="h-5 w-5" />,
      iconBgColor: 'bg-stone-100',
      iconTextColor: 'text-stone-800',
      trend: profile?.fleet_owner_name ? 'Verified' : 'Unlinked',
      trendUp: !!profile?.fleet_owner_name,
      tooltipTitle: 'Fleet Owner Linkage',
      tooltip: 'Indicates whether you are actively linked with a registered and verified fleet management company.'
    },
    {
      label: 'Clean Record Dossier',
      value: complaints.length === 0 ? '100% Clean' : `${complaints.length} Filed`,
      subtext: complaints.length === 0 ? 'Zero active incidents' : 'Right to reply active',
      icon: <ShieldCheck className="h-5 w-5" />,
      iconBgColor: complaints.length === 0 ? 'bg-emerald-50' : 'bg-stone-100',
      iconTextColor: complaints.length === 0 ? 'text-emerald-700' : 'text-stone-800',
      trend: complaints.length === 0 ? 'Protected' : 'Dispute Open',
      trendUp: complaints.length === 0,
      tooltipTitle: 'Incident Record Status',
      tooltip: 'Clean records reflect no approved negative incidents. If an incident is reported, you can file a formal dispute.'
    }
  ];

  const contactsList = [
    ...(profile?.fleet_owner_name
      ? [
          {
            id: 'owner',
            title: profile.fleet_owner_name,
            subtitle: 'Assigned Fleet Operator',
            tag: 'Employer',
            avatarInitials: 'FO',
            actionLabel: 'Details',
            onAction: () => setActiveTab('fleet_link')
          }
        ]
      : []),
    {
      id: 'support',
      title: 'Driver Advocacy & Dispute Support',
      subtitle: 'disputes@fleetcheck.co.za',
      tag: 'Legal',
      avatarInitials: 'DA',
      actionLabel: 'Contact',
      onAction: () => alert('Contacting Driver Dispute Support at disputes@fleetcheck.co.za')
    }
  ];

  return (
    <DashboardLayout
      user={user}
      roleTitle="Driver Portal"
      roleBadgeText={profile?.status === 'looking_for_vehicle' ? 'Looking for Vehicle' : 'Employed Driver'}
      roleBadgeColor="bg-stone-100 text-stone-800 border-stone-200"
      onLogout={onLogout}
      navItems={navItems}
      activeNavId={activeTab}
      onSelectNav={(id: any) => setActiveTab(id)}
      searchPlaceholder="Search fleet owners, companies, incident history..."
      onSearch={(q) => {
        if (q.trim() && activeTab !== 'fleet_link') {
          setActiveTab('fleet_link');
          setSearchOwnerQuery(q);
        }
      }}
      heroTag="DRIVER EMPOWERMENT & CV"
      heroTitle="Showcase Your Track Record & Connect with Fleet Owners"
      heroSubtitle="Maintain your verified digital CV, showcase verified passenger ratings, and protect your professional reputation with transparent right-of-reply dispute tools."
      heroActionLabel={isEditing ? 'Cancel Editing' : 'Edit Profile & References'}
      heroActionIcon={<Edit3 className="h-4 w-4 text-stone-900" />}
      onHeroAction={() => {
        setIsEditing(!isEditing);
        setActiveTab('profile');
      }}
      heroSecondaryActionLabel="Link Fleet Owner"
      onHeroSecondaryAction={() => setActiveTab('fleet_link')}
      statChips={statChips}
      scorePercentage={complaints.length === 0 ? 98 : 80}
      scoreLabel="Trust Rating"
      statusHeadline={user.name}
      statusSubtext="Your professional driver profile is accessible to verified fleet operators across South Africa."
      contactsTitle="My Fleet & Support"
      contacts={contactsList}
    >
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm flex justify-between items-center shadow-2xs">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs sm:text-sm flex justify-between items-center shadow-2xs">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 font-bold text-xs cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* TAB 1: Profile & Digital CV */}
      {activeTab === 'profile' && (
        isEditing ? (
          <form onSubmit={handleUpdateProfile} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Update Driver Profile & Personal Details</h2>
              <p className="text-slate-500 text-xs mt-0.5">Keep your information up to date so fleet owners can discover and hire you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="First Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Surname *</label>
                <input
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="Surname"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="+27 82 123 4567"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="driver@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">SA ID / Passport Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="ID Number"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Marketplace Availability Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                >
                  <option value="looking_for_vehicle">Looking for Vehicle to Hire</option>
                  <option value="employed">Currently Employed / Driving</option>
                  <option value="not_available">Not Available</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="e.g. Cape Town"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Province</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="e.g. Western Cape"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Driver License Code</label>
                <input
                  type="text"
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                  placeholder="e.g. Code 8 / Code 10 PDP"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Uber Rating (Stars)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={uberRating}
                  onChange={(e) => setUberRating(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Bolt Rating (Stars)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={boltRating}
                  onChange={(e) => setBoltRating(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Platforms Driven</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Uber', 'Bolt', 'inDrive', 'Delivery/Courier', 'Trucking', 'Private Chauffeur'].map(plat => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => handleTogglePlatform(plat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedPlatforms.includes(plat)
                        ? 'bg-[#1f1f1f] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {selectedPlatforms.includes(plat) ? `✓ ${plat}` : `+ ${plat}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Professional Bio / Self Pitch</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400"
                placeholder="Brief summary of your driving history, vehicle care habits, and reliability..."
              />
            </div>

            {/* References Edit Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Past Employer & Fleet References</h3>
                  <p className="text-xs text-slate-500">Add references so prospective fleet owners can verify your history.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddReference}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Reference</span>
                </button>
              </div>

              {references.map((ref, index) => (
                <div key={ref.id || index} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => handleRemoveReference(ref.id)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-600 p-1"
                    title="Remove reference"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={ref.name}
                        onChange={(e) => handleReferenceChange(ref.id, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs"
                        placeholder="Reference Name"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Company / Fleet Name</label>
                      <input
                        type="text"
                        value={ref.company_name}
                        onChange={(e) => handleReferenceChange(ref.id, 'company_name', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs"
                        placeholder="e.g. Soweto Fleet Co"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={ref.phone}
                        onChange={(e) => handleReferenceChange(ref.id, 'phone', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs"
                        placeholder="+27 82 123 4567"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Email / Relationship</label>
                      <input
                        type="text"
                        value={ref.email}
                        onChange={(e) => handleReferenceChange(ref.id, 'email', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs mb-1"
                        placeholder="Reference Email"
                      />
                      <input
                        type="text"
                        value={ref.relationship}
                        onChange={(e) => handleReferenceChange(ref.id, 'relationship', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs"
                        placeholder="e.g. Former Fleet Owner"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingProfile}
                className="px-5 py-2.5 bg-[#1f1f1f] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-stone-800 disabled:opacity-50 cursor-pointer min-h-[40px]"
              >
                {submittingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          /* Profile Summary Card */
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Driver Profile & Digital CV</h2>
                <p className="text-xs text-slate-500">Your profile is visible on the FleetCheck Driver Marketplace.</p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                profile?.status === 'looking_for_vehicle'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {profile?.status === 'looking_for_vehicle' ? '✓ Looking for Vehicle to Hire' : 'Currently Driving / Employed'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Uber Rating</span>
                <div className="flex items-center space-x-1 font-bold text-slate-800 mt-1">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>{profile?.uber_rating || 4.8} / 5.0</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Experience</span>
                <span className="font-bold text-slate-800 mt-1 block">{profile?.experience_years || 2} Years</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Location</span>
                <span className="font-bold text-slate-800 mt-1 block">{profile?.city || 'Gauteng'}, {profile?.province || 'South Africa'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">License</span>
                <span className="font-bold text-slate-800 mt-1 block">{profile?.license_type || 'Code 8 PDP'}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Self Pitch / Bio</h3>
              <p className="text-xs text-slate-700 italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                "{profile?.bio || 'Experienced and reliable commercial driver with a proven track record of safe operation, verified customer ratings, and meticulous vehicle care.'}"
              </p>
            </div>

            {/* References Display */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contactable References</h3>
              {(!profile?.references || profile.references.length === 0) ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">No references added yet. Click "Edit Profile & References" above to add contactable former fleet operators.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.references.map((ref) => (
                    <div key={ref.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900">{ref.name}</span>
                        {ref.is_verified_fleet_owner ? (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center space-x-1">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Verified Fleet Owner</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Unverified</span>
                        )}
                      </div>
                      <div className="text-slate-600 font-medium">{ref.company_name} ({ref.relationship})</div>
                      <div className="text-slate-500 font-mono text-[11px] pt-1 border-t border-slate-200/50">
                        Phone: {ref.phone} {ref.email ? `| Email: ${ref.email}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* TAB 2: Fleet Owner Link */}
      {activeTab === 'fleet_link' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-stone-800" />
                <h2 className="text-base sm:text-lg font-bold text-stone-900">Add & Link Fleet Owner to Profile</h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Search our database by Fleet Owner Name, Company, Email, or Phone to assign your Fleet Owner. The Fleet Owner must approve your request before it is verified on your profile.
              </p>
            </div>
          </div>

          {/* Assigned Fleet Owner Badge / Status */}
          {profile?.fleet_owner_name && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Assigned Fleet Owner</div>
                  <div className="text-base font-bold text-slate-900">{profile.fleet_owner_name}</div>
                  <div className="text-xs text-emerald-700 font-medium">Currently attached to this fleet operator</div>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Verified Assignment</span>
              </span>
            </div>
          )}

          {/* Pending & Approved Fleet Owner Link Requests */}
          {linkRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Fleet Owner Link Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {linkRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-stone-900 text-sm">{req.fleet_owner_name}</span>
                        <div className="text-xs font-semibold text-stone-700">{req.fleet_owner_company}</div>
                        <div className="text-[11px] text-stone-500 font-mono mt-0.5">{req.fleet_owner_email} | {req.fleet_owner_phone}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase flex items-center space-x-1 ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : req.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {req.status === 'approved' ? (
                          <>
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span>Approved & Verified</span>
                          </>
                        ) : req.status === 'pending' ? (
                          <>
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Pending Approval</span>
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 text-red-600" />
                            <span>Declined</span>
                          </>
                        )}
                      </span>
                    </div>

                    {req.status === 'pending' && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCancelLinkRequest(req.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          <span>Cancel Request</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Database Search for Fleet Owner */}
          <div className="space-y-4 bg-stone-50 p-5 rounded-2xl border border-stone-200">
            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
              <Search className="h-4 w-4 text-stone-900" />
              <span>Search Registry for Fleet Owner</span>
            </h3>

            <div className="relative">
              <input
                type="text"
                value={searchOwnerQuery}
                onChange={(e) => handleSearchFleetOwners(e.target.value)}
                placeholder="Search by Fleet Owner name, company name, email, or phone number..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm focus:border-stone-400 outline-none"
              />
              <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-3" />
              {searchingOwners && (
                <RefreshCw className="h-4 w-4 text-stone-900 animate-spin absolute right-3.5 top-3" />
              )}
            </div>

            {/* Search Results Dropdown/List */}
            {searchOwnerQuery.trim().length >= 2 && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-lg divide-y divide-stone-100 max-h-60 overflow-y-auto">
                {ownerSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-500">
                    No registered fleet owners found matching "{searchOwnerQuery}".
                  </div>
                ) : (
                  ownerSearchResults.map((owner) => (
                    <div key={owner.user_id} className="p-3.5 hover:bg-stone-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-stone-900 text-sm">{owner.name}</span>
                          {owner.verification_status === 'verified' && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center space-x-0.5">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              <span>Verified Owner</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-700 font-semibold">{owner.company_name}</div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          {owner.email} | {owner.phone}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={requestingOwnerId === owner.user_id}
                        onClick={() => handleRequestOwnerLink(owner.user_id)}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-2xs disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                      >
                        <Link className="h-3.5 w-3.5" />
                        <span>{requestingOwnerId === owner.user_id ? 'Sending...' : 'Request Link'}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Reports & Rebuttals */}
      {activeTab === 'complaints' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-2xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">Filed Incident Reports & Dispute Options</h2>
            <p className="text-stone-500 text-xs mt-0.5">
              FleetCheck provides drivers full right of reply. Any complaint filed against your details is listed below, allowing you to state your side of the case.
            </p>
          </div>

          {complaints.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-100 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-stone-800">Clean Operating Record</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">
                There are no filed complaints or negative reports matching your details on FleetCheck.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((comp) => (
                <div key={comp.id} className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-stone-900 text-white">
                          {comp.incident_category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-stone-500 font-mono">ID: {comp.id}</span>
                      </div>
                      <div className="text-xs text-stone-600">
                        Incident Date: <span className="font-semibold text-stone-900">{comp.incident_date}</span> | Severity: <span className="font-semibold uppercase text-amber-700">{comp.severity}</span>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      comp.status === 'disputed'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : comp.status === 'approved'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-stone-200 text-stone-700'
                    }`}>
                      Status: {comp.status}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed bg-white p-3 rounded-xl border border-stone-200">
                    {comp.description}
                  </p>

                  {/* If driver already submitted a response */}
                  {comp.dispute ? (
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2 text-xs">
                      <div className="font-bold text-amber-900 flex items-center space-x-1">
                        <Info className="h-4 w-4 text-amber-600" />
                        <span>Your Response Comment / Rebuttal</span>
                      </div>
                      <p className="text-amber-950 italic">
                        "{comp.dispute.dispute_text}"
                      </p>
                      <div className="text-[11px] text-amber-700">
                        Submitted on: {new Date(comp.dispute.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setActiveComplaint(comp)}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors shadow-2xs cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>State My Side of the Case</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dispute Modal */}
      {activeComplaint && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200">
            <div className="border-b border-stone-100 pb-4">
              <h3 className="text-lg font-bold text-stone-900">State Your Side of the Case</h3>
              <p className="text-xs text-stone-500 mt-1">
                Report Category: <span className="font-semibold text-stone-800">{activeComplaint.incident_category}</span>
              </p>
            </div>

            <form onSubmit={handleSubmitDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Your Detailed Response / Explanation *
                </label>
                <textarea
                  rows={4}
                  required
                  value={disputeText}
                  onChange={(e) => setDisputeText(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:border-stone-400 outline-none"
                  placeholder="Explain what occurred during the incident, provide context, or dispute false claims..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Supporting Document / Evidence Name (Optional)
                </label>
                <input
                  type="text"
                  value={evidenceFileName}
                  onChange={(e) => setEvidenceFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none"
                  placeholder="e.g. dashcam_clip_proof.mp4 or trip_receipt.pdf"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveComplaint(null)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="px-5 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-stone-800 disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submittingDispute ? 'Submitting...' : 'Submit Rebuttal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
