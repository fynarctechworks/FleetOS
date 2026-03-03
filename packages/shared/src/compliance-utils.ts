/**
 * Compliance & Maintenance utility functions.
 */

import { COMPLIANCE_THRESHOLDS } from './constants';
import type { ComplianceStatus } from './types';

/**
 * Compute compliance status from expiry date.
 * expired: past due, expiring_soon: within 30 days, valid: beyond 30 days.
 */
export function computeComplianceStatus(expiryDate: string): ComplianceStatus {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'expired';
  if (diffDays <= COMPLIANCE_THRESHOLDS.expiringSoonDays) return 'expiring_soon';
  return 'valid';
}

/**
 * Get days remaining until expiry. Negative means overdue.
 */
export function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compute vehicle health score.
 * Start at 100, subtract:
 * - 10 for each overdue scheduled service (next_service_date < today OR next_service_km < current_odometer)
 * - 5 for each open breakdown in the last 90 days
 * Floor at 0.
 */
export function computeHealthScore(params: {
  overdueServiceCount: number;
  recentBreakdownCount: number;
}): number {
  const score =
    100 -
    params.overdueServiceCount * 10 -
    params.recentBreakdownCount * 5;
  return Math.max(0, score);
}

/**
 * Check if a tyre needs replacement alert (80% of expected life).
 */
export function tyreNeedsReplacement(currentKm: number, expectedLifeKm: number): boolean {
  if (expectedLifeKm <= 0) return false;
  return currentKm >= expectedLifeKm * 0.8;
}
