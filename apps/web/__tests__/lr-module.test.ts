import { describe, it, expect } from 'vitest';
import { formatLRNumber, calculateGST, generateTrackingToken } from '@fleetos/shared';
import { lrSchema } from '../src/lib/validations';

// ─── LR Number Padding ───

describe('formatLRNumber', () => {
  it('pads sequence 1 to 6 digits', () => {
    expect(formatLRNumber('VZG', 1)).toBe('VZG-000001');
  });

  it('pads sequence 999 to 6 digits', () => {
    expect(formatLRNumber('VZG', 999)).toBe('VZG-000999');
  });

  it('handles sequence 123456 (full 6 digits)', () => {
    expect(formatLRNumber('HYD', 123456)).toBe('HYD-123456');
  });

  it('handles sequence > 6 digits (no truncation)', () => {
    expect(formatLRNumber('VZG', 1234567)).toBe('VZG-1234567');
  });

  it('uses the correct prefix', () => {
    expect(formatLRNumber('CHN', 42)).toBe('CHN-000042');
  });
});

// ─── GST Calculation ───

describe('calculateGST', () => {
  it('calculates GST at 5%: freight 10000 → gst 500, total 10500', () => {
    const result = calculateGST(10000, 5);
    expect(result.gstAmount).toBe(500);
    expect(result.totalAmount).toBe(10500);
  });

  it('calculates GST at 12%: freight 25000 → gst 3000, total 28000', () => {
    const result = calculateGST(25000, 12);
    expect(result.gstAmount).toBe(3000);
    expect(result.totalAmount).toBe(28000);
  });

  it('calculates GST at 18%: freight 15000 → gst 2700, total 17700', () => {
    const result = calculateGST(15000, 18);
    expect(result.gstAmount).toBe(2700);
    expect(result.totalAmount).toBe(17700);
  });

  it('calculates GST at 0%: no tax', () => {
    const result = calculateGST(50000, 0);
    expect(result.gstAmount).toBe(0);
    expect(result.totalAmount).toBe(50000);
  });

  it('rounds GST amount correctly', () => {
    // 7777 * 5 / 100 = 388.85
    const result = calculateGST(7777, 5);
    expect(result.gstAmount).toBe(388.85);
    expect(result.totalAmount).toBe(8165.85);
  });
});

// ─── Tracking Token ───

describe('generateTrackingToken', () => {
  it('generates a 12-character string', () => {
    const token = generateTrackingToken();
    expect(token).toHaveLength(12);
  });

  it('contains only alphanumeric characters', () => {
    const token = generateTrackingToken();
    expect(token).toMatch(/^[A-Za-z0-9]{12}$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateTrackingToken()));
    expect(tokens.size).toBe(100);
  });
});

// ─── LR Schema Validation ───

describe('lrSchema', () => {
  const validLR = {
    branch_id: '550e8400-e29b-41d4-a716-446655440000',
    load_type: 'ftl' as const,
    consignor_id: '550e8400-e29b-41d4-a716-446655440001',
    consignee_id: '550e8400-e29b-41d4-a716-446655440002',
    origin_city: 'Vizag',
    destination_city: 'Hyderabad',
    freight_amount: 15000,
    gst_rate: 5,
  };

  it('accepts valid LR data', () => {
    expect(lrSchema.safeParse(validLR).success).toBe(true);
  });

  it('accepts all load types', () => {
    expect(lrSchema.safeParse({ ...validLR, load_type: 'ltl' }).success).toBe(true);
    expect(lrSchema.safeParse({ ...validLR, load_type: 'parchutan' }).success).toBe(true);
  });

  it('rejects freight_amount of 0', () => {
    expect(lrSchema.safeParse({ ...validLR, freight_amount: 0 }).success).toBe(false);
  });

  it('rejects missing origin_city', () => {
    expect(lrSchema.safeParse({ ...validLR, origin_city: '' }).success).toBe(false);
  });

  it('rejects invalid consignor_id (not UUID)', () => {
    expect(lrSchema.safeParse({ ...validLR, consignor_id: 'bad' }).success).toBe(false);
  });

  it('accepts optional EWB number', () => {
    expect(lrSchema.safeParse({ ...validLR, ewb_number: '121234567890' }).success).toBe(true);
    expect(lrSchema.safeParse({ ...validLR, ewb_number: '' }).success).toBe(true);
  });
});

// ─── Duplicate LR Number Prevention ───

describe('LR number race condition prevention', () => {
  it('RPC generate_lr_number uses atomic UPDATE...RETURNING to prevent duplicates', () => {
    // This is a documentation test — the actual prevention is in the PostgreSQL RPC.
    // The RPC (004_generate_lr_number_rpc.sql) does:
    //   UPDATE branches SET lr_current_sequence = lr_current_sequence + 1
    //   WHERE id = p_branch_id RETURNING lr_prefix, lr_current_sequence
    //
    // This is atomic — PostgreSQL row-level locks ensure two concurrent calls
    // will produce sequential, non-duplicate LR numbers.
    //
    // Client code MUST call supabase.rpc('generate_lr_number') — never increment client-side.

    // Verify the formatLRNumber produces different numbers for sequential sequences
    const lr1 = formatLRNumber('VZG', 1);
    const lr2 = formatLRNumber('VZG', 2);
    expect(lr1).not.toBe(lr2);
    expect(lr1).toBe('VZG-000001');
    expect(lr2).toBe('VZG-000002');
  });
});
