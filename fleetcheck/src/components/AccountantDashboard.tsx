import React, { useState } from 'react';
import {
  DollarSign, TrendingUp, ShieldCheck, FileCheck, CheckCircle2,
  AlertCircle, RefreshCw, Car, Calendar, Users, Lock, LogOut,
  Building, Award, ShieldAlert, FileText, ArrowRight
} from 'lucide-react';
import { User } from '../types';
import DashboardLayout, { NavItem, StatChip } from './layout/DashboardLayout';
import StokvelDashboard from './stokvel/StokvelDashboard';

interface AccountantDashboardProps {
  user: User;
  token: string;
  onLogout?: () => void;
}

export default function AccountantDashboard({
  user,
  token,
  onLogout
}: AccountantDashboardProps) {
  const [activeNav, setActiveNav] = useState<string>('stokvel_overview');

  const navItems: NavItem[] = [
    {
      id: 'stokvel_overview',
      label: 'Vehicle Stokvel Module',
      icon: <Car className="h-4 w-4 text-amber-500" />,
      category: 'Financial Operations',
      tooltipTitle: 'Vehicle Stokvel Overview',
      tooltip: 'Executive summary of total pooled treasury, active vehicle cycles, and project performance.'
    },
    {
      id: 'pop_verification',
      label: 'Proof of Payment Hub',
      icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
      category: 'Financial Operations',
      tooltipTitle: 'Proof of Payment Hub',
      tooltip: 'Reconcile submitted member payment receipts and bank reference numbers against statements.'
    },
    {
      id: 'weekly_schedules',
      label: 'Weekly Obligations (15 Mo)',
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
      category: 'Financial Operations',
      tooltipTitle: 'Weekly Contribution Schedules',
      tooltip: '15-month timeline tracking weekly obligations, paid instalments, and upcoming member dues.'
    },
    {
      id: 'group_transparency',
      label: 'Group Summary & Reports',
      icon: <TrendingUp className="h-4 w-4 text-purple-500" />,
      category: 'Financial Operations',
      tooltipTitle: 'Financial Transparency Reports',
      tooltip: 'Export and review pooled financial balances, vehicle acquisition disbursements, and audit sheets.'
    },
    {
      id: 'penalties_desk',
      label: 'Penalties & Compliance',
      icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
      category: 'Governance',
      tooltipTitle: 'Penalties & Default Governance',
      tooltip: 'Enforce constitution penalty rules for delayed payments and manage cure period notices.'
    },
    {
      id: 'meetings_constitution',
      label: 'Assembly & Constitution',
      icon: <FileText className="h-4 w-4 text-stone-500" />,
      category: 'Governance',
      tooltipTitle: 'Stokvel Constitution & Minutes',
      tooltip: 'Official group constitution rules, governance voting records, and assembly minutes.'
    }
  ];

  const statChips: StatChip[] = [
    {
      label: 'Stokvel Bank',
      value: 'Standard Bank SA',
      subtext: 'Acc: 1029384756',
      icon: <Building className="h-4 w-4" />,
      iconBgColor: 'bg-blue-50',
      iconTextColor: 'text-blue-700',
      tooltipTitle: 'Stokvel Treasury Account',
      tooltip: 'Dedicated commercial holding account with Standard Bank South Africa.'
    },
    {
      label: 'Cycle Duration',
      value: '15 Months',
      subtext: 'Action Pack Project',
      icon: <Calendar className="h-4 w-4" />,
      iconBgColor: 'bg-amber-50',
      iconTextColor: 'text-amber-700',
      tooltipTitle: 'Acquisition Cycle',
      tooltip: '15-month structured capital rotation cycle for member vehicle ownership.'
    },
    {
      label: 'Allocation Rule',
      value: '5-Tier Priority',
      subtext: 'Auto Reconciled',
      icon: <ShieldCheck className="h-4 w-4" />,
      iconBgColor: 'bg-emerald-50',
      iconTextColor: 'text-emerald-700',
      tooltipTitle: 'Automated 5-Tier Allocation',
      tooltip: 'Reconciliation algorithm prioritizing arrears, current dues, penalties, reserve fund, and surplus.'
    },
    {
      label: 'Accounting Standard',
      value: 'SA GAAP / IFRS',
      subtext: 'Standard Bank Audited',
      icon: <FileCheck className="h-4 w-4" />,
      iconBgColor: 'bg-purple-50',
      iconTextColor: 'text-purple-700',
      tooltipTitle: 'Regulatory Compliance',
      tooltip: 'Compliant with South African Generally Accepted Accounting Practice standards.'
    }
  ];

  // Map activeNav to Stokvel tab
  const getStokvelInitialTab = () => {
    switch (activeNav) {
      case 'pop_verification': return 'pop-hub';
      case 'weekly_schedules': return 'schedules';
      case 'group_transparency': return 'group-summary';
      case 'penalties_desk': return 'penalties';
      case 'meetings_constitution': return 'meetings';
      default: return 'overview';
    }
  };

  return (
    <DashboardLayout
      user={user}
      roleTitle="Senior Project Accountant"
      roleBadgeText="Finance Controller"
      roleBadgeColor="bg-amber-100 text-amber-900 border-amber-300"
      onLogout={onLogout || (() => {})}
      navItems={navItems}
      activeNavId={activeNav}
      onSelectNav={setActiveNav}
      heroTag="Finance Committee & Treasury Desk"
      heroTitle="Vehicle Acquisition Stokvel Management"
      heroSubtitle="Review Proof of Payments (POPs) against Standard Bank statements, manage member contribution schedules, publish financial summaries, and track acquisition handovers."
      statChips={statChips}
      showRightPanel={false}
    >
      <div className="space-y-6">
        <StokvelDashboard
          key={activeNav}
          user={user}
          token={token}
          projectId="proj_action_pack_01"
          initialTab={getStokvelInitialTab()}
        />
      </div>
    </DashboardLayout>
  );
}
