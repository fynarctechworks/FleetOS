-- FleetOS Database Schema — Migration 001
-- Run this in Supabase SQL Editor
-- All tables follow TRD Section 4 exactly.
-- Run in this order — foreign keys depend on prior tables.

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── COMPANIES ───
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  gst_number TEXT,
  pan_number TEXT,
  address_line1 TEXT,
  address_city TEXT,
  address_state TEXT,
  address_pincode TEXT,
  whatsapp_phone TEXT NOT NULL,
  ca_email TEXT,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  plan_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_owner_access" ON companies
  USING (id = (auth.jwt()->>'company_id')::uuid);

-- ─── BRANCHES ───
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  lr_prefix TEXT NOT NULL,
  lr_current_sequence INTEGER NOT NULL DEFAULT 1,
  manager_user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_company_access" ON branches
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── USERS ───
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','accountant','driver')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_company_access" ON users
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── DRIVERS ───
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  aadhaar_last4 TEXT,
  licence_number TEXT,
  licence_expiry DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  bank_account_number TEXT, -- encrypted at application layer
  bank_ifsc TEXT,
  fixed_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  performance_score INTEGER NOT NULL DEFAULT 0 CHECK (performance_score BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers_company_access" ON drivers
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── VEHICLES ───
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  registration_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('truck','tempo','trailer','tanker')),
  capacity_kg INTEGER,
  fuel_type TEXT NOT NULL DEFAULT 'diesel' CHECK (fuel_type IN ('diesel','petrol','cng')),
  baseline_mileage_kmpl NUMERIC(5,2) NOT NULL DEFAULT 4.0,
  current_odometer_km INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  assigned_driver_id UUID REFERENCES drivers(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, registration_number)
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_company_access" ON vehicles
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── ADDRESS BOOK ───
CREATE TABLE address_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consignor','consignee','both')),
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  gst_number TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE address_book ENABLE ROW LEVEL SECURITY;
CREATE POLICY "address_book_company_access" ON address_book
  USING (company_id = (auth.jwt()->>'company_id')::uuid);
-- Full text search index
CREATE INDEX idx_address_book_search ON address_book USING gin (name gin_trgm_ops);

-- ─── LR ENTRIES ───
CREATE TABLE lr_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  lr_number TEXT NOT NULL,
  load_type TEXT NOT NULL CHECK (load_type IN ('ftl','ltl','parchutan')),
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','in_transit','delivered','pod_uploaded','billed','payment_received')),
  consignor_id UUID NOT NULL REFERENCES address_book(id),
  consignee_id UUID NOT NULL REFERENCES address_book(id),
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  goods_description TEXT,
  weight_kg NUMERIC(10,2),
  freight_amount NUMERIC(10,2) NOT NULL,
  gst_rate NUMERIC(4,2) NOT NULL DEFAULT 5,
  gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ewb_number TEXT,
  ewb_expiry TIMESTAMPTZ,
  trip_id UUID,
  pod_photo_url TEXT,
  pod_uploaded_at TIMESTAMPTZ,
  tracking_token TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 12),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, lr_number)
);
ALTER TABLE lr_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lr_entries_company_access" ON lr_entries
  USING (company_id = (auth.jwt()->>'company_id')::uuid);
-- Allow public read by tracking token (no auth)
CREATE POLICY "lr_entries_public_tracking" ON lr_entries
  FOR SELECT USING (tracking_token IS NOT NULL);

-- ─── TRIPS ───
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  trip_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','departed','in_transit','arrived','completed','cancelled')),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  stopovers JSONB NOT NULL DEFAULT '[]',
  planned_departure TIMESTAMPTZ NOT NULL,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  odometer_start INTEGER NOT NULL DEFAULT 0,
  odometer_end INTEGER,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_diesel_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_toll_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_driver_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_loading_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_misc_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_loss_flagged BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, trip_number)
);
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_company_access" ON trips
  USING (company_id = (auth.jwt()->>'company_id')::uuid);
-- Add FK back to trips from lr_entries
ALTER TABLE lr_entries ADD CONSTRAINT lr_entries_trip_fk FOREIGN KEY (trip_id) REFERENCES trips(id);

-- ─── DIESEL ENTRIES ───
CREATE TABLE diesel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  trip_id UUID NOT NULL REFERENCES trips(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  litres NUMERIC(8,2) NOT NULL,
  price_per_litre NUMERIC(6,2) NOT NULL,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (litres * price_per_litre) STORED,
  station_name TEXT,
  odometer_at_fill INTEGER NOT NULL,
  receipt_photo_url TEXT,
  filled_at TIMESTAMPTZ NOT NULL,
  entered_by UUID NOT NULL REFERENCES users(id),
  is_theft_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE diesel_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diesel_entries_company_access" ON diesel_entries
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── COMPLIANCE DOCUMENTS ───
CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vehicle','driver')),
  entity_id UUID NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('insurance','puc','fitness','national_permit','state_permit','driver_licence')),
  doc_number TEXT,
  issued_date DATE,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring_soon','expired')),
  renewal_status TEXT NOT NULL DEFAULT 'none' CHECK (renewal_status IN ('none','in_progress','renewed')),
  document_url TEXT,
  alert_sent_30 BOOLEAN NOT NULL DEFAULT false,
  alert_sent_15 BOOLEAN NOT NULL DEFAULT false,
  alert_sent_7 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance_documents_company_access" ON compliance_documents
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── MAINTENANCE RECORDS ───
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('oil_change','brake','clutch','battery','tyre','electrical','body','other')),
  description TEXT,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  odometer_at_service INTEGER NOT NULL,
  next_service_km INTEGER,
  next_service_date DATE,
  workshop_name TEXT,
  workshop_phone TEXT,
  photos JSONB NOT NULL DEFAULT '[]',
  serviced_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_records_company_access" ON maintenance_records
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── TYRE RECORDS ───
CREATE TABLE tyre_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  brand TEXT,
  serial_number TEXT,
  position TEXT NOT NULL CHECK (position IN ('fl','fr','rl','rr','spare')),
  fitment_date DATE NOT NULL,
  odometer_at_fitment INTEGER NOT NULL,
  expected_life_km INTEGER NOT NULL DEFAULT 80000,
  current_km INTEGER NOT NULL DEFAULT 0,
  is_retreaded BOOLEAN NOT NULL DEFAULT false,
  purchase_cost NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','replaced','retreaded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tyre_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tyre_records_company_access" ON tyre_records
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── VENDORS ───
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  phone TEXT,
  vehicle_number TEXT,
  vehicle_type TEXT,
  route_specialisation TEXT,
  rate_per_km NUMERIC(8,2),
  rate_per_trip NUMERIC(10,2),
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_company_access" ON vendors
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── DRIVER SALARY ENTRIES ───
CREATE TABLE driver_salary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  month TEXT NOT NULL, -- YYYY-MM
  fixed_pay NUMERIC(10,2) NOT NULL,
  trip_allowances NUMERIC(10,2) NOT NULL DEFAULT 0,
  advances_deducted NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(10,2) GENERATED ALWAYS AS (fixed_pay + trip_allowances - advances_deducted - other_deductions) STORED,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  paid_at TIMESTAMPTZ,
  slip_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, driver_id, month)
);
ALTER TABLE driver_salary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_salary_entries_company_access" ON driver_salary_entries
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── VEHICLE LOCATIONS (GPS) ───
CREATE TABLE vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  trip_id UUID REFERENCES trips(id),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  speed_kmph NUMERIC(6,2),
  accuracy_meters INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_locations_company_access" ON vehicle_locations
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- ─── INDEXES (Performance) ───
CREATE INDEX idx_lr_entries_company_created ON lr_entries (company_id, created_at DESC);
CREATE INDEX idx_lr_entries_status ON lr_entries (company_id, status);
CREATE INDEX idx_lr_entries_trip ON lr_entries (trip_id);
CREATE INDEX idx_trips_company_status ON trips (company_id, status);
CREATE INDEX idx_trips_vehicle ON trips (vehicle_id);
CREATE INDEX idx_trips_driver ON trips (driver_id);
CREATE INDEX idx_diesel_entries_trip ON diesel_entries (trip_id);
CREATE INDEX idx_diesel_entries_vehicle ON diesel_entries (vehicle_id);
CREATE INDEX idx_vehicle_locations_vehicle ON vehicle_locations (vehicle_id, recorded_at DESC);
CREATE INDEX idx_vehicle_locations_trip ON vehicle_locations (trip_id);
CREATE INDEX idx_compliance_expiry ON compliance_documents (company_id, expiry_date);
CREATE INDEX idx_maintenance_vehicle ON maintenance_records (vehicle_id, serviced_at DESC);
CREATE INDEX idx_tyre_vehicle ON tyre_records (vehicle_id);
CREATE INDEX idx_drivers_company ON drivers (company_id);
CREATE INDEX idx_vehicles_company ON vehicles (company_id);

-- ─── pg_cron SCHEDULED JOBS ───
-- Daily compliance alerts: 8:30 AM IST = 3:00 AM UTC
SELECT cron.schedule(
  'daily-compliance-alerts',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/daily-compliance-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  )$$
);

-- Monthly P&L summary: 1st of month at 8:30 AM IST = 3:00 AM UTC
SELECT cron.schedule(
  'monthly-pl-summary',
  '0 3 1 * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/monthly-pl-summary',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  )$$
);

-- 90-day GPS data retention: nightly at 2:00 AM UTC
SELECT cron.schedule(
  'purge-old-locations',
  '0 2 * * *',
  $$DELETE FROM vehicle_locations WHERE recorded_at < now() - INTERVAL '90 days'$$
);

-- Update compliance status daily
SELECT cron.schedule(
  'update-compliance-status',
  '30 3 * * *',
  $$UPDATE compliance_documents SET
    status = CASE
      WHEN expiry_date < CURRENT_DATE THEN 'expired'
      WHEN expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
      ELSE 'valid'
    END,
    updated_at = now()$$
);
