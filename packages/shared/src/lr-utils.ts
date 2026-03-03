/**
 * LR utility functions — shared business logic for LR/Bilty module.
 */

/**
 * Format LR number from prefix and sequence.
 * Pads sequence to 6 digits.
 * @example formatLRNumber('VZG', 1) => 'VZG-000001'
 * @example formatLRNumber('HYD', 999) => 'HYD-000999'
 */
export function formatLRNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Calculate GST amount from freight and rate.
 * Returns rounded to 2 decimal places.
 */
export function calculateGST(freightAmount: number, gstRate: number): {
  gstAmount: number;
  totalAmount: number;
} {
  const gstAmount = Math.round(freightAmount * gstRate) / 100;
  const totalAmount = freightAmount + gstAmount;
  return { gstAmount, totalAmount };
}

/**
 * Generate a random 12-character alphanumeric tracking token.
 * Used as DEFAULT in the database schema — this is for client-side reference only.
 */
export function generateTrackingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
