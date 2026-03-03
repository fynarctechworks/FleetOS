-- FleetOS — Development Seed Data
-- Run AFTER 001_initial_schema.sql
-- DO NOT run in production

-- Test Company
INSERT INTO companies (id, name, owner_name, phone, whatsapp_phone, gst_number, address_city, address_state, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vizag Transport Co.',
  'Ravi Kumar',
  '+919876543210',
  '+919876543210',
  '37AABCU9603R1ZX',
  'Visakhapatnam',
  'Andhra Pradesh',
  'professional'
);

-- Test Branch
INSERT INTO branches (id, company_id, name, city, lr_prefix, lr_current_sequence)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Vizag Main',
  'Visakhapatnam',
  'VZG',
  1
);

-- Test Vehicles
INSERT INTO vehicles (id, company_id, registration_number, make, model, vehicle_type, fuel_type, baseline_mileage_kmpl, current_odometer_km)
VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'AP39AB1234', 'Tata', 'LPT 2518', 'truck', 'diesel', 4.2, 125000),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'AP39CD5678', 'Ashok Leyland', 'Ecomet 1615', 'truck', 'diesel', 3.8, 89000);

-- Test Drivers
INSERT INTO drivers (id, company_id, name, phone, licence_number, licence_expiry, fixed_salary)
VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Suresh Rao', '+919988776655', 'AP0520190012345', '2027-06-30', 18000),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Mohan Reddy', '+919977665544', 'AP0520180054321', '2026-11-15', 16000);

-- Test Address Book
INSERT INTO address_book (id, company_id, name, type, phone, city, state, gst_number)
VALUES
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'Hyderabad Steel Works', 'consignor', '+914022334455', 'Hyderabad', 'Telangana', '36AABCH1234Z1Z5'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'Chennai Auto Parts Ltd', 'consignee', '+914422334455', 'Chennai', 'Tamil Nadu', '33AABCC5678Z1Z9'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', 'Bangalore Textiles', 'both', '+918022334455', 'Bangalore', 'Karnataka', '29AABCB9012Z1Z3');

-- Test Compliance Documents
INSERT INTO compliance_documents (company_id, entity_type, entity_id, doc_type, expiry_date, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'vehicle', '00000000-0000-0000-0000-000000000020', 'insurance', CURRENT_DATE + 45, 'valid'),
  ('00000000-0000-0000-0000-000000000001', 'vehicle', '00000000-0000-0000-0000-000000000020', 'puc', CURRENT_DATE + 20, 'expiring_soon'),
  ('00000000-0000-0000-0000-000000000001', 'vehicle', '00000000-0000-0000-0000-000000000021', 'insurance', CURRENT_DATE - 5, 'expired'),
  ('00000000-0000-0000-0000-000000000001', 'driver', '00000000-0000-0000-0000-000000000030', 'driver_licence', '2027-06-30', 'valid');
