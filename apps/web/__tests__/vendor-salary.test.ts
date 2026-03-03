import { describe, it, expect } from 'vitest';
import {
  calculateNetSalary,
  formatSalaryMonth,
  getCurrentMonth,
  sumTripAllowances,
} from '@fleetos/shared';
import { vendorSchema, salarySchema } from '../src/lib/validations';

// ─── calculateNetSalary ───

describe('calculateNetSalary', () => {
  it('calculates correctly with all components', () => {
    expect(
      calculateNetSalary({
        fixed_pay: 25000,
        trip_allowances: 5000,
        advances_deducted: 3000,
        other_deductions: 1000,
      })
    ).toBe(26000); // 25000 + 5000 - 3000 - 1000
  });

  it('returns fixed_pay when no allowances or deductions', () => {
    expect(
      calculateNetSalary({
        fixed_pay: 20000,
        trip_allowances: 0,
        advances_deducted: 0,
        other_deductions: 0,
      })
    ).toBe(20000);
  });

  it('handles negative net salary (deductions > earnings)', () => {
    expect(
      calculateNetSalary({
        fixed_pay: 10000,
        trip_allowances: 0,
        advances_deducted: 8000,
        other_deductions: 5000,
      })
    ).toBe(-3000);
  });

  it('handles zero fixed pay', () => {
    expect(
      calculateNetSalary({
        fixed_pay: 0,
        trip_allowances: 5000,
        advances_deducted: 0,
        other_deductions: 0,
      })
    ).toBe(5000);
  });

  it('handles all zeros', () => {
    expect(
      calculateNetSalary({
        fixed_pay: 0,
        trip_allowances: 0,
        advances_deducted: 0,
        other_deductions: 0,
      })
    ).toBe(0);
  });
});

// ─── formatSalaryMonth ───

describe('formatSalaryMonth', () => {
  it('formats 2026-03 as March 2026', () => {
    expect(formatSalaryMonth('2026-03')).toBe('March 2026');
  });

  it('formats 2025-12 as December 2025', () => {
    expect(formatSalaryMonth('2025-12')).toBe('December 2025');
  });

  it('formats 2026-01 as January 2026', () => {
    expect(formatSalaryMonth('2026-01')).toBe('January 2026');
  });
});

// ─── getCurrentMonth ───

describe('getCurrentMonth', () => {
  it('returns YYYY-MM format', () => {
    const result = getCurrentMonth();
    expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('returns correct year', () => {
    const result = getCurrentMonth();
    const year = Number(result.split('-')[0]);
    expect(year).toBeGreaterThanOrEqual(2024);
    expect(year).toBeLessThanOrEqual(2030);
  });
});

// ─── sumTripAllowances ───

describe('sumTripAllowances', () => {
  it('sums only completed trips', () => {
    const trips = [
      { total_driver_allowance: 500, status: 'completed' },
      { total_driver_allowance: 300, status: 'completed' },
      { total_driver_allowance: 200, status: 'planned' },
      { total_driver_allowance: 400, status: 'departed' },
    ];
    expect(sumTripAllowances(trips)).toBe(800); // 500 + 300
  });

  it('returns 0 for no completed trips', () => {
    const trips = [
      { total_driver_allowance: 500, status: 'planned' },
    ];
    expect(sumTripAllowances(trips)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(sumTripAllowances([])).toBe(0);
  });

  it('handles zero allowances', () => {
    const trips = [
      { total_driver_allowance: 0, status: 'completed' },
    ];
    expect(sumTripAllowances(trips)).toBe(0);
  });
});

// ─── vendorSchema ───

describe('vendorSchema', () => {
  it('accepts valid vendor data', () => {
    const result = vendorSchema.safeParse({
      name: 'Sharma Transport',
      phone: '+919876543210',
      vehicle_number: 'AP09AB1234',
      vehicle_type: 'truck',
      route_specialisation: 'Mumbai-Delhi',
      rate_per_km: 12.5,
      rate_per_trip: 15000,
    });
    expect(result.success).toBe(true);
  });

  it('requires vendor name', () => {
    const result = vendorSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts minimal data (name only)', () => {
    const result = vendorSchema.safeParse({ name: 'Test Vendor' });
    expect(result.success).toBe(true);
  });

  it('validates vehicle_type enum', () => {
    const result = vendorSchema.safeParse({
      name: 'Test',
      vehicle_type: 'airplane',
    });
    expect(result.success).toBe(false);
  });

  it('allows all valid vehicle types', () => {
    for (const type of ['truck', 'tempo', 'trailer', 'tanker']) {
      const result = vendorSchema.safeParse({ name: 'Test', vehicle_type: type });
      expect(result.success).toBe(true);
    }
  });
});

// ─── salarySchema ───

describe('salarySchema', () => {
  it('accepts valid salary data', () => {
    const result = salarySchema.safeParse({
      driver_id: '123e4567-e89b-12d3-a456-426614174000',
      month: '2026-03',
      fixed_pay: 25000,
      trip_allowances: 5000,
      advances_deducted: 3000,
      other_deductions: 1000,
    });
    expect(result.success).toBe(true);
  });

  it('requires valid UUID for driver_id', () => {
    const result = salarySchema.safeParse({
      driver_id: 'not-a-uuid',
      month: '2026-03',
      fixed_pay: 25000,
      trip_allowances: 0,
      advances_deducted: 0,
      other_deductions: 0,
    });
    expect(result.success).toBe(false);
  });

  it('validates month format YYYY-MM', () => {
    const valid = salarySchema.safeParse({
      driver_id: '123e4567-e89b-12d3-a456-426614174000',
      month: '2026-03',
      fixed_pay: 25000,
      trip_allowances: 0,
      advances_deducted: 0,
      other_deductions: 0,
    });
    expect(valid.success).toBe(true);

    const invalid = salarySchema.safeParse({
      driver_id: '123e4567-e89b-12d3-a456-426614174000',
      month: '2026-13', // invalid month
      fixed_pay: 25000,
      trip_allowances: 0,
      advances_deducted: 0,
      other_deductions: 0,
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects negative fixed_pay', () => {
    const result = salarySchema.safeParse({
      driver_id: '123e4567-e89b-12d3-a456-426614174000',
      month: '2026-03',
      fixed_pay: -5000,
      trip_allowances: 0,
      advances_deducted: 0,
      other_deductions: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero deductions', () => {
    const result = salarySchema.safeParse({
      driver_id: '123e4567-e89b-12d3-a456-426614174000',
      month: '2026-03',
      fixed_pay: 20000,
      trip_allowances: 0,
      advances_deducted: 0,
      other_deductions: 0,
    });
    expect(result.success).toBe(true);
  });

  it('validates month 00 is invalid', () => {
    const result = salarySchema.safeParse({
      driver_id: '123e4567-e89b-12d3-a456-426614174000',
      month: '2026-00',
      fixed_pay: 20000,
      trip_allowances: 0,
      advances_deducted: 0,
      other_deductions: 0,
    });
    expect(result.success).toBe(false);
  });
});
