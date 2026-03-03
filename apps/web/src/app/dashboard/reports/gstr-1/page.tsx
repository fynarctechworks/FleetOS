'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { LREntry } from '@fleetos/shared';
import { buildGSTMonthSummary, formatINR, formatSalaryMonth } from '@fleetos/shared';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GSTR1Page() {
  const { appUser } = useAuthStore();
  const [lrs, setLrs] = useState<LREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchLRs = useCallback(async () => {
    if (!appUser?.company_id) return;
    setLoading(true);

    const startDate = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const endDate = new Date(y, m, 0); // last day of month
    const endStr = `${month}-${String(endDate.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('lr_entries')
      .select('*')
      .eq('company_id', appUser.company_id)
      .gte('created_at', startDate)
      .lte('created_at', endStr + 'T23:59:59')
      .order('created_at', { ascending: true });

    setLrs((data as LREntry[]) ?? []);
    setLoading(false);
  }, [appUser?.company_id, month]);

  useEffect(() => {
    fetchLRs();
  }, [fetchLRs]);

  const summary = buildGSTMonthSummary(month, lrs);

  function exportToExcel() {
    const rows = summary.groups.map((g) => ({
      'GST Rate (%)': g.gstRate,
      'No. of Invoices': g.invoiceCount,
      'Taxable Value (₹)': g.taxableValue,
      'CGST (₹)': g.cgst,
      'SGST (₹)': g.sgst,
      'Total GST (₹)': g.gstAmount,
      'Total Invoice Value (₹)': g.totalValue,
    }));

    // Add totals row
    rows.push({
      'GST Rate (%)': 'TOTAL' as unknown as number,
      'No. of Invoices': summary.totalInvoices,
      'Taxable Value (₹)': summary.totalTaxableValue,
      'CGST (₹)': summary.totalCGST,
      'SGST (₹)': summary.totalSGST,
      'Total GST (₹)': summary.totalGST,
      'Total Invoice Value (₹)': summary.totalTaxableValue + summary.totalGST,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GSTR-1');

    // Also add individual LR details sheet
    const lrRows = lrs.map((lr) => ({
      'LR Number': lr.lr_number,
      'Date': lr.created_at.split('T')[0],
      'Origin': lr.origin_city,
      'Destination': lr.destination_city,
      'Freight (₹)': lr.freight_amount,
      'GST Rate (%)': lr.gst_rate,
      'GST Amount (₹)': lr.gst_amount,
      'Total (₹)': lr.total_amount,
    }));
    const ws2 = XLSX.utils.json_to_sheet(lrRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'LR Details');

    XLSX.writeFile(wb, `GSTR-1_${month}.xlsx`);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-bold text-text-dark">GSTR-1 Report</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={exportToExcel}
            disabled={lrs.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Month Header */}
      <div className="mb-6 rounded-xl bg-primary p-4 text-white">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6" />
          <div>
            <h3 className="text-lg font-bold">{formatSalaryMonth(month)}</h3>
            <p className="text-sm text-white/70">
              {summary.totalInvoices} invoices &middot; Taxable: {formatINR(summary.totalTaxableValue)} &middot; GST: {formatINR(summary.totalGST)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Total Invoices</p>
          <p className="mt-1 text-xl font-bold text-text-dark">{summary.totalInvoices}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">Taxable Value</p>
          <p className="mt-1 text-xl font-bold text-text-dark">{formatINR(summary.totalTaxableValue)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">CGST</p>
          <p className="mt-1 text-xl font-bold text-blue-600">{formatINR(summary.totalCGST)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-text-muted">SGST</p>
          <p className="mt-1 text-xl font-bold text-blue-600">{formatINR(summary.totalSGST)}</p>
        </div>
      </div>

      {/* Rate-wise Breakdown Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-text-dark">GST Rate-wise Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-text-muted">
                <th className="px-6 py-3">GST Rate</th>
                <th className="px-6 py-3">Invoices</th>
                <th className="px-6 py-3 text-right">Taxable Value</th>
                <th className="px-6 py-3 text-right">CGST</th>
                <th className="px-6 py-3 text-right">SGST</th>
                <th className="px-6 py-3 text-right">Total GST</th>
                <th className="px-6 py-3 text-right">Invoice Value</th>
              </tr>
            </thead>
            <tbody>
              {summary.groups.map((g) => (
                <tr key={g.gstRate} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-text-dark">{g.gstRate}%</td>
                  <td className="px-6 py-3">{g.invoiceCount}</td>
                  <td className="px-6 py-3 text-right">{formatINR(g.taxableValue)}</td>
                  <td className="px-6 py-3 text-right">{formatINR(g.cgst)}</td>
                  <td className="px-6 py-3 text-right">{formatINR(g.sgst)}</td>
                  <td className="px-6 py-3 text-right font-medium text-blue-600">{formatINR(g.gstAmount)}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatINR(g.totalValue)}</td>
                </tr>
              ))}
              {summary.groups.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-3 text-text-dark">TOTAL</td>
                  <td className="px-6 py-3">{summary.totalInvoices}</td>
                  <td className="px-6 py-3 text-right">{formatINR(summary.totalTaxableValue)}</td>
                  <td className="px-6 py-3 text-right">{formatINR(summary.totalCGST)}</td>
                  <td className="px-6 py-3 text-right">{formatINR(summary.totalSGST)}</td>
                  <td className="px-6 py-3 text-right text-blue-600">{formatINR(summary.totalGST)}</td>
                  <td className="px-6 py-3 text-right">{formatINR(summary.totalTaxableValue + summary.totalGST)}</td>
                </tr>
              )}
              {summary.groups.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    {loading ? 'Loading…' : 'No LR entries for this month'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
