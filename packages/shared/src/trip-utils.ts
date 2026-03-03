/**
 * Trip & Diesel utility functions — shared business logic.
 */

import { DIESEL_THEFT_THRESHOLD } from './constants';

/**
 * Format trip number from sequence.
 * @example formatTripNumber(1) => 'T-000001'
 */
export function formatTripNumber(sequence: number): string {
  return `T-${String(sequence).padStart(6, '0')}`;
}

/**
 * Calculate net profit for a trip.
 * net_profit = total_revenue - all costs
 */
export function calculateNetProfit(costs: {
  total_revenue: number;
  total_diesel_cost: number;
  total_toll_cost: number;
  total_driver_allowance: number;
  total_loading_cost: number;
  total_misc_cost: number;
}): number {
  return (
    costs.total_revenue -
    costs.total_diesel_cost -
    costs.total_toll_cost -
    costs.total_driver_allowance -
    costs.total_loading_cost -
    costs.total_misc_cost
  );
}

/**
 * Detect potential diesel theft by comparing actual km/L against baseline.
 * Returns deviation percentage and whether it's flagged.
 */
export function detectDieselTheft(params: {
  distanceKm: number;
  totalLitres: number;
  baselineKmpl: number;
}): { flagged: boolean; actualKmpl: number; deviationPct: number } {
  const { distanceKm, totalLitres, baselineKmpl } = params;

  if (totalLitres <= 0 || distanceKm <= 0 || baselineKmpl <= 0) {
    return { flagged: false, actualKmpl: 0, deviationPct: 0 };
  }

  const actualKmpl = distanceKm / totalLitres;
  const deviation = (baselineKmpl - actualKmpl) / baselineKmpl;
  const flagged = deviation > DIESEL_THEFT_THRESHOLD;

  return {
    flagged,
    actualKmpl: Math.round(actualKmpl * 100) / 100,
    deviationPct: Math.round(deviation * 1000) / 10,
  };
}

/**
 * Validate odometer reading for diesel fill.
 * Returns true if valid (fill odometer >= vehicle current odometer).
 */
export function validateOdometer(fillOdometer: number, currentOdometer: number): boolean {
  return fillOdometer >= currentOdometer;
}

/**
 * Check if trip has a pre-departure loss (negative net profit).
 * Should show warning modal before allowing departure.
 */
export function isPreDepartureLoss(costs: {
  total_revenue: number;
  total_diesel_cost: number;
  total_toll_cost: number;
  total_driver_allowance: number;
  total_loading_cost: number;
  total_misc_cost: number;
}): boolean {
  return calculateNetProfit(costs) < 0;
}
