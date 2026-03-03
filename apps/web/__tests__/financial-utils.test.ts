import { describe, it, expect } from 'vitest';
import {
  calculatePLSummary,
  aggregateByRoute,
  aggregateByCustomer,
  aggregateGSTR1,
  buildGSTMonthSummary,
  formatINR,
} from '@fleetos/shared';

// ─── Test Data ───

function makeTrip(overrides: Record<string, unknown> = {}) {
  return {
    status: 'completed',
    origin_city: 'Mumbai',
    destination_city: 'Delhi',
    total_revenue: 50000,
    total_diesel_cost: 15000,
    total_toll_cost: 3000,
    total_driver_allowance: 2000,
    total_loading_cost: 1000,
    total_misc_cost: 500,
    net_profit: 28500,
    ...overrides,
  };
}

function makeLR(overrides: Record<string, unknown> = {}) {
  return {
    consignor_id: 'c1',
    consignor_name: 'ABC Corp',
    freight_amount: 10000,
    gst_rate: 5,
    gst_amount: 500,
    total_amount: 10500,
    created_at: '2026-03-15T10:00:00Z',
    ...overrides,
  };
}

// ─── calculatePLSummary ───

describe('calculatePLSummary', () => {
  it('calculates totals from completed trips', () => {
    const trips = [makeTrip(), makeTrip({ total_revenue: 30000, total_diesel_cost: 10000, net_profit: 13500 })];
    const result = calculatePLSummary(trips);

    expect(result.totalTrips).toBe(2);
    expect(result.completedTrips).toBe(2);
    expect(result.totalRevenue).toBe(80000);
    expect(result.totalDieselCost).toBe(25000);
    expect(result.netProfit).toBe(80000 - 25000 - 6000 - 4000 - 2000 - 1000);
  });

  it('excludes non-completed trips from calculations', () => {
    const trips = [makeTrip(), makeTrip({ status: 'planned' })];
    const result = calculatePLSummary(trips);

    expect(result.totalTrips).toBe(2);
    expect(result.completedTrips).toBe(1);
    expect(result.totalRevenue).toBe(50000);
  });

  it('counts profitable and loss trips', () => {
    const trips = [makeTrip(), makeTrip({ net_profit: -5000 })];
    const result = calculatePLSummary(trips);

    expect(result.profitableTrips).toBe(1);
    expect(result.lossTrips).toBe(1);
  });

  it('calculates profit margin percentage', () => {
    const trips = [makeTrip()];
    const result = calculatePLSummary(trips);

    const expectedMargin = Math.round((result.netProfit / result.totalRevenue) * 1000) / 10;
    expect(result.profitMarginPct).toBe(expectedMargin);
  });

  it('returns 0 margin when no revenue', () => {
    const result = calculatePLSummary([]);
    expect(result.profitMarginPct).toBe(0);
    expect(result.totalRevenue).toBe(0);
  });
});

// ─── aggregateByRoute ───

describe('aggregateByRoute', () => {
  it('groups trips by origin → destination', () => {
    const trips = [
      makeTrip(),
      makeTrip(),
      makeTrip({ origin_city: 'Chennai', destination_city: 'Bangalore' }),
    ];
    const result = aggregateByRoute(trips);

    expect(result.length).toBe(2);
    const mumbaiDelhi = result.find((r) => r.route === 'Mumbai → Delhi');
    expect(mumbaiDelhi?.tripCount).toBe(2);
  });

  it('sorts by net profit descending', () => {
    const trips = [
      makeTrip({ origin_city: 'A', destination_city: 'B', net_profit: 1000, total_revenue: 5000, total_diesel_cost: 4000, total_toll_cost: 0, total_driver_allowance: 0, total_loading_cost: 0, total_misc_cost: 0 }),
      makeTrip({ origin_city: 'C', destination_city: 'D', net_profit: 5000, total_revenue: 10000, total_diesel_cost: 5000, total_toll_cost: 0, total_driver_allowance: 0, total_loading_cost: 0, total_misc_cost: 0 }),
    ];
    const result = aggregateByRoute(trips);

    expect(result[0].route).toBe('C → D');
    expect(result[1].route).toBe('A → B');
  });

  it('calculates avg profit per trip', () => {
    const trips = [makeTrip(), makeTrip()];
    const result = aggregateByRoute(trips);

    expect(result[0].avgProfitPerTrip).toBe(Math.round(result[0].netProfit / 2));
  });

  it('excludes non-completed trips', () => {
    const trips = [makeTrip(), makeTrip({ status: 'in_transit' })];
    const result = aggregateByRoute(trips);

    expect(result[0].tripCount).toBe(1);
  });
});

// ─── aggregateByCustomer ───

describe('aggregateByCustomer', () => {
  it('groups LRs by consignor', () => {
    const lrs = [
      makeLR(),
      makeLR(),
      makeLR({ consignor_id: 'c2', consignor_name: 'XYZ Ltd' }),
    ];
    const result = aggregateByCustomer(lrs);

    expect(result.length).toBe(2);
    const abc = result.find((c) => c.customerName === 'ABC Corp');
    expect(abc?.lrCount).toBe(2);
    expect(abc?.totalFreight).toBe(20000);
  });

  it('sorts by total amount descending', () => {
    const lrs = [
      makeLR({ consignor_id: 'c1', total_amount: 5000 }),
      makeLR({ consignor_id: 'c2', consignor_name: 'Big Corp', total_amount: 50000 }),
    ];
    const result = aggregateByCustomer(lrs);

    expect(result[0].customerName).toBe('Big Corp');
  });

  it('sums freight, GST, and total correctly', () => {
    const lrs = [
      makeLR({ freight_amount: 10000, gst_amount: 500, total_amount: 10500 }),
      makeLR({ freight_amount: 20000, gst_amount: 1000, total_amount: 21000 }),
    ];
    const result = aggregateByCustomer(lrs);

    expect(result[0].totalFreight).toBe(30000);
    expect(result[0].totalGST).toBe(1500);
    expect(result[0].totalAmount).toBe(31500);
  });
});

// ─── aggregateGSTR1 ───

describe('aggregateGSTR1', () => {
  it('groups LRs by GST rate', () => {
    const lrs = [
      makeLR({ gst_rate: 5, gst_amount: 500 }),
      makeLR({ gst_rate: 5, gst_amount: 500 }),
      makeLR({ gst_rate: 18, gst_amount: 1800, freight_amount: 10000 }),
    ];
    const result = aggregateGSTR1(lrs);

    expect(result.length).toBe(2);
    const rate5 = result.find((g) => g.gstRate === 5);
    expect(rate5?.invoiceCount).toBe(2);
    expect(rate5?.taxableValue).toBe(20000);
  });

  it('splits GST into CGST and SGST evenly', () => {
    const lrs = [makeLR({ gst_rate: 18, gst_amount: 1800 })];
    const result = aggregateGSTR1(lrs);

    expect(result[0].cgst).toBe(900);
    expect(result[0].sgst).toBe(900);
  });

  it('sorts by GST rate ascending', () => {
    const lrs = [
      makeLR({ gst_rate: 18, gst_amount: 1800 }),
      makeLR({ gst_rate: 5, gst_amount: 500 }),
      makeLR({ gst_rate: 0, gst_amount: 0 }),
    ];
    const result = aggregateGSTR1(lrs);

    expect(result[0].gstRate).toBe(0);
    expect(result[1].gstRate).toBe(5);
    expect(result[2].gstRate).toBe(18);
  });

  it('calculates total value correctly', () => {
    const lrs = [makeLR({ freight_amount: 10000, gst_amount: 500 })];
    const result = aggregateGSTR1(lrs);

    expect(result[0].totalValue).toBe(10500);
  });
});

// ─── buildGSTMonthSummary ───

describe('buildGSTMonthSummary', () => {
  it('builds monthly summary with correct totals', () => {
    const lrs = [
      makeLR({ gst_rate: 5, freight_amount: 10000, gst_amount: 500 }),
      makeLR({ gst_rate: 18, freight_amount: 20000, gst_amount: 3600 }),
    ];
    const result = buildGSTMonthSummary('2026-03', lrs);

    expect(result.month).toBe('2026-03');
    expect(result.totalInvoices).toBe(2);
    expect(result.totalTaxableValue).toBe(30000);
    expect(result.totalGST).toBe(4100);
    expect(result.totalCGST).toBe(2050);
    expect(result.totalSGST).toBe(2050);
  });

  it('handles empty LR list', () => {
    const result = buildGSTMonthSummary('2026-03', []);

    expect(result.totalInvoices).toBe(0);
    expect(result.totalGST).toBe(0);
    expect(result.groups.length).toBe(0);
  });
});

// ─── formatINR ───

describe('formatINR', () => {
  it('formats positive amounts in Indian style', () => {
    const result = formatINR(123456.78);
    expect(result).toContain('₹');
    expect(result).toContain('23,456.78');
  });

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹0.00');
  });

  it('formats negative amounts', () => {
    const result = formatINR(-5000);
    expect(result).toContain('-');
    expect(result).toContain('5,000.00');
  });

  it('rounds to 2 decimal places', () => {
    const result = formatINR(1234.567);
    expect(result).toContain('1,234.57');
  });
});
