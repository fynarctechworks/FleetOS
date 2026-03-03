import { describe, it, expect } from 'vitest';
import {
  formatTripNumber,
  calculateNetProfit,
  detectDieselTheft,
  validateOdometer,
  isPreDepartureLoss,
  DIESEL_THEFT_THRESHOLD,
} from '@fleetos/shared';
import {
  tripSchema,
  tripCostSchema,
  dieselEntrySchema,
} from '../src/lib/validations';

// ─── Trip Utils ───

describe('formatTripNumber', () => {
  it('pads single digit to T-000001', () => {
    expect(formatTripNumber(1)).toBe('T-000001');
  });

  it('pads three digits to T-000123', () => {
    expect(formatTripNumber(123)).toBe('T-000123');
  });

  it('handles large numbers', () => {
    expect(formatTripNumber(999999)).toBe('T-999999');
  });
});

describe('calculateNetProfit', () => {
  it('returns correct profit when revenue exceeds costs', () => {
    const result = calculateNetProfit({
      total_revenue: 50000,
      total_diesel_cost: 15000,
      total_toll_cost: 2000,
      total_driver_allowance: 3000,
      total_loading_cost: 1000,
      total_misc_cost: 500,
    });
    expect(result).toBe(28500);
  });

  it('returns negative when costs exceed revenue', () => {
    const result = calculateNetProfit({
      total_revenue: 10000,
      total_diesel_cost: 15000,
      total_toll_cost: 2000,
      total_driver_allowance: 3000,
      total_loading_cost: 1000,
      total_misc_cost: 500,
    });
    expect(result).toBe(-11500);
  });

  it('returns zero for break-even', () => {
    const result = calculateNetProfit({
      total_revenue: 21500,
      total_diesel_cost: 15000,
      total_toll_cost: 2000,
      total_driver_allowance: 3000,
      total_loading_cost: 1000,
      total_misc_cost: 500,
    });
    expect(result).toBe(0);
  });

  it('returns revenue when all costs are zero', () => {
    const result = calculateNetProfit({
      total_revenue: 50000,
      total_diesel_cost: 0,
      total_toll_cost: 0,
      total_driver_allowance: 0,
      total_loading_cost: 0,
      total_misc_cost: 0,
    });
    expect(result).toBe(50000);
  });
});

// ─── Pre-departure Loss Alert ───

describe('isPreDepartureLoss', () => {
  it('returns true when net profit is negative (loss alert)', () => {
    expect(
      isPreDepartureLoss({
        total_revenue: 10000,
        total_diesel_cost: 15000,
        total_toll_cost: 0,
        total_driver_allowance: 0,
        total_loading_cost: 0,
        total_misc_cost: 0,
      })
    ).toBe(true);
  });

  it('returns false when net profit is positive', () => {
    expect(
      isPreDepartureLoss({
        total_revenue: 50000,
        total_diesel_cost: 15000,
        total_toll_cost: 2000,
        total_driver_allowance: 3000,
        total_loading_cost: 1000,
        total_misc_cost: 500,
      })
    ).toBe(false);
  });

  it('returns false when net profit is exactly zero', () => {
    expect(
      isPreDepartureLoss({
        total_revenue: 10000,
        total_diesel_cost: 10000,
        total_toll_cost: 0,
        total_driver_allowance: 0,
        total_loading_cost: 0,
        total_misc_cost: 0,
      })
    ).toBe(false);
  });
});

// ─── Diesel Theft Detection ───

describe('detectDieselTheft', () => {
  it('flags theft at 15.1% deviation (above threshold)', () => {
    // baseline = 5 km/L, actual = 4.245 km/L → deviation = 15.1%
    const result = detectDieselTheft({
      distanceKm: 424.5,
      totalLitres: 100,
      baselineKmpl: 5,
    });
    expect(result.flagged).toBe(true);
    expect(result.actualKmpl).toBe(4.25); // rounded
    expect(result.deviationPct).toBeGreaterThan(15);
  });

  it('does NOT flag at 14.9% deviation (below threshold)', () => {
    // baseline = 5 km/L, actual = 4.255 km/L → deviation = 14.9%
    const result = detectDieselTheft({
      distanceKm: 425.5,
      totalLitres: 100,
      baselineKmpl: 5,
    });
    expect(result.flagged).toBe(false);
    expect(result.deviationPct).toBeLessThan(15.1);
  });

  it('does NOT flag when actual exceeds baseline (negative deviation)', () => {
    const result = detectDieselTheft({
      distanceKm: 600,
      totalLitres: 100,
      baselineKmpl: 5,
    });
    expect(result.flagged).toBe(false);
    expect(result.actualKmpl).toBe(6);
  });

  it('handles zero litres safely', () => {
    const result = detectDieselTheft({
      distanceKm: 100,
      totalLitres: 0,
      baselineKmpl: 5,
    });
    expect(result.flagged).toBe(false);
    expect(result.actualKmpl).toBe(0);
  });

  it('handles zero distance safely', () => {
    const result = detectDieselTheft({
      distanceKm: 0,
      totalLitres: 100,
      baselineKmpl: 5,
    });
    expect(result.flagged).toBe(false);
  });

  it('threshold constant equals 0.15', () => {
    expect(DIESEL_THEFT_THRESHOLD).toBe(0.15);
  });

  it('flags at exact 22% deviation (integration scenario)', () => {
    // baseline = 4 km/L, actual = 3.12 km/L → deviation = 22%
    const result = detectDieselTheft({
      distanceKm: 312,
      totalLitres: 100,
      baselineKmpl: 4,
    });
    expect(result.flagged).toBe(true);
    expect(result.deviationPct).toBe(22);
  });
});

// ─── Odometer Validation ───

describe('validateOdometer', () => {
  it('accepts fill odometer >= current odometer', () => {
    expect(validateOdometer(50000, 49000)).toBe(true);
  });

  it('accepts equal odometer', () => {
    expect(validateOdometer(50000, 50000)).toBe(true);
  });

  it('rejects fill odometer < current odometer', () => {
    expect(validateOdometer(48000, 50000)).toBe(false);
  });
});

// ─── Trip Schema Validation ───

describe('tripSchema', () => {
  const validTrip = {
    branch_id: '550e8400-e29b-41d4-a716-446655440000',
    origin_city: 'Vizag',
    destination_city: 'Hyderabad',
    stopovers: [],
    vehicle_id: '550e8400-e29b-41d4-a716-446655440001',
    driver_id: '550e8400-e29b-41d4-a716-446655440002',
    planned_departure: '2026-03-15T08:00',
    odometer_start: 45000,
  };

  it('validates a correct trip', () => {
    const result = tripSchema.safeParse(validTrip);
    expect(result.success).toBe(true);
  });

  it('rejects missing origin_city', () => {
    const result = tripSchema.safeParse({ ...validTrip, origin_city: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid vehicle_id', () => {
    const result = tripSchema.safeParse({ ...validTrip, vehicle_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('validates trip with stopovers', () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      stopovers: [{ city: 'Rajahmundry', expected_arrival: '2026-03-15T14:00' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects stopover with empty city', () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      stopovers: [{ city: '', expected_arrival: '2026-03-15T14:00' }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Trip Cost Schema ───

describe('tripCostSchema', () => {
  it('validates correct costs', () => {
    const result = tripCostSchema.safeParse({
      total_toll_cost: 2000,
      total_driver_allowance: 3000,
      total_loading_cost: 1000,
      total_misc_cost: 500,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative costs', () => {
    const result = tripCostSchema.safeParse({
      total_toll_cost: -100,
      total_driver_allowance: 3000,
      total_loading_cost: 1000,
      total_misc_cost: 500,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Diesel Entry Schema ───

describe('dieselEntrySchema', () => {
  const validDiesel = {
    vehicle_id: '550e8400-e29b-41d4-a716-446655440001',
    trip_id: '550e8400-e29b-41d4-a716-446655440003',
    driver_id: '550e8400-e29b-41d4-a716-446655440002',
    litres: 50,
    price_per_litre: 89.5,
    odometer_at_fill: 50000,
    station_name: 'HP Pump NH16',
    filled_at: '2026-03-15T10:30',
  };

  it('validates a correct diesel entry', () => {
    const result = dieselEntrySchema.safeParse(validDiesel);
    expect(result.success).toBe(true);
  });

  it('rejects zero litres', () => {
    const result = dieselEntrySchema.safeParse({ ...validDiesel, litres: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects zero price', () => {
    const result = dieselEntrySchema.safeParse({ ...validDiesel, price_per_litre: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects missing filled_at', () => {
    const result = dieselEntrySchema.safeParse({ ...validDiesel, filled_at: '' });
    expect(result.success).toBe(false);
  });

  it('allows empty station_name', () => {
    const result = dieselEntrySchema.safeParse({ ...validDiesel, station_name: '' });
    expect(result.success).toBe(true);
  });

  it('rejects litres above 999.99', () => {
    const result = dieselEntrySchema.safeParse({ ...validDiesel, litres: 1000 });
    expect(result.success).toBe(false);
  });
});
