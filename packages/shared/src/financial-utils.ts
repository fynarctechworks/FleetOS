/**
 * Financial report utility functions for FleetOS.
 * Used by P&L reports, GSTR-1/3B exports, and monthly summaries.
 */

export interface PLSummary {
  totalTrips: number;
  completedTrips: number;
  totalRevenue: number;
  totalDieselCost: number;
  totalTollCost: number;
  totalDriverAllowance: number;
  totalLoadingCost: number;
  totalMiscCost: number;
  totalCosts: number;
  netProfit: number;
  profitableTrips: number;
  lossTrips: number;
  profitMarginPct: number;
}

export interface RoutePL {
  route: string;
  tripCount: number;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  avgProfitPerTrip: number;
}

export interface CustomerPL {
  customerId: string;
  customerName: string;
  lrCount: number;
  totalFreight: number;
  totalGST: number;
  totalAmount: number;
}

export interface GSTRateGroup {
  gstRate: number;
  invoiceCount: number;
  taxableValue: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  totalValue: number;
}

export interface GSTMonthSummary {
  month: string;
  groups: GSTRateGroup[];
  totalTaxableValue: number;
  totalGST: number;
  totalCGST: number;
  totalSGST: number;
  totalInvoices: number;
}

interface TripLike {
  status: string;
  origin_city: string;
  destination_city: string;
  total_revenue: number;
  total_diesel_cost: number;
  total_toll_cost: number;
  total_driver_allowance: number;
  total_loading_cost: number;
  total_misc_cost: number;
  net_profit: number;
}

interface LRLike {
  consignor_id: string;
  freight_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  created_at: string;
}

/**
 * Calculate P&L summary from a list of trips.
 */
export function calculatePLSummary(trips: TripLike[]): PLSummary {
  const completed = trips.filter((t) => t.status === 'completed');

  const totalRevenue = completed.reduce((s, t) => s + t.total_revenue, 0);
  const totalDieselCost = completed.reduce((s, t) => s + t.total_diesel_cost, 0);
  const totalTollCost = completed.reduce((s, t) => s + t.total_toll_cost, 0);
  const totalDriverAllowance = completed.reduce((s, t) => s + t.total_driver_allowance, 0);
  const totalLoadingCost = completed.reduce((s, t) => s + t.total_loading_cost, 0);
  const totalMiscCost = completed.reduce((s, t) => s + t.total_misc_cost, 0);
  const totalCosts = totalDieselCost + totalTollCost + totalDriverAllowance + totalLoadingCost + totalMiscCost;
  const netProfit = totalRevenue - totalCosts;

  return {
    totalTrips: trips.length,
    completedTrips: completed.length,
    totalRevenue,
    totalDieselCost,
    totalTollCost,
    totalDriverAllowance,
    totalLoadingCost,
    totalMiscCost,
    totalCosts,
    netProfit,
    profitableTrips: completed.filter((t) => t.net_profit >= 0).length,
    lossTrips: completed.filter((t) => t.net_profit < 0).length,
    profitMarginPct: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0,
  };
}

/**
 * Aggregate trips by route (origin → destination).
 */
export function aggregateByRoute(trips: TripLike[]): RoutePL[] {
  const map = new Map<string, TripLike[]>();

  for (const t of trips.filter((t) => t.status === 'completed')) {
    const route = `${t.origin_city} → ${t.destination_city}`;
    const existing = map.get(route) ?? [];
    existing.push(t);
    map.set(route, existing);
  }

  return Array.from(map.entries())
    .map(([route, routeTrips]) => {
      const totalRevenue = routeTrips.reduce((s, t) => s + t.total_revenue, 0);
      const totalCosts = routeTrips.reduce(
        (s, t) =>
          s + t.total_diesel_cost + t.total_toll_cost + t.total_driver_allowance + t.total_loading_cost + t.total_misc_cost,
        0
      );
      const netProfit = totalRevenue - totalCosts;
      return {
        route,
        tripCount: routeTrips.length,
        totalRevenue,
        totalCosts,
        netProfit,
        avgProfitPerTrip: routeTrips.length > 0 ? Math.round(netProfit / routeTrips.length) : 0,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

/**
 * Aggregate LRs by consignor for customer profitability.
 */
export function aggregateByCustomer(
  lrs: (LRLike & { consignor_name?: string })[]
): CustomerPL[] {
  const map = new Map<string, { name: string; lrs: LRLike[] }>();

  for (const lr of lrs) {
    const existing = map.get(lr.consignor_id);
    if (existing) {
      existing.lrs.push(lr);
    } else {
      map.set(lr.consignor_id, {
        name: lr.consignor_name ?? lr.consignor_id,
        lrs: [lr],
      });
    }
  }

  return Array.from(map.entries())
    .map(([customerId, { name, lrs: customerLrs }]) => ({
      customerId,
      customerName: name,
      lrCount: customerLrs.length,
      totalFreight: customerLrs.reduce((s, l) => s + l.freight_amount, 0),
      totalGST: customerLrs.reduce((s, l) => s + l.gst_amount, 0),
      totalAmount: customerLrs.reduce((s, l) => s + l.total_amount, 0),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Aggregate LRs into GSTR-1 format grouped by GST rate.
 */
export function aggregateGSTR1(lrs: LRLike[]): GSTRateGroup[] {
  const map = new Map<number, LRLike[]>();

  for (const lr of lrs) {
    const existing = map.get(lr.gst_rate) ?? [];
    existing.push(lr);
    map.set(lr.gst_rate, existing);
  }

  return Array.from(map.entries())
    .map(([gstRate, rateLrs]) => {
      const taxableValue = rateLrs.reduce((s, l) => s + l.freight_amount, 0);
      const gstAmount = rateLrs.reduce((s, l) => s + l.gst_amount, 0);
      return {
        gstRate,
        invoiceCount: rateLrs.length,
        taxableValue,
        gstAmount,
        cgst: Math.round((gstAmount / 2) * 100) / 100,
        sgst: Math.round((gstAmount / 2) * 100) / 100,
        totalValue: taxableValue + gstAmount,
      };
    })
    .sort((a, b) => a.gstRate - b.gstRate);
}

/**
 * Build monthly GSTR-1 summary from LRs.
 */
export function buildGSTMonthSummary(month: string, lrs: LRLike[]): GSTMonthSummary {
  const groups = aggregateGSTR1(lrs);

  return {
    month,
    groups,
    totalTaxableValue: groups.reduce((s, g) => s + g.taxableValue, 0),
    totalGST: groups.reduce((s, g) => s + g.gstAmount, 0),
    totalCGST: groups.reduce((s, g) => s + g.cgst, 0),
    totalSGST: groups.reduce((s, g) => s + g.sgst, 0),
    totalInvoices: groups.reduce((s, g) => s + g.invoiceCount, 0),
  };
}

/**
 * Format currency in Indian style (₹1,23,456.00).
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
