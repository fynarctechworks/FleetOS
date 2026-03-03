'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { Trip, LREntry } from '@fleetos/shared';
import { calculatePLSummary, aggregateByRoute, aggregateByCustomer, formatINR } from '@fleetos/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Truck,
  FileSpreadsheet,
  FileText,
  Download,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { pdf } from '@react-pdf/renderer';
import { PLReportPDF } from '@/components/pl-report-pdf';

export default function ReportsPage() {
  const { appUser } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [lrs, setLrs] = useState<(LREntry & { consignor_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'routes' | 'customers'>('routes');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: start.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    };
  });

  const fetchTrips = useCallback(async () => {
    if (!appUser?.company_id) return;
    setLoading(true);

    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('company_id', appUser.company_id)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to + 'T23:59:59')
      .order('created_at', { ascending: false });

    setTrips((data as Trip[]) ?? []);

    // Also fetch LRs with consignor names for customer profitability
    const { data: lrData } = await supabase
      .from('lr_entries')
      .select('*, consignor:consignor_id(name)')
      .eq('company_id', appUser.company_id)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to + 'T23:59:59');

    const mapped = (lrData ?? []).map((lr: LREntry & { consignor: { name: string } | null }) => ({
      ...lr,
      consignor_name: lr.consignor?.name ?? 'Unknown',
    }));
    setLrs(mapped);
    setLoading(false);
  }, [appUser?.company_id, dateRange]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const summary = calculatePLSummary(trips);
  const routeData = aggregateByRoute(trips);
  const customerData = aggregateByCustomer(lrs);
  const chartData = routeData.slice(0, 10).map((r) => ({
    route: r.route.length > 20 ? r.route.slice(0, 18) + '…' : r.route,
    Revenue: r.totalRevenue,
    Costs: r.totalCosts,
    Profit: r.netProfit,
  }));

  async function exportPDF() {
    const blob = await pdf(
      <PLReportPDF
        summary={summary}
        routes={routeData}
        dateRange={`${dateRange.from} to ${dateRange.to}`}
        companyName={appUser?.name ?? 'FleetOS'}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PL_Report_${dateRange.from}_${dateRange.to}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const routeRows = routeData.map((r) => ({
      Route: r.route,
      Trips: r.tripCount,
      'Revenue (₹)': r.totalRevenue,
      'Costs (₹)': r.totalCosts,
      'Net Profit (₹)': r.netProfit,
      'Avg Profit/Trip (₹)': r.avgProfitPerTrip,
    }));

    const customerRows = customerData.map((c) => ({
      Customer: c.customerName,
      'LR Count': c.lrCount,
      'Freight (₹)': c.totalFreight,
      'GST (₹)': c.totalGST,
      'Total (₹)': c.totalAmount,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(routeRows), 'Routes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerRows), 'Customers');
    XLSX.writeFile(wb, `PL_Report_${dateRange.from}_${dateRange.to}.xlsx`);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-dark">P&L Reports</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <span className="text-text-muted">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <Link
            href="/dashboard/reports/gstr-1"
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            GSTR-1
          </Link>
          <Link
            href="/dashboard/reports/gstr-3b"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            GSTR-3B
          </Link>
          <button
            onClick={exportExcel}
            disabled={trips.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text-dark hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={trips.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text-dark hover:bg-gray-50 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Total Revenue</p>
          <p className="mt-1 text-xl font-bold text-text-dark">{formatINR(summary.totalRevenue)}</p>
          <p className="mt-1 text-xs text-text-muted">{summary.completedTrips} completed trips</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Total Costs</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatINR(summary.totalCosts)}</p>
          <p className="mt-1 text-xs text-text-muted">
            Diesel: {formatINR(summary.totalDieselCost)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Net Profit</p>
          <p
            className={`mt-1 text-xl font-bold ${
              summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatINR(summary.netProfit)}
          </p>
          <p className="mt-1 text-xs text-text-muted">Margin: {summary.profitMarginPct}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Trip Outcomes</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-bold">{summary.profitableTrips}</span>
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span className="text-lg font-bold">{summary.lossTrips}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Revenue vs Costs by Route</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="route" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatINR(value)}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
              />
              <Legend />
              <Bar dataKey="Revenue" fill="#1A3C6E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Costs" fill="#DC2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'routes'
              ? 'bg-primary text-white'
              : 'bg-white text-text-muted border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Truck className="h-4 w-4" />
          Route Profitability
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'customers'
              ? 'bg-primary text-white'
              : 'bg-white text-text-muted border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Users className="h-4 w-4" />
          Customer Profitability
        </button>
      </div>

      {/* Route Profitability Table */}
      {activeTab === 'routes' && (
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-text-dark">Route Profitability Ranking</h3>
          <span className="text-xs text-text-muted">{routeData.length} routes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-text-muted">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Route</th>
                <th className="px-6 py-3">Trips</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">Costs</th>
                <th className="px-6 py-3 text-right">Net Profit</th>
                <th className="px-6 py-3 text-right">Avg/Trip</th>
              </tr>
            </thead>
            <tbody>
              {routeData.map((r, i) => (
                <tr key={r.route} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 text-text-muted">{i + 1}</td>
                  <td className="px-6 py-3 font-medium text-text-dark">
                    <span className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-text-muted" />
                      {r.route}
                    </span>
                  </td>
                  <td className="px-6 py-3">{r.tripCount}</td>
                  <td className="px-6 py-3 text-right">{formatINR(r.totalRevenue)}</td>
                  <td className="px-6 py-3 text-right text-red-600">{formatINR(r.totalCosts)}</td>
                  <td
                    className={`px-6 py-3 text-right font-medium ${
                      r.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatINR(r.netProfit)}
                  </td>
                  <td
                    className={`px-6 py-3 text-right ${
                      r.avgProfitPerTrip >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatINR(r.avgProfitPerTrip)}
                  </td>
                </tr>
              ))}
              {routeData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    {loading ? 'Loading…' : 'No completed trips in this date range'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Customer Profitability Table */}
      {activeTab === 'customers' && (
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-text-dark">Customer Profitability Ranking</h3>
          <span className="text-xs text-text-muted">{customerData.length} customers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-text-muted">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">LRs</th>
                <th className="px-6 py-3 text-right">Freight</th>
                <th className="px-6 py-3 text-right">GST</th>
                <th className="px-6 py-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {customerData.map((c, i) => (
                <tr key={c.customerId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 text-text-muted">{i + 1}</td>
                  <td className="px-6 py-3 font-medium text-text-dark">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-text-muted" />
                      {c.customerName}
                    </span>
                  </td>
                  <td className="px-6 py-3">{c.lrCount}</td>
                  <td className="px-6 py-3 text-right">{formatINR(c.totalFreight)}</td>
                  <td className="px-6 py-3 text-right text-blue-600">{formatINR(c.totalGST)}</td>
                  <td className="px-6 py-3 text-right font-medium text-text-dark">{formatINR(c.totalAmount)}</td>
                </tr>
              ))}
              {customerData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    {loading ? 'Loading…' : 'No LR entries in this date range'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
