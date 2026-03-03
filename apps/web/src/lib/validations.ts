import { z } from 'zod';

// Indian phone: +91 followed by 10 digits
export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid Indian phone number');

export const otpSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

export const onboardingSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  phone: phoneSchema,
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
    .optional()
    .or(z.literal('')),
  branchName: z.string().min(1, 'Branch name is required'),
  branchCity: z.string().min(1, 'Branch city is required'),
  lrPrefix: z
    .string()
    .min(2, 'LR prefix must be 2-5 characters')
    .max(5, 'LR prefix must be 2-5 characters')
    .regex(/^[A-Z]{2,5}$/, 'LR prefix must be uppercase letters only'),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

export const inviteSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: phoneSchema,
  role: z.enum(['manager', 'accountant', 'driver'], {
    required_error: 'Select a role',
  }),
  branchId: z.string().uuid('Select a branch').optional(),
});

export type InviteFormData = z.infer<typeof inviteSchema>;

// ─── Vehicle Schema ───

export const vehicleSchema = z.object({
  registration_number: z
    .string()
    .min(4, 'Registration number is required')
    .max(15, 'Registration number too long')
    .regex(/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/, 'Invalid registration format (e.g. AP09AB1234)'),
  make: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  year: z.coerce
    .number()
    .min(1990, 'Year must be after 1990')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future')
    .optional()
    .or(z.literal(0).transform(() => undefined)),
  vehicle_type: z.enum(['truck', 'tempo', 'trailer', 'tanker'], {
    required_error: 'Select a vehicle type',
  }),
  capacity_kg: z.coerce.number().min(0).optional(),
  fuel_type: z.enum(['diesel', 'petrol', 'cng']),
  baseline_mileage_kmpl: z.coerce.number().min(0.1, 'Baseline mileage is required').max(50),
  current_odometer_km: z.coerce.number().min(0),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

// ─── Driver Schema ───

export const driverSchema = z.object({
  name: z.string().min(2, 'Driver name is required'),
  phone: phoneSchema,
  aadhaar_last4: z
    .string()
    .max(4, 'Only last 4 digits of Aadhaar')
    .regex(/^\d{0,4}$/, 'Only digits allowed')
    .optional()
    .or(z.literal('')),
  licence_number: z.string().optional().or(z.literal('')),
  licence_expiry: z.string().optional().or(z.literal('')),
  emergency_contact_name: z.string().optional().or(z.literal('')),
  emergency_contact_phone: z.string().optional().or(z.literal('')),
  bank_account_number: z.string().optional().or(z.literal('')),
  bank_ifsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code')
    .optional()
    .or(z.literal('')),
  fixed_salary: z.coerce.number().min(0),
});

export type DriverFormData = z.infer<typeof driverSchema>;

// ─── Branch Schema ───

export const branchSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  address: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'City is required'),
  lr_prefix: z
    .string()
    .min(2, 'LR prefix must be 2-5 characters')
    .max(5, 'LR prefix must be 2-5 characters')
    .regex(/^[A-Z]{2,5}$/, 'LR prefix must be uppercase letters only'),
  manager_user_id: z.string().uuid().optional().or(z.literal('')),
});

export type BranchFormData = z.infer<typeof branchSchema>;

// ─── Address Book Schema ───

export const addressBookSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['consignor', 'consignee', 'both'], {
    required_error: 'Select a type',
  }),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  gst_number: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
    .optional()
    .or(z.literal('')),
  address_line1: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional()
    .or(z.literal('')),
});

export type AddressBookFormData = z.infer<typeof addressBookSchema>;

// ─── LR / Bilty Schema ───

export const lrSchema = z.object({
  branch_id: z.string().uuid('Select a branch'),
  load_type: z.enum(['ftl', 'ltl', 'parchutan'], {
    required_error: 'Select load type',
  }),
  consignor_id: z.string().uuid('Select consignor from address book'),
  consignee_id: z.string().uuid('Select consignee from address book'),
  origin_city: z.string().min(1, 'Origin city is required'),
  destination_city: z.string().min(1, 'Destination city is required'),
  goods_description: z.string().optional().or(z.literal('')),
  weight_kg: z.coerce.number().min(0).optional(),
  freight_amount: z.coerce.number().min(1, 'Freight amount must be at least ₹1'),
  gst_rate: z.coerce.number().min(0).max(28),
  ewb_number: z.string().optional().or(z.literal('')),
  ewb_expiry: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type LRFormData = z.infer<typeof lrSchema>;

// ─── Trip Schema ───

const stopoverSchema = z.object({
  city: z.string().min(1, 'City is required'),
  expected_arrival: z.string().min(1, 'Expected arrival is required'),
});

export const tripSchema = z.object({
  branch_id: z.string().uuid('Select a branch'),
  origin_city: z.string().min(1, 'Origin city is required'),
  destination_city: z.string().min(1, 'Destination city is required'),
  stopovers: z.array(stopoverSchema),
  vehicle_id: z.string().uuid('Select a vehicle'),
  driver_id: z.string().uuid('Select a driver'),
  planned_departure: z.string().min(1, 'Planned departure is required'),
  odometer_start: z.coerce.number().min(0, 'Odometer start is required'),
});

export type TripFormData = z.infer<typeof tripSchema>;

export const tripCostSchema = z.object({
  total_toll_cost: z.coerce.number().min(0),
  total_driver_allowance: z.coerce.number().min(0),
  total_loading_cost: z.coerce.number().min(0),
  total_misc_cost: z.coerce.number().min(0),
});

export type TripCostData = z.infer<typeof tripCostSchema>;

// ─── Diesel Entry Schema ───

export const dieselEntrySchema = z.object({
  vehicle_id: z.string().uuid('Select a vehicle'),
  trip_id: z.string().uuid('Select a trip'),
  driver_id: z.string().uuid('Select a driver'),
  litres: z.coerce.number().min(0.1, 'Litres must be > 0').max(999.99),
  price_per_litre: z.coerce.number().min(0.1, 'Price must be > 0'),
  odometer_at_fill: z.coerce.number().min(0, 'Odometer reading is required'),
  station_name: z.string().optional().or(z.literal('')),
  filled_at: z.string().min(1, 'Fill date is required'),
});

export type DieselEntryFormData = z.infer<typeof dieselEntrySchema>;

// ─── Compliance Document Schema ───

export const complianceDocSchema = z.object({
  entity_type: z.enum(['vehicle', 'driver'], { required_error: 'Select entity type' }),
  entity_id: z.string().uuid('Select a vehicle or driver'),
  doc_type: z.enum(
    ['insurance', 'puc', 'fitness', 'national_permit', 'state_permit', 'driver_licence'],
    { required_error: 'Select document type' }
  ),
  doc_number: z.string().optional().or(z.literal('')),
  issued_date: z.string().optional().or(z.literal('')),
  expiry_date: z.string().min(1, 'Expiry date is required'),
});

export type ComplianceDocFormData = z.infer<typeof complianceDocSchema>;

// ─── Maintenance Record Schema ───

export const maintenanceSchema = z.object({
  vehicle_id: z.string().uuid('Select a vehicle'),
  service_type: z.enum(
    ['oil_change', 'brake', 'clutch', 'battery', 'tyre', 'electrical', 'body', 'other'],
    { required_error: 'Select service type' }
  ),
  description: z.string().optional().or(z.literal('')),
  cost: z.coerce.number().min(0, 'Cost is required'),
  odometer_at_service: z.coerce.number().min(0, 'Odometer reading is required'),
  next_service_km: z.coerce.number().min(0).optional(),
  next_service_date: z.string().optional().or(z.literal('')),
  workshop_name: z.string().optional().or(z.literal('')),
  workshop_phone: z.string().optional().or(z.literal('')),
  serviced_at: z.string().min(1, 'Service date is required'),
});

export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

// ─── Tyre Record Schema ───

export const tyreSchema = z.object({
  vehicle_id: z.string().uuid('Select a vehicle'),
  brand: z.string().optional().or(z.literal('')),
  serial_number: z.string().optional().or(z.literal('')),
  position: z.enum(['fl', 'fr', 'rl', 'rr', 'spare'], { required_error: 'Select position' }),
  fitment_date: z.string().min(1, 'Fitment date is required'),
  odometer_at_fitment: z.coerce.number().min(0, 'Odometer at fitment is required'),
  expected_life_km: z.coerce.number().min(1000, 'Expected life must be at least 1000 km'),
  is_retreaded: z.boolean(),
  purchase_cost: z.coerce.number().min(0).optional(),
});

export type TyreFormData = z.infer<typeof tyreSchema>;

// ─── Vendor Schema ───

export const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  phone: z.string().optional().or(z.literal('')),
  vehicle_number: z.string().optional().or(z.literal('')),
  vehicle_type: z.enum(['truck', 'tempo', 'trailer', 'tanker']).optional(),
  route_specialisation: z.string().optional().or(z.literal('')),
  rate_per_km: z.coerce.number().min(0).optional(),
  rate_per_trip: z.coerce.number().min(0).optional(),
});

export type VendorFormData = z.infer<typeof vendorSchema>;

// ─── Driver Salary Schema ───

export const salarySchema = z.object({
  driver_id: z.string().uuid('Select a driver'),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
  fixed_pay: z.coerce.number().min(0, 'Fixed pay must be ≥ 0'),
  trip_allowances: z.coerce.number().min(0),
  advances_deducted: z.coerce.number().min(0),
  other_deductions: z.coerce.number().min(0),
});

export type SalaryFormData = z.infer<typeof salarySchema>;
