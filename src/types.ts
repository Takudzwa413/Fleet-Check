export type UserRole = 'public' | 'fleet_owner' | 'admin' | 'driver' | 'accountant';

export interface DriverReference {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  relationship: string;
  is_verified_fleet_owner?: boolean;
  verified_fleet_owner_name?: string;
  verified_fleet_owner_company?: string;
  verified_fleet_owner_id?: string;
  link_request_id?: string;
  link_status?: 'pending' | 'approved' | 'rejected';
}

export interface DriverLinkRequest {
  id: string;
  driver_user_id: string;
  driver_profile_id: string;
  driver_name: string;
  driver_email: string;
  driver_phone: string;
  fleet_owner_user_id: string;
  fleet_owner_name: string;
  fleet_owner_company: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  responded_at?: string | null;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  fleet_owner_id?: string | null;
  fleet_owner_name?: string | null;
  first_name: string;
  surname: string;
  phone: string;
  email: string;
  id_number: string;
  platforms: string[]; // ['Uber', 'Bolt', 'inDrive', 'DiDi']
  uber_rating: number;
  bolt_rating?: number;
  experience_years: number;
  city: string;
  province: string;
  status: 'looking_for_vehicle' | 'employed' | 'not_available';
  bio: string;
  license_type: string;
  references: DriverReference[];
  created_at: string;
  updated_at: string;
}

export interface MaskedMarketplaceDriver {
  id: string;
  user_id: string;
  first_name: string;
  surname_masked: string;
  surname?: string; // only for verified fleet owner
  phone_masked: string;
  phone?: string; // only for verified fleet owner
  email_masked: string;
  email?: string; // only for verified fleet owner
  id_number_masked?: string;
  id_number?: string;
  platforms: string[];
  uber_rating: number;
  bolt_rating?: number;
  experience_years: number;
  city: string;
  province: string;
  status: 'looking_for_vehicle' | 'employed' | 'not_available';
  bio: string;
  license_type: string;
  references: {
    id: string;
    name_masked: string;
    name?: string;
    company_name: string;
    phone_masked: string;
    phone?: string;
    relationship: string;
    is_verified_fleet_owner: boolean;
    verified_fleet_owner_company?: string;
  }[];
  is_locked: boolean; // true for public/unverified, false for verified fleet owners
  risk_summary?: {
    approved_complaints_count: number;
    risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  email_verified_at: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface FleetOwnerProfile {
  id: string;
  user_id: string;
  company_name: string;
  registration_number: string;
  business_address: string;
  fleet_size: number;
  platforms_used: string[];
  verification_status: 'pending' | 'info_required' | 'verified' | 'rejected' | 'suspended' | 'expired';
  verification_expiry: string | null;
  verified_at: string | null;
  rejected_reason: string | null;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface FleetOwnerDocument {
  id: string;
  fleet_owner_id: string;
  document_type: 'company_registration' | 'proof_of_ownership' | 'other';
  file_name: string;
  file_path: string;
  file_data?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface Driver {
  id: string;
  first_name: string;
  surname: string;
  phone_encrypted: string; // Encrypted/masked in storage
  email_encrypted: string; // Encrypted/masked in storage
  id_number_encrypted: string; // Encrypted/masked in storage
  platform: string; // e.g. Uber/Bolt
  city: string;
  province: string;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  driver_id: string;
  fleet_owner_id: string;
  category:
    | 'vehicle_damage'
    | 'vehicle_abandoned'
    | 'unpaid_rental'
    | 'accident'
    | 'reckless_driving'
    | 'poor_communication'
    | 'breach_agreement'
    | 'unauthorized_use'
    | 'fines_unpaid'
    | 'theft_fraud_suspicion'
    | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status:
    | 'draft'
    | 'submitted'
    | 'pending_review'
    | 'more_evidence_required'
    | 'approved'
    | 'rejected'
    | 'disputed'
    | 'resolved'
    | 'withdrawn'
    | 'archived';
  resolution_status:
    | 'unresolved'
    | 'partially_resolved'
    | 'fully_resolved'
    | 'costs_recovered'
    | 'vehicle_returned'
    | 'complaint_withdrawn'
    | 'false_unsubstantiated'
    | 'legal_process_underway';
  vehicle_registration: string;
  vehicle_make_model: string;
  handover_date: string;
  incident_date: string;
  description: string;
  evidence_strength: 'none' | 'weak' | 'moderate' | 'strong' | 'verified';
  admin_notes: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintEvidence {
  id: string;
  complaint_id: string;
  file_type: string;
  file_path: string;
  file_data?: string;
  description: string;
  uploaded_by: string;
  uploaded_by_role?: string;
  uploaded_at: string;
}

export interface DriverDispute {
  id: string;
  complaint_id: string;
  driver_id?: string;
  driver_name: string;
  driver_contact: string;
  dispute_text: string;
  status: 'submitted' | 'under_review' | 'more_info_required' | 'accepted' | 'rejected' | 'complaint_amended' | 'complaint_removed' | 'closed';
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface RiskScore {
  id: string;
  driver_id: string;
  score: number;
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  calculated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name?: string;
  user_role?: UserRole;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string;
  new_value: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface SearchLog {
  id: string;
  user_id: string | null;
  user_name?: string;
  search_query: string;
  search_type: string;
  result_count: number;
  ip_address: string;
  created_at: string;
}

// Client-safe models that mask data based on permission levels
export interface MaskedDriver {
  id: string;
  first_name: string;
  surname: string;
  phone_masked: string;
  email_masked: string;
  id_number_masked?: string; // only for verified/admin if allowed
  platform: string;
  city: string;
  province: string;
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_explanation: string;
  approved_complaints_count: number;
  last_incident_date: string | null;
  is_disputed: boolean;
}

// ==========================================
// VEHICLE ACQUISITION STOKVEL PROJECT MODULE
// ==========================================

export type ProjectStatus =
  | 'draft'
  | 'pending_deposits'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'archived';

export type WeekStartDay =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'
  | 'Project start date day';

export type DepositStatus =
  | 'not_paid'
  | 'partially_paid'
  | 'paid'
  | 'overpaid'
  | 'waived'
  | 'rejected';

export type SlotStatus =
  | 'pending_deposit'
  | 'active'
  | 'paid_ahead'
  | 'in_arrears'
  | 'default_risk'
  | 'dismissal_review'
  | 'benefit_due'
  | 'benefit_received'
  | 'completed'
  | 'withdrawn'
  | 'dismissed';

export type WeeklyObligationStatus =
  | 'upcoming'
  | 'due'
  | 'partially_paid'
  | 'paid'
  | 'paid_ahead'
  | 'overdue'
  | 'penalty_applied'
  | 'default_threshold_reached';

export type PaymentType =
  | 'deposit'
  | 'weekly_contribution'
  | 'penalty'
  | 'insurance_premium'
  | 'vehicle_cost'
  | 'other';

export type POPStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'duplicate'
  | 'needs_clarification'
  | 'reversed';

export type PenaltyType =
  | 'late_weekly_payment'
  | 'late_insurance_premium'
  | 'inspection_failure'
  | 'withdrawal'
  | 'default'
  | 'misconduct'
  | 'manual'
  | 'other';

export type PenaltyStatus =
  | 'pending'
  | 'applied'
  | 'paid'
  | 'partially_paid'
  | 'waived'
  | 'reversed';

export type VehicleBenefitStatus =
  | 'not_due'
  | 'due'
  | 'in_progress'
  | 'vehicle_selected'
  | 'awaiting_inspection'
  | 'awaiting_member_approval'
  | 'awaiting_payment'
  | 'purchased'
  | 'assigned'
  | 'completed'
  | 'cancelled';

export type InsuranceStatus =
  | 'not_required_yet'
  | 'pending_setup'
  | 'active'
  | 'premium_due'
  | 'premium_overdue'
  | 'penalty_applied'
  | 'claim_open'
  | 'cancelled';

export type SecurityIncidentStatus =
  | 'reported'
  | 'under_review'
  | 'resolved'
  | 'penalty_applied'
  | 'dismissal_review'
  | 'closed';

export type DisputeStatus =
  | 'submitted'
  | 'under_review'
  | 'awaiting_response'
  | 'resolved_internally'
  | 'escalated'
  | 'closed';

export interface ProjectSlotTypeConfig {
  id: string;
  project_id: string;
  name: string; // 'Full Slot' | 'Half Slot'
  weekly_contribution: number; // e.g. 3000 or 1500
  deposit_required: number; // e.g. 10000 or 5000
  deposit_non_refundable: boolean; // default true
  payout_amount: number; // e.g. 300000 or 150000
  post_benefit_increase: number; // e.g. 1000 or 700
  default_threshold: number; // e.g. 7000 or 3500
  active: boolean;
}

export interface Project {
  id: string;
  name: string; // e.g. "Action Pack Project"
  description: string;
  duration_months: number; // default 15
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD (calculated)
  deposit_deadline: string; // YYYY-MM-DD
  contribution_cycle: 'weekly';
  week_start_day: WeekStartDay;
  total_weeks: number; // calculated from start to end date
  number_of_members: number;
  number_of_full_slots: number;
  number_of_half_slots: number;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  branch_code: string;
  account_type: string;
  payment_reference_instructions: string;
  status: ProjectStatus;
  notes: string;
  constitution_document_name?: string;
  constitution_document_data?: string;
  payout_order_locked?: boolean;
  payout_order_locked_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Computed runtime fields
  computed_current_week?: number;
  computed_weeks_completed?: number;
  computed_weeks_remaining?: number;
  computed_is_started?: boolean;
  computed_is_completed?: boolean;
  next_meeting_date?: string;
  member_count?: number;
  slot_count?: number;

  // Embedded slot types for easy configuration
  slot_types?: ProjectSlotTypeConfig[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  member_type: 'driver' | 'fleet_owner' | 'other';
  status: 'pending_deposit' | 'active' | 'in_arrears' | 'default_risk' | 'dismissal_review' | 'withdrawn' | 'dismissed' | 'completed';
  constitution_accepted: boolean;
  constitution_accepted_at: string | null;
  constitution_accepted_ip?: string | null;
  signed_constitution_file?: string | null;
  signed_constitution_file_name?: string | null;
  id_document_file?: string | null;
  id_document_file_name?: string | null;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship: string;
  notes?: string;
  member_start_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberSlot {
  id: string;
  project_id: string;
  project_member_id: string;
  user_id: string;
  user_name?: string;
  slot_type_id: string;
  slot_type?: string;
  slot_type_name: string; // 'Full Slot' | 'Half Slot'
  slot_number: number;
  payout_position: number;
  payout_order_locked: boolean;
  weekly_contribution: number;
  deposit_required: number;
  deposit_paid: number;
  deposit_status: DepositStatus;
  payout_amount: number;
  post_benefit_increase: number;
  default_threshold: number;
  benefit_received: boolean;
  benefit_received_date: string | null;
  grace_period_end_date: string | null;
  current_weekly_contribution: number; // increases after benefit grace period
  status: SlotStatus;
  total_paid: number;
  total_expected_to_date: number;
  outstanding_amount: number;
  advance_credit: number;
  paid_ahead_weeks: number;
  penalties_total: number;
  penalties_unpaid: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectContributionSchedule {
  id: string;
  project_id: string;
  slot_id: string;
  user_id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  due_date: string;
  expected_amount: number;
  amount_paid: number;
  outstanding_amount: number;
  advance_credit_applied: number;
  status: WeeklyObligationStatus;
  penalty_applied: boolean;
  penalty_id?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPayment {
  id: string;
  project_id: string;
  project_member_id?: string;
  slot_id?: string;
  slot_type_name?: string;
  week_number?: number;
  user_id: string;
  user_name?: string;
  payment_type: PaymentType;
  amount: number;
  payment_date: string;
  bank_reference: string;
  bank_statement_reference?: string;
  bank_statement_ref?: string;
  file_name?: string;
  file_data?: string;
  file_type?: string;
  notes?: string;
  member_notes?: string;
  internal_notes?: string;
  reconciliation_notes?: string;
  status: POPStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  allocation_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPaymentAllocation {
  id: string;
  payment_id: string;
  project_id: string;
  slot_id: string;
  allocation_type: 'penalty' | 'deposit' | 'weekly_obligation' | 'advance_credit' | 'insurance' | 'other';
  target_id?: string; // obligation id or penalty id
  week_number?: number;
  amount_allocated: number;
  created_at: string;
}

export interface ProjectGroupSummary {
  id: string;
  project_id: string;
  total_project_target: number;
  total_expected_to_date: number;
  total_collected: number;
  total_outstanding: number;
  total_deposits_collected: number;
  total_penalties_collected: number;
  number_of_members: number;
  number_of_slots: number;
  full_slots_count: number;
  half_slots_count: number;
  members_up_to_date_count: number;
  members_in_arrears_count: number;
  members_paid_ahead_count: number;
  next_payout_position: number;
  project_completion_percentage: number;
  notes_to_members: string;
  published: boolean;
  published_by?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPenalty {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  slot_id?: string;
  penalty_type: PenaltyType;
  penalty_amount: number;
  amount?: number;
  penalty_percentage?: number;
  reason: string;
  linked_week_number?: number;
  applied_by: string;
  applied_date: string;
  due_date: string;
  status: PenaltyStatus;
  waived_by?: string | null;
  waiver_reason?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectVehicleBenefit {
  id: string;
  project_id: string;
  slot_id: string;
  user_id: string;
  user_name?: string;
  payout_position: number;
  payout_amount: number;
  benefit_due_date: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vin: string;
  vin_number?: string;
  registration_number: string;
  purchase_price: number;
  seller_dealer_name: string;
  inspection_report_file?: string | null;
  roadworthy_file?: string | null;
  proof_of_purchase_file?: string | null;
  tracker_installed: boolean;
  tracker_provider?: string;
  tracker_reference?: string;
  insurance_confirmed: boolean;
  member_approved_costs: boolean;
  member_present_during_purchase: boolean;
  admin_notes: string;
  status: VehicleBenefitStatus;
  benefit_received_date?: string | null;
  grace_period_end_date?: string | null;
  created_at: string;
  updated_at: string;
}
export type ProjectBenefitDelivery = ProjectVehicleBenefit;

export interface ProjectInsuranceRecord {
  id: string;
  project_id: string;
  vehicle_benefit_id?: string;
  slot_id?: string;
  user_id: string;
  user_name?: string;
  vehicle_reg: string;
  policy_provider: string;
  insurance_provider?: string;
  policy_number: string;
  monthly_premium: number;
  premium_due_day: number; // default 15
  premium_amount: number;
  payment_status: InsuranceStatus;
  status?: string;
  proof_of_payment_file?: string | null;
  late_penalty_applied: boolean;
  claim_status: 'none' | 'claim_open' | 'claim_resolved' | 'claim_rejected';
  tracker_provider?: string;
  tracker_device_ref?: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSecurityIncident {
  id: string;
  project_id: string;
  vehicle_benefit_id?: string;
  user_id: string;
  user_name?: string;
  vehicle_reg: string;
  incident_type:
    | 'vehicle_not_presented'
    | 'vehicle_left_wc'
    | 'suspected_misuse'
    | 'attempted_fraud'
    | 'accident'
    | 'tracking_issue'
    | 'other';
  description: string;
  evidence_file?: string | null;
  reported_by: string;
  status: SecurityIncidentStatus;
  penalty_applied: boolean;
  penalty_amount?: number;
  outcome?: string;
  last_inspection_date?: string | null;
  next_inspection_due_date?: string | null;
  tracker_provider?: string;
  tracker_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMeeting {
  id: string;
  project_id: string;
  title: string;
  meeting_date: string;
  location_or_link: string;
  google_meet_url?: string;
  agenda: string;
  minutes?: string;
  minutes_notes?: string;
  status?: 'upcoming' | 'completed' | 'scheduled' | 'cancelled';
  attachment_file?: string | null;
  created_by: string;
  attendance_required: boolean;
  created_at: string;
  updated_at: string;
  attendees?: {
    user_id: string;
    user_name: string;
    status: 'present' | 'absent' | 'excused';
    reason?: string;
  }[];
}
export type ProjectAssemblyMeeting = ProjectMeeting;

export interface ProjectDocument {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  document_type:
    | 'signed_constitution'
    | 'id_passport'
    | 'driver_licence'
    | 'proof_of_address'
    | 'proof_of_deposit'
    | 'bank_confirmation'
    | 'next_of_kin_form'
    | 'vehicle_documents'
    | 'insurance_documents'
    | 'other';
  file_name: string;
  file_data: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  notes?: string;
}

export interface ProjectDispute {
  id: string;
  project_id: string;
  reported_by_user_id: string;
  reported_by_name: string;
  against_type: 'member' | 'project' | 'admin' | 'accountant';
  against_user_id?: string;
  against_name?: string;
  dispute_type: string;
  description: string;
  evidence_file?: string | null;
  assigned_to: string;
  status: DisputeStatus;
  outcome?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectExitRecord {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  slot_id: string;
  exit_type: 'voluntary_withdrawal' | 'dismissal' | 'death' | 'incapacity' | 'project_completion';
  benefit_received: boolean;
  total_contributions: number;
  deposit_amount: number;
  penalty_amount: number;
  refund_amount: number;
  vehicle_transfer_required: boolean;
  next_of_kin_details: string;
  admin_approval: 'pending' | 'approved' | 'rejected';
  settlement_notes: string;
  created_at: string;
}

export interface ProjectNotification {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'payment';
  read: boolean;
  created_at: string;
}

export interface ProjectAuditLog {
  id: string;
  user_id: string | null;
  user_name?: string;
  user_role?: UserRole;
  project_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string;
  new_value: string;
  ip_address: string;
  reason?: string;
  notes?: string;
  details?: string;
  created_at: string;
}

