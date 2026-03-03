/**
 * Salary utility functions for FleetOS.
 */

/**
 * Calculate net salary from components.
 * net_salary = fixed_pay + trip_allowances - advances_deducted - other_deductions
 */
export function calculateNetSalary(params: {
  fixed_pay: number;
  trip_allowances: number;
  advances_deducted: number;
  other_deductions: number;
}): number {
  return (
    params.fixed_pay +
    params.trip_allowances -
    params.advances_deducted -
    params.other_deductions
  );
}

/**
 * Format month string (YYYY-MM) to readable format.
 * e.g., "2026-03" → "March 2026"
 */
export function formatSalaryMonth(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Get the current month in YYYY-MM format.
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calculate total trip allowances for a driver in a given month.
 * Sums up driver_allowance from all completed trips in that month.
 */
export function sumTripAllowances(
  trips: Array<{ total_driver_allowance: number; status: string }>
): number {
  return trips
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.total_driver_allowance || 0), 0);
}
