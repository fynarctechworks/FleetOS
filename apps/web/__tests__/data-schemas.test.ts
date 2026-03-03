import { describe, it, expect } from 'vitest';
import {
  vehicleSchema,
  driverSchema,
  branchSchema,
  addressBookSchema,
} from '../src/lib/validations';

// ─── Vehicle Schema ───

describe('vehicleSchema', () => {
  const valid = {
    registration_number: 'AP09AB1234',
    vehicle_type: 'truck' as const,
    fuel_type: 'diesel' as const,
    baseline_mileage_kmpl: 4.5,
    current_odometer_km: 50000,
  };

  it('accepts valid vehicle data', () => {
    expect(vehicleSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all vehicle types', () => {
    expect(vehicleSchema.safeParse({ ...valid, vehicle_type: 'tempo' }).success).toBe(true);
    expect(vehicleSchema.safeParse({ ...valid, vehicle_type: 'trailer' }).success).toBe(true);
    expect(vehicleSchema.safeParse({ ...valid, vehicle_type: 'tanker' }).success).toBe(true);
  });

  it('rejects invalid registration format', () => {
    expect(vehicleSchema.safeParse({ ...valid, registration_number: 'bad' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...valid, registration_number: '' }).success).toBe(false);
  });

  it('rejects zero baseline mileage', () => {
    expect(vehicleSchema.safeParse({ ...valid, baseline_mileage_kmpl: 0 }).success).toBe(false);
  });

  it('accepts optional make/model/year', () => {
    const result = vehicleSchema.safeParse({ ...valid, make: 'Tata', model: '407', year: 2022 });
    expect(result.success).toBe(true);
  });
});

// ─── Driver Schema — RULE-001: aadhaar_last4 max 4 digits ───

describe('driverSchema', () => {
  const valid = {
    name: 'Ravi Kumar',
    phone: '9876543210',
    fixed_salary: 15000,
  };

  it('accepts valid driver data', () => {
    expect(driverSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts aadhaar_last4 with exactly 4 digits', () => {
    expect(driverSchema.safeParse({ ...valid, aadhaar_last4: '1234' }).success).toBe(true);
  });

  it('accepts aadhaar_last4 with less than 4 digits', () => {
    expect(driverSchema.safeParse({ ...valid, aadhaar_last4: '12' }).success).toBe(true);
  });

  it('REJECTS aadhaar_last4 with 5+ digits (RULE-001)', () => {
    expect(driverSchema.safeParse({ ...valid, aadhaar_last4: '12345' }).success).toBe(false);
  });

  it('REJECTS aadhaar_last4 with 12 digits (full Aadhaar)', () => {
    expect(driverSchema.safeParse({ ...valid, aadhaar_last4: '123456789012' }).success).toBe(false);
  });

  it('rejects aadhaar_last4 with non-digit characters', () => {
    expect(driverSchema.safeParse({ ...valid, aadhaar_last4: 'abcd' }).success).toBe(false);
  });

  it('accepts valid IFSC code', () => {
    expect(driverSchema.safeParse({ ...valid, bank_ifsc: 'SBIN0001234' }).success).toBe(true);
  });

  it('rejects invalid IFSC code', () => {
    expect(driverSchema.safeParse({ ...valid, bank_ifsc: 'INVALID' }).success).toBe(false);
  });
});

// ─── Branch Schema ───

describe('branchSchema', () => {
  const valid = {
    name: 'Vizag HQ',
    city: 'Visakhapatnam',
    lr_prefix: 'VZG',
  };

  it('accepts valid branch data', () => {
    expect(branchSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing city', () => {
    expect(branchSchema.safeParse({ ...valid, city: '' }).success).toBe(false);
  });

  it('rejects invalid LR prefix', () => {
    expect(branchSchema.safeParse({ ...valid, lr_prefix: 'vz' }).success).toBe(false);
  });
});

// ─── Address Book Schema ───

describe('addressBookSchema', () => {
  const valid = {
    name: 'Sri Sai Enterprises',
    type: 'consignor' as const,
  };

  it('accepts valid address book data', () => {
    expect(addressBookSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all address types', () => {
    expect(addressBookSchema.safeParse({ ...valid, type: 'consignee' }).success).toBe(true);
    expect(addressBookSchema.safeParse({ ...valid, type: 'both' }).success).toBe(true);
  });

  it('validates pincode format (6 digits)', () => {
    expect(addressBookSchema.safeParse({ ...valid, pincode: '530001' }).success).toBe(true);
    expect(addressBookSchema.safeParse({ ...valid, pincode: '12345' }).success).toBe(false);
    expect(addressBookSchema.safeParse({ ...valid, pincode: '1234567' }).success).toBe(false);
  });

  it('validates GST number format', () => {
    expect(addressBookSchema.safeParse({ ...valid, gst_number: '37AABCU9603R1ZM' }).success).toBe(true);
    expect(addressBookSchema.safeParse({ ...valid, gst_number: 'INVALID' }).success).toBe(false);
  });

  it('accepts optional empty string fields', () => {
    expect(addressBookSchema.safeParse({ ...valid, email: '', phone: '', pincode: '' }).success).toBe(true);
  });
});
