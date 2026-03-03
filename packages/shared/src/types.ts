// FleetOS — Shared TypeScript Types
// Generated from TRD Section 4 — Database Schema
// These exact field names match the Supabase tables.
// DO NOT rename, camelCase, or abbreviate these fields.

export type UserRole = 'owner' | 'manager' | 'accountant' | 'driver';
export type LoadType = 'ftl' | 'ltl' | 'parchutan';
export type TripStatus = 'planned' | 'departed' | 'in_transit' | 'arrived' | 'completed' | 'cancelled';
export type LRStatus = 'booked' | 'in_transit' | 'delivered' | 'pod_uploaded' | 'billed' | 'payment_received';
export type VehicleType = 'truck' | 'tempo' | 'trailer' | 'tanker';
export type DocType = 'insurance' | 'puc' | 'fitness' | 'national_permit' | 'state_permit' | 'driver_licence';
export type ComplianceStatus = 'valid' | 'expiring_soon' | 'expired';
export type ServiceType = 'oil_change' | 'brake' | 'clutch' | 'battery' | 'tyre' | 'electrical' | 'body' | 'other';
export type TyrePosition = 'fl' | 'fr' | 'rl' | 'rr' | 'spare';
export type AddressType = 'consignor' | 'consignee' | 'both';
export type SalaryStatus = 'draft' | 'approved' | 'paid';
export type PlanType = 'starter' | 'professional' | 'enterprise';
export type Language = 'en' | 'hi' | 'te';

export interface Company {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  gst_number: string | null;
  pan_number: string | null;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_pincode: string | null;
  whatsapp_phone: string;
  ca_email: string | null;
  plan: PlanType;
  plan_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  city: string | null;
  lr_prefix: string;
  lr_current_sequence: number;
  manager_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vehicle_type: VehicleType;
  capacity_kg: number | null;
  fuel_type: 'diesel' | 'petrol' | 'cng';
  baseline_mileage_kmpl: number;
  current_odometer_km: number;
  health_score: number;
  assigned_driver_id: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_seen: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  company_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  aadhaar_last4: string | null;
  licence_number: string | null;
  licence_expiry: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_account_number: string | null; // encrypted
  bank_ifsc: string | null;
  fixed_salary: number;
  performance_score: number;
  is_active: boolean;
  created_at: string;
}

export interface AddressBook {
  id: string;
  company_id: string;
  name: string;
  type: AddressType;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  gst_number: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  created_at: string;
}

export interface LREntry {
  id: string;
  company_id: string;
  branch_id: string;
  lr_number: string;
  load_type: LoadType;
  status: LRStatus;
  consignor_id: string;
  consignee_id: string;
  origin_city: string;
  destination_city: string;
  goods_description: string | null;
  weight_kg: number | null;
  freight_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  ewb_number: string | null;
  ewb_expiry: string | null;
  trip_id: string | null;
  pod_photo_url: string | null;
  pod_uploaded_at: string | null;
  tracking_token: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  company_id: string;
  branch_id: string;
  trip_number: string;
  status: TripStatus;
  vehicle_id: string;
  driver_id: string;
  origin_city: string;
  destination_city: string;
  stopovers: Array<{ city: string; expected_arrival: string }>;
  planned_departure: string;
  actual_departure: string | null;
  actual_arrival: string | null;
  completed_at: string | null;
  odometer_start: number;
  odometer_end: number | null;
  total_revenue: number;
  total_diesel_cost: number;
  total_toll_cost: number;
  total_driver_allowance: number;
  total_loading_cost: number;
  total_misc_cost: number;
  net_profit: number;
  is_loss_flagged: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DieselEntry {
  id: string;
  company_id: string;
  trip_id: string;
  vehicle_id: string;
  driver_id: string;
  litres: number;
  price_per_litre: number;
  total_cost: number;
  station_name: string | null;
  odometer_at_fill: number;
  receipt_photo_url: string | null;
  filled_at: string;
  entered_by: string;
  is_theft_flagged: boolean;
  created_at: string;
}

export interface ComplianceDocument {
  id: string;
  company_id: string;
  entity_type: 'vehicle' | 'driver';
  entity_id: string;
  doc_type: DocType;
  doc_number: string | null;
  issued_date: string | null;
  expiry_date: string;
  status: ComplianceStatus;
  renewal_status: 'none' | 'in_progress' | 'renewed';
  document_url: string | null;
  alert_sent_30: boolean;
  alert_sent_15: boolean;
  alert_sent_7: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  company_id: string;
  vehicle_id: string;
  service_type: ServiceType;
  description: string | null;
  cost: number;
  odometer_at_service: number;
  next_service_km: number | null;
  next_service_date: string | null;
  workshop_name: string | null;
  workshop_phone: string | null;
  photos: string[];
  serviced_at: string;
  created_by: string;
  created_at: string;
}

export interface TyreRecord {
  id: string;
  company_id: string;
  vehicle_id: string;
  brand: string | null;
  serial_number: string | null;
  position: TyrePosition;
  fitment_date: string;
  odometer_at_fitment: number;
  expected_life_km: number;
  current_km: number;
  is_retreaded: boolean;
  purchase_cost: number | null;
  status: 'active' | 'replaced' | 'retreaded';
  created_at: string;
}

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  route_specialisation: string | null;
  rate_per_km: number | null;
  rate_per_trip: number | null;
  balance_due: number;
  is_active: boolean;
  created_at: string;
}

export interface DriverSalaryEntry {
  id: string;
  company_id: string;
  driver_id: string;
  month: string; // YYYY-MM
  fixed_pay: number;
  trip_allowances: number;
  advances_deducted: number;
  other_deductions: number;
  net_salary: number;
  status: SalaryStatus;
  paid_at: string | null;
  slip_pdf_url: string | null;
  created_at: string;
}

export interface VehicleLocation {
  id: string;
  company_id: string;
  vehicle_id: string;
  driver_id: string;
  trip_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmph: number | null;
  accuracy_meters: number;
  recorded_at: string;
  is_online: boolean;
}

// ─── UI / App types ───

export interface KPICard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'flat';
  color?: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface WhatsAppTemplate {
  name: string;
  params: string[];
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
}
