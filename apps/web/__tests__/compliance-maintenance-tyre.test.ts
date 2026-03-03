import { describe, it, expect } from 'vitest';
import {
  computeComplianceStatus,
  daysUntilExpiry,
  computeHealthScore,
  tyreNeedsReplacement,
} from '@fleetos/shared';
import {
  complianceDocSchema,
  maintenanceSchema,
  tyreSchema,
} from '../src/lib/validations';

// ─── Compliance Status ───

describe('computeComplianceStatus', () => {
  it('returns "expired" for past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(computeComplianceStatus(yesterday.toISOString())).toBe('expired');
  });

  it('returns "expiring_soon" for 25-day expiry', () => {
    const future = new Date();
    future.setDate(future.getDate() + 25);
    expect(computeComplianceStatus(future.toISOString())).toBe('expiring_soon');
  });

  it('returns "expiring_soon" for exactly 30-day expiry', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(computeComplianceStatus(future.toISOString())).toBe('expiring_soon');
  });

  it('returns "valid" for 31-day expiry', () => {
    const future = new Date();
    future.setDate(future.getDate() + 31);
    expect(computeComplianceStatus(future.toISOString())).toBe('valid');
  });

  it('returns "expired" for date far in the past', () => {
    expect(computeComplianceStatus('2020-01-01')).toBe('expired');
  });

  it('returns "valid" for date far in the future', () => {
    expect(computeComplianceStatus('2030-12-31')).toBe('valid');
  });
});

describe('daysUntilExpiry', () => {
  it('returns negative for expired documents', () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(daysUntilExpiry(past.toISOString())).toBeLessThan(0);
  });

  it('returns positive for future expiry', () => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    const days = daysUntilExpiry(future.toISOString());
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(16); // ceil may add 1
  });

  it('returns approximately correct day count', () => {
    const future = new Date();
    future.setDate(future.getDate() + 100);
    const days = daysUntilExpiry(future.toISOString());
    expect(days).toBeGreaterThanOrEqual(99);
    expect(days).toBeLessThanOrEqual(101);
  });
});

// ─── Vehicle Health Score ───

describe('computeHealthScore', () => {
  it('returns 100 for no overdue services and no breakdowns', () => {
    expect(computeHealthScore({ overdueServiceCount: 0, recentBreakdownCount: 0 })).toBe(100);
  });

  it('deducts 10 per overdue service', () => {
    expect(computeHealthScore({ overdueServiceCount: 3, recentBreakdownCount: 0 })).toBe(70);
  });

  it('deducts 5 per recent breakdown', () => {
    expect(computeHealthScore({ overdueServiceCount: 0, recentBreakdownCount: 4 })).toBe(80);
  });

  it('combines deductions correctly', () => {
    expect(computeHealthScore({ overdueServiceCount: 2, recentBreakdownCount: 3 })).toBe(65);
  });

  it('floors at 0, never goes negative', () => {
    expect(computeHealthScore({ overdueServiceCount: 10, recentBreakdownCount: 10 })).toBe(0);
  });

  it('floors at 0 for extreme values', () => {
    expect(computeHealthScore({ overdueServiceCount: 100, recentBreakdownCount: 100 })).toBe(0);
  });
});

// ─── Tyre Replacement ───

describe('tyreNeedsReplacement', () => {
  it('returns true at exactly 80% of expected life', () => {
    expect(tyreNeedsReplacement(40000, 50000)).toBe(true);
  });

  it('returns true above 80%', () => {
    expect(tyreNeedsReplacement(45000, 50000)).toBe(true);
  });

  it('returns false below 80%', () => {
    expect(tyreNeedsReplacement(39999, 50000)).toBe(false);
  });

  it('returns false for brand new tyre', () => {
    expect(tyreNeedsReplacement(0, 50000)).toBe(false);
  });

  it('returns true at 100%', () => {
    expect(tyreNeedsReplacement(50000, 50000)).toBe(true);
  });

  it('returns true above 100%', () => {
    expect(tyreNeedsReplacement(60000, 50000)).toBe(true);
  });

  it('returns false for zero expected life (edge case)', () => {
    expect(tyreNeedsReplacement(1000, 0)).toBe(false);
  });
});

// ─── Compliance Document Schema ───

describe('complianceDocSchema', () => {
  const validDoc = {
    entity_type: 'vehicle',
    entity_id: '550e8400-e29b-41d4-a716-446655440000',
    doc_type: 'insurance',
    doc_number: 'INS-123',
    issued_date: '2025-01-01',
    expiry_date: '2026-01-01',
  };

  it('accepts valid compliance document', () => {
    const result = complianceDocSchema.safeParse(validDoc);
    expect(result.success).toBe(true);
  });

  it('rejects missing entity_type', () => {
    const { entity_type, ...rest } = validDoc;
    const result = complianceDocSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid entity_type', () => {
    const result = complianceDocSchema.safeParse({ ...validDoc, entity_type: 'truck' });
    expect(result.success).toBe(false);
  });

  it('rejects missing expiry_date', () => {
    const { expiry_date, ...rest } = validDoc;
    const result = complianceDocSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('accepts valid doc_type values', () => {
    for (const docType of ['insurance', 'puc', 'fitness', 'national_permit', 'state_permit', 'driver_licence']) {
      const result = complianceDocSchema.safeParse({ ...validDoc, doc_type: docType });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid doc_type', () => {
    const result = complianceDocSchema.safeParse({ ...validDoc, doc_type: 'tax_receipt' });
    expect(result.success).toBe(false);
  });

  it('allows optional doc_number and issued_date', () => {
    const result = complianceDocSchema.safeParse({
      entity_type: 'driver',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      doc_type: 'driver_licence',
      expiry_date: '2026-06-15',
    });
    expect(result.success).toBe(true);
  });
});

// ─── Maintenance Schema ───

describe('maintenanceSchema', () => {
  const validRecord = {
    vehicle_id: '550e8400-e29b-41d4-a716-446655440000',
    service_type: 'oil_change',
    description: 'Full oil change with filter',
    cost: 5000,
    odometer_at_service: 45000,
    serviced_at: '2025-06-15',
  };

  it('accepts valid maintenance record', () => {
    const result = maintenanceSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it('rejects missing vehicle_id', () => {
    const { vehicle_id, ...rest } = validRecord;
    const result = maintenanceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid service_type', () => {
    const result = maintenanceSchema.safeParse({ ...validRecord, service_type: 'painting' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid service types', () => {
    for (const st of ['oil_change', 'brake', 'clutch', 'battery', 'tyre', 'electrical', 'body', 'other']) {
      const result = maintenanceSchema.safeParse({ ...validRecord, service_type: st });
      expect(result.success).toBe(true);
    }
  });

  it('allows optional fields', () => {
    const result = maintenanceSchema.safeParse({
      vehicle_id: '550e8400-e29b-41d4-a716-446655440000',
      service_type: 'brake',
      cost: 3000,
      odometer_at_service: 50000,
      serviced_at: '2025-07-01',
    });
    expect(result.success).toBe(true);
  });
});

// ─── Tyre Schema ───

describe('tyreSchema', () => {
  const validTyre = {
    vehicle_id: '550e8400-e29b-41d4-a716-446655440000',
    position: 'fl',
    fitment_date: '2025-06-01',
    odometer_at_fitment: 40000,
    expected_life_km: 50000,
    is_retreaded: false,
  };

  it('accepts valid tyre record', () => {
    const result = tyreSchema.safeParse(validTyre);
    expect(result.success).toBe(true);
  });

  it('rejects missing vehicle_id', () => {
    const { vehicle_id, ...rest } = validTyre;
    const result = tyreSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('accepts all tyre positions', () => {
    for (const pos of ['fl', 'fr', 'rl', 'rr', 'spare']) {
      const result = tyreSchema.safeParse({ ...validTyre, position: pos });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid position', () => {
    const result = tyreSchema.safeParse({ ...validTyre, position: 'center' });
    expect(result.success).toBe(false);
  });

  it('allows optional brand and serial_number', () => {
    const result = tyreSchema.safeParse(validTyre);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand).toBeUndefined();
    }
  });

  it('accepts retreaded tyres', () => {
    const result = tyreSchema.safeParse({ ...validTyre, is_retreaded: true });
    expect(result.success).toBe(true);
  });

  it('accepts optional purchase_cost', () => {
    const result = tyreSchema.safeParse({ ...validTyre, purchase_cost: 12500 });
    expect(result.success).toBe(true);
  });
});
