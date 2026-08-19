import React, { useState } from 'react';
import {
  ShieldCheck, Search, Bell, Menu, X, LogOut,
  Building2, Sparkles, Phone, Mail, FileText,
  Activity, Star, Layers, RefreshCw, ArrowRight,
  SlidersHorizontal, ArrowUpDown, Plus, MoreVertical,
  Calendar, MessageSquare, CheckCircle2, AlertCircle,
  HelpCircle, ShieldAlert, FileCheck, Users, Flame, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { Tooltip } from '../ui/Tooltip';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
  category?: string;
  tooltipTitle?: string;
  tooltip?: string;
}

export interface StatChip {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  trend?: string;
  trendUp?: boolean;
  tooltipTitle?: string;
  tooltip?: string;
}

export interface DashboardLayoutProps {
  user: User;
  roleTitle: string;
  roleBadgeText?: string;
  roleBadgeColor?: string;
  onLogout: () => void;
  
  // Navigation
  navItems: NavItem[];
  activeNavId: string;
  onSelectNav: (id: string) => void;
  
  // Search
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  
  // Hero / Metric Banner
  heroTag?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroActionLabel?: string;
  heroActionIcon?: React.ReactNode;
  onHeroAction?: () => void;
  heroSecondaryActionLabel?: string;
  onHeroSecondaryAction?: () => void;
  
  // Stat Quick-Chips
  statChips?: StatChip[];
  
  // Direct Quick Link Actions
  onInspectLive?: () => void;
  onAuditLogs?: () => void;
  
  // Right Sidebar Widgets
  showRightPanel?: boolean;
  scorePercentage?: number;
  scoreLabel?: string;
  statusHeadline?: string;
  statusSubtext?: string;
  chartData?: { day: string; value: number }[];
  contactsTitle?: string;
  contacts?: {
    id: string;
    title: string;
    subtitle: string;
    tag?: string;
    avatarInitials?: string;
    actionLabel?: string;
    onAction?: () => void;
  }[];
  
  // Main Content Children
  children: React.ReactNode;
}

export default function DashboardLayout({
  user,
  roleTitle,
  roleBadgeText,
  roleBadgeColor = 'bg-stone-100 text-stone-700 border-stone-200',
  onLogout,
  navItems,
  activeNavId,
  onSelectNav,
  searchPlaceholder = 'Search records, ID numbers, plates...',
  onSearch,
  heroTag,
  heroTitle,
  heroSubtitle,
  heroActionLabel,
  heroActionIcon,
  onHeroAction,
  heroSecondaryActionLabel,
  onHeroSecondaryAction,
  statChips = [],
  onInspectLive,
  onAuditLogs,
  showRightPanel = true,
  scorePercentage = 96,
  scoreLabel = 'Trust Score',
  statusHeadline,
  statusSubtext,
  chartData = [
    { day: 'Mon', value: 45 },
    { day: 'Tue', value: 85 },
    { day: 'Wed', value: 60 },
    { day: 'Thu', value: 90 },
    { day: 'Fri', value: 75 }
  ],
  contactsTitle = 'Assigned Team & Contacts',
  contacts = [],
  children
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([
    { id: '1', title: 'System Security Verification', desc: 'All platform records encrypted & audited', time: 'Just now' },
    { id: '2', title: 'Live Registry Synchronized', desc: 'New verified driver ratings updated', time: '10m ago' }
  ]);

  // Group nav items by category, strictly filtering out any unwanted 'PROJECTS' category
  const categories = Array.from(new Set(navItems.map(item => item.category || 'OVERVIEW'))).filter(
    c => c.toUpperCase() !== 'PROJECTS' && c.toUpperCase() !== 'PROJECT'
  );

  // Only render the right-hand widget rail when the caller opted in AND actually
  // gave us something to show in it (status summary and/or contacts/quick links).
  const shouldShowRightPanel = showRightPanel && (Boolean(statusHeadline) || contacts.length > 0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearch) onSearch(val);
  };

  // Team members list
  const teamMembers = [
    { name: 'Sarah Ndlovu', role: 'Compliance Officer', status: 'online' },
    { name: 'Kagiso Molefe', role: 'Vetting Specialist', status: 'online' },
    { name: 'David Naidoo', role: 'Fleet Liaison', status: 'offline' }
  ];

  const handleInspectLiveClick = () => {
    if (onInspectLive) {
      onInspectLive();
    } else if (user.role === 'admin') {
      onSelectNav('verifications');
    } else if (user.role === 'fleet_owner') {
      onSelectNav('search');
    } else {
      onSelectNav('fleet_link');
    }
  };

  const handleAuditLogsClick = () => {
    if (onAuditLogs) {
      onAuditLogs();
    } else if (user.role === 'admin') {
      onSelectNav('audit_logs');
    } else if (user.role === 'fleet_owner') {
      onSelectNav('my_complaints');
    } else {
      onSelectNav('complaints');
    }
  };

  return (
    <div className="w-full bg-[#f4f4f4] text-[#1f1f1f] rounded-3xl border border-stone-200/80 shadow-2xs overflow-hidden flex flex-col min-h-[92vh]">
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3.5 border-b border-stone-200 bg-white sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#1f1f1f] flex items-center justify-center text-white shadow-2xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[#1f1f1f]">FleetCheck</span>
            <span className="text-[10px] block font-medium text-stone-500 uppercase tracking-wider">{roleTitle}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl text-[#1f1f1f] hover:bg-stone-100 relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#1f1f1f] ring-2 ring-white"></span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-[#1f1f1f] hover:bg-stone-100 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Desktop / Tablet Layout Splitter */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:static inset-y-0 left-0 z-40 w-64 xl:w-72 bg-[#ffffff] border-r border-stone-200/80
          p-5 sm:p-6 flex flex-col justify-between transition-transform duration-200 ease-out shrink-0 overflow-y-auto max-h-screen lg:max-h-none
        `}>
          <div className="space-y-6">
            {/* Top Brand Logo */}
            <div className="hidden lg:flex items-center justify-between pb-2">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#1f1f1f] flex items-center justify-center text-white shadow-2xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-lg tracking-tight text-[#1f1f1f]">FleetCheck</span>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block -mt-0.5">
                    {roleTitle}
                  </span>
                </div>
              </div>
              {roleBadgeText && (
                <Tooltip
                  title="Operator Verification Level"
                  content={roleBadgeText.toLowerCase().includes('verified')
                    ? 'Verified Status: Identity & fleet operating proof verified. Full access to unmasked driver dossiers, risk lookups, and reporting.'
                    : 'Verification In Progress: Upload business papers or fleet screenshots to complete validation.'}
                  position="bottom"
                >
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border cursor-help ${roleBadgeColor}`}>
                    {roleBadgeText}
                  </span>
                </Tooltip>
              )}
            </div>

            {/* Main Navigation Items */}
            <nav className="space-y-5">
              {categories.map((category) => {
                const itemsInCategory = navItems.filter(item => (item.category || 'OVERVIEW') === category);
                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 text-[10px] font-bold tracking-wider text-stone-400 uppercase pb-1">
                      {category}
                    </div>
                    <div className="space-y-0.5">
                      {itemsInCategory.map((item) => {
                        const isActive = activeNavId === item.id;
                        return (
                          <Tooltip
                            key={item.id}
                            title={item.tooltipTitle || item.label}
                            content={item.tooltip || `Navigate to ${item.label}`}
                            position="right"
                            className="w-full"
                          >
                            <button
                              onClick={() => {
                                onSelectNav(item.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer group ${
                                isActive
                                  ? 'bg-[#f4f4f4] text-[#1f1f1f]'
                                  : 'text-stone-600 hover:text-[#1f1f1f] hover:bg-stone-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <span className={`${isActive ? 'text-[#1f1f1f]' : 'text-stone-400 group-hover:text-stone-700'}`}>
                                  {item.icon}
                                </span>
                                <span className="truncate">{item.label}</span>
                              </div>

                              {item.badge !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-[#1f1f1f] text-white'
                                    : 'bg-stone-100 text-stone-700'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Members Section */}
            <div className="pt-2 space-y-2 border-t border-stone-100">
              <div className="px-3 flex items-center justify-between text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                <span>Members</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Team Online" />
              </div>
              <div className="space-y-2 px-1">
                {teamMembers.map((m, idx) => (
                  <div key={idx} className="flex items-center space-x-2.5">
                    <div className="relative">
                      <div className="h-7 w-7 rounded-full bg-stone-100 border border-stone-200 text-[#1f1f1f] text-[10px] font-bold flex items-center justify-center">
                        {m.name.charAt(0)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
                        m.status === 'online' ? 'bg-emerald-500' : 'bg-stone-300'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#1f1f1f] truncate leading-tight">{m.name}</p>
                      <p className="text-[10px] text-stone-400 truncate">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Profile & Sign Out Card */}
          <div className="pt-4 border-t border-stone-200/80 space-y-2">
            <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-[#f6f7ed] border border-stone-200/60">
              <div className="h-8 w-8 rounded-full bg-[#1f1f1f] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1f1f1f] truncate">{user.name}</p>
                <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="text-stone-400 hover:text-[#1f1f1f] p-1 cursor-pointer transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-stone-900/30 z-30"
          />
        )}

        {/* MAIN CANVAS AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f4f4f4] overflow-y-auto">
          
          {/* TOP CONTROL BAR */}
          <header className="px-5 sm:px-8 py-3 bg-[#f6f7ed] border-b border-stone-200/80 sticky top-0 z-20 flex items-center justify-between gap-3">
            {/* Minimalist Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 bg-white/90 border border-stone-200/80 rounded-xl text-xs sm:text-sm text-[#1f1f1f] placeholder-stone-400 outline-none focus:bg-white focus:ring-2 focus:ring-stone-300 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    if (onSearch) onSearch('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-3 shrink-0">
              {/* Notification Button */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-xl text-[#1f1f1f] hover:bg-stone-200/50 cursor-pointer relative transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#1f1f1f]"></span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-lg border border-stone-200 p-3.5 z-50 space-y-2">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="font-bold text-xs text-[#1f1f1f]">Notifications</span>
                      <span className="text-[10px] text-stone-500 font-semibold cursor-pointer hover:text-[#1f1f1f]" onClick={() => setUnreadNotifications([])}>Mark read</span>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {unreadNotifications.map(n => (
                        <div key={n.id} className="p-2 bg-stone-50 rounded-xl space-y-0.5">
                          <p className="text-xs font-bold text-[#1f1f1f]">{n.title}</p>
                          <p className="text-[11px] text-stone-500">{n.desc}</p>
                          <p className="text-[9px] text-stone-400">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN DASHBOARD CONTENT AREA */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-full">

            {/* HERO BANNER: page identity + primary/secondary calls to action */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 lg:p-7 border border-stone-200/80 shadow-2xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2 max-w-2xl">
                  {heroTag && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f6f7ed] border border-stone-200/80 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>{heroTag}</span>
                    </span>
                  )}
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#1f1f1f] tracking-tight leading-snug">
                    {heroTitle}
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    {heroSubtitle}
                  </p>
                </div>

                {(heroActionLabel || heroSecondaryActionLabel) && (
                  <div className="flex items-center gap-2.5 shrink-0">
                    {heroSecondaryActionLabel && (
                      <button
                        onClick={onHeroSecondaryAction}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {heroSecondaryActionLabel}
                      </button>
                    )}
                    {heroActionLabel && (
                      <button
                        onClick={onHeroAction}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1f1f1f] text-white hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                      >
                        {heroActionIcon}
                        <span>{heroActionLabel}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TOP METRICS SUMMARY PANEL (#f6f7ed background matching the screenshot) */}
            <div className="bg-[#f6f7ed] rounded-3xl p-5 sm:p-6 lg:p-7 border border-stone-200/80">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                
                {/* 1. Bar Chart: Activity & Inquiries with solid and striped bars */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1f1f1f]">
                    <span>New Inquiries</span>
                    <Tooltip
                      title="Weekly Search & Query Activity"
                      content="Daily volume of driver reference searches, verification checks, and background risk scans performed."
                      position="top"
                    />
                  </div>
                  
                  <div className="flex items-start space-x-2 pt-1">
                    {/* Y-axis labels: 10, 5, 0 */}
                    <div className="flex flex-col justify-between h-20 text-[10px] text-stone-400 font-medium pb-5">
                      <span>10</span>
                      <span>5</span>
                      <span>0</span>
                    </div>

                    {/* Bars Container */}
                    <div className="flex-1 flex items-end justify-between h-20 px-1 gap-2">
                      {chartData.map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${item.value}%` }}
                            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                            className={`w-full rounded-xs transition-colors ${
                              i % 2 === 0 ? 'bg-[#1f1f1f]' : 'bg-striped-pattern border border-stone-300'
                            }`}
                          />
                          <span className="text-[10px] font-medium text-stone-500">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Semicircular Segmented Radial Gauge matching the screenshot */}
                <Tooltip
                  title={`${scoreLabel} (${scorePercentage}%)`}
                  content={
                    scorePercentage >= 100
                      ? 'Fully Verified: Company credentials and proof of fleet ownership are authenticated. You have unrestricted access to driver risk records.'
                      : 'Pending Full Clearance: Complete your profile and submit business papers to reach 100% verification clearance.'
                  }
                  position="top"
                  className="flex flex-col items-center justify-center text-center space-y-1 cursor-help"
                >
                  <div className="relative w-36 h-22 flex items-center justify-center overflow-hidden">
                    {/* Radial arc gauge with dashed ticks */}
                    <svg className="w-32 h-32 transform -rotate-180 translate-y-6" viewBox="0 0 100 100">
                      {/* Background tick arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#d1d5db"
                        strokeWidth="5"
                        strokeDasharray="2, 4"
                        strokeDashoffset="0"
                      />
                      {/* Foreground active tick arc */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="#1f1f1f"
                        strokeWidth="5.5"
                        strokeDasharray="2, 4"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: scorePercentage / 100 * 0.5 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                      <span className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{scorePercentage}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs font-semibold text-[#1f1f1f]">{scoreLabel}</p>
                    <HelpCircle className="h-3 w-3 text-stone-400" />
                  </div>
                  <p className="text-[10px] text-stone-500">Successful verifications</p>
                </Tooltip>

                {/* 3. KPI Stat: Active Audits / Operator Dossiers (Clickable) */}
                <Tooltip
                  title={statChips[0]?.tooltipTitle || statChips[0]?.label || 'Operator Dossiers & Tasks'}
                  content={statChips[0]?.tooltip || 'Operational status and business dossiers registered in the national fleet network.'}
                  position="top"
                  className="w-full"
                >
                  <div 
                    onClick={handleInspectLiveClick}
                    className="w-full flex flex-col justify-between h-full py-1 border-t md:border-t-0 md:border-l border-stone-200/80 pl-0 md:pl-6 space-y-2 group cursor-pointer"
                  >
                    <div>
                      <span className="text-3xl font-extrabold text-[#1f1f1f] tracking-tight">
                        {statChips[0]?.value || '53'}
                      </span>
                      <p className="text-xs font-medium text-stone-600 mt-1 flex items-center gap-1">
                        <span>{statChips[0]?.label || 'Tasks in progress'}</span>
                        <HelpCircle className="h-3 w-3 text-stone-400 opacity-60 group-hover:opacity-100" />
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-bold text-[#1f1f1f] group-hover:translate-x-1 transition-transform">
                      <span>{statChips[0]?.subtext ? 'Inspect' : 'View all'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Tooltip>

                {/* 4. KPI Stat: Incident Queue / Financials (Clickable) */}
                <Tooltip
                  title={statChips[1]?.tooltipTitle || statChips[1]?.label || (user.role === 'admin' ? 'Incident Moderation Queue' : 'POPIA & Regulatory Compliance')}
                  content={statChips[1]?.tooltip || (user.role === 'admin' ? 'Active incident reports and misconduct logs awaiting moderation and verification.' : 'Regulatory compliance and data protection status under South African POPIA standards.')}
                  position="top"
                  className="w-full"
                >
                  <div 
                    onClick={user.role === 'admin' ? () => onSelectNav('complaints') : handleAuditLogsClick}
                    className="w-full flex flex-col justify-between h-full py-1 border-t lg:border-t-0 lg:border-l border-stone-200/80 pl-0 lg:pl-6 space-y-2 group cursor-pointer"
                  >
                    <div>
                      <span className="text-3xl font-extrabold text-[#1f1f1f] tracking-tight">
                        {statChips[1]?.value || '12'}
                      </span>
                      <p className="text-xs font-medium text-stone-600 mt-1 flex items-center gap-1">
                        <span>{statChips[1]?.label || (user.role === 'admin' ? 'Incident Queue' : 'Compliance status')}</span>
                        <HelpCircle className="h-3 w-3 text-stone-400 opacity-60 group-hover:opacity-100" />
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-bold text-[#1f1f1f] group-hover:translate-x-1 transition-transform">
                      <span>{user.role === 'admin' ? 'Moderate queue' : (user.role === 'fleet_owner' ? 'View log' : 'Review')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Tooltip>

              </div>
            </div>

            {/* Quick Stat Chips */}
            {statChips.length > 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {statChips.slice(2).map((chip, idx) => (
                  <Tooltip
                    key={idx}
                    title={chip.tooltipTitle || chip.label}
                    content={chip.tooltip || `${chip.label}: ${chip.subtext || chip.value}`}
                    position="top"
                    className="w-full"
                  >
                    <div className="w-full bg-white rounded-2xl p-4 border border-stone-200/80 flex items-center justify-between shadow-2xs cursor-help hover:border-stone-300 transition-all">
                      <div>
                        <p className="text-lg font-bold text-[#1f1f1f]">{chip.value}</p>
                        <p className="text-xs text-stone-500 font-medium flex items-center gap-1">
                          <span>{chip.label}</span>
                          <HelpCircle className="h-2.5 w-2.5 text-stone-400" />
                        </p>
                      </div>
                      {chip.trend && (
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-[#f6f7ed] text-[#1f1f1f] rounded-full border border-stone-200/60">
                          {chip.trend}
                        </span>
                      )}
                    </div>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* MAIN WORKSPACE + optional right-hand widget rail */}
            <div className={shouldShowRightPanel ? 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-start' : 'w-full'}>
              <div className={shouldShowRightPanel ? 'lg:col-span-2 min-w-0' : 'w-full'}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeNavId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="space-y-6 w-full"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>

              {shouldShowRightPanel && (
                <div className="space-y-6">
                  {/* Status summary card */}
                  {statusHeadline && (
                    <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1f1f1f] text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {statusHeadline.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1f1f1f] truncate">{statusHeadline}</p>
                          {statusSubtext && (
                            <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">{statusSubtext}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contacts / quick links card */}
                  {contacts.length > 0 && (
                    <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs space-y-3">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{contactsTitle}</p>
                      <div className="space-y-2">
                        {contacts.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-white border border-stone-200 text-[#1f1f1f] text-[10px] font-bold flex items-center justify-center shrink-0">
                                {c.avatarInitials || c.title.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-[#1f1f1f] truncate">{c.title}</p>
                                  {c.tag && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-white border border-stone-200 text-[9px] font-bold text-stone-500 uppercase shrink-0">
                                      {c.tag}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-stone-500 truncate">{c.subtitle}</p>
                              </div>
                            </div>
                            {c.actionLabel && (
                              <button
                                onClick={c.onAction}
                                className="text-[10px] font-bold text-[#1f1f1f] hover:underline shrink-0 cursor-pointer"
                              >
                                {c.actionLabel}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
