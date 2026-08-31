export type UserRole = 'public' | 'fleet_owner' | 'admin' | 'driver';

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

export interface UserSecuritySettings {
  two_factor_enabled: boolean;
  email_alerts_critical: boolean;
  login_alerts: boolean;
  session_timeout_mins: number;
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
  security_settings?: UserSecuritySettings | null;
  popi_consent_accepted?: boolean;
  popi_consent_at?: string | null;
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
  document_type: 'company_registration' | 'proof_of_ownership' | 'passport' | 'other';
  file_name: string;
  file_path: string;
  file_data?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface DriverDocument {
  id: string;
  driver_profile_id: string;
  driver_id?: string | null;
  uploaded_by: string;
  uploaded_by_role: UserRole;
  document_type: 'license' | 'prdp' | 'id_doc' | 'passport' | 'platform_profile' | 'safety_clearance' | 'proof_of_address' | 'other';
  file_name: string;
  file_data?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejected_reason: string | null;
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

export interface DriverReview {
  id: string;
  driver_id: string;
  fleet_owner_id: string;
  fleet_owner_name: string;
  fleet_owner_company: string;
  overall_rating: number; // 1 to 5
  driving_behavior?: number; // 1 to 5
  vehicle_care?: number; // 1 to 5
  punctuality_payment?: number; // 1 to 5
  review_text: string;
  verified_fleet_owner: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverReviewSummary {
  average_overall: number;
  total_reviews: number;
  average_driving_behavior: number;
  average_vehicle_care: number;
  average_punctuality_payment: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface IncidentChatMessage {
  id: string;
  complaint_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'admin' | 'fleet_owner' | 'driver';
  message: string;
  attachment_url?: string;
  attachment_name?: string;
  read_by: string[];
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'dispute_update' | 'complaint_update' | 'verification_update' | 'driver_review' | 'system' | 'chat_message';
  related_id?: string;
  read: boolean;
  admin_notes?: string;
  created_at: string;
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
  platform?: string;
  city?: string;
  province?: string;
}

export interface TrendingQuery {
  query: string;
  count: number;
  percentage: number;
  trend: string;
  trendType: 'up' | 'stable' | 'hot';
  category: string;
  platform?: string;
  flaggedCount?: number;
}

export interface SearchAnalyticsSummary {
  totalSearches30d: number;
  highestDailySearches: number;
  averageDailySearches: number;
  activeDays: number;
  trendPercentage: string;
  riskDetectionRate: string;
  uniqueQueriesCount: number;
}

export interface SearchAnalyticsResponse {
  analytics: Array<{
    date: string;
    displayDate: string;
    searches: number;
    flaggedDrivers: number;
  }>;
  summary: SearchAnalyticsSummary;
  trendingQueries: TrendingQuery[];
  trendingCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  platformBreakdown: Array<{
    platform: string;
    searches: number;
    percentage: number;
  }>;
  recentSearches: Array<{
    id: string;
    query: string;
    search_type: string;
    result_count: number;
    created_at: string;
    timeAgo: string;
  }>;
}

export interface VehiclePhoto {
  file_name: string;
  file_type: string;
  file_data: string;
}

export interface VehicleListing {
  id: string;
  fleet_owner_id: string;
  fleet_owner_company: string;
  car_type: string; // e.g. "Toyota Corolla Quest"
  category: 'Comfort' | 'Go' | 'X';
  platforms: string[]; // ['Uber', 'Bolt', 'inDrive', 'DiDi']
  weekly_target: number;
  deposit: number;
  description: string;
  photos: VehiclePhoto[];
  status: 'available' | 'reserved' | 'unavailable';
  review_status: 'pending' | 'approved' | 'rejected';
  rejected_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaskedVehicleListing {
  id: string;
  car_type: string;
  category: 'Comfort' | 'Go' | 'X';
  platforms: string[];
  weekly_target: number;
  deposit: number;
  description: string;
  photos: VehiclePhoto[];
  status: 'available' | 'reserved' | 'unavailable';
  review_status: 'pending' | 'approved' | 'rejected';
  owner_company: string;
  owner_name_masked: string;
  owner_name?: string;
  owner_phone_masked: string;
  owner_phone?: string;
  is_locked: boolean;
  created_at: string;
}

// Client-safe models that mask data based on permission levels
export interface MaskedDriver {
  id: string;
  first_name: string;
  surname: string;
  phone_masked: string;
  email_masked: string;
  id_number_masked?: string;
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
