'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { LREntry } from '@fleetos/shared';
import { buildGSTMonthSummary, formatINR, formatSalaryMonth } from '@fleetos/shared';
import { ArrowLeft, FileText } from 'lucide-react';

export default function GSTR3BPage() {
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
    const endDate = new Date(y, m, 0);
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

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-bold text-text-dark">GSTR-3B Summary</h2>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Month Header */}
      <div className="mb-6 rounded-xl bg-blue-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" />
          <div>
            <h3 className="text-lg font-bold">{formatSalaryMonth(month)}</h3>
            <p className="text-sm text-white/70">GSTR-3B Tax Liability Summary</p>
          </div>
        </div>
      </div>

      {/* Section 3.1: Outward Supplies */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-text-dark">
            3.1 — Details of Outward Supplies and Inward Supplies
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-text-muted">
                <th className="px-6 py-3">Nature of Supplies</th>
                <th className="px-6 py-3 text-right">Total Taxable Value</th>
                <th className="px-6 py-3 text-right">CGST</th>
                <th className="px-6 py-3 text-right">SGST</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3 font-medium text-text-dark">
                  (a) Outward taxable supplies (other than zero rated, nil rated, exempted)
                </td>
                <td className="px-6 py-3 text-right">{formatINR(summary.totalTaxableValue)}</td>
                <td className="px-6 py-3 text-right">{formatINR(summary.totalCGST)}</td>
                <td className="px-6 py-3 text-right">{formatINR(summary.totalSGST)}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3 font-medium text-text-dark">
                  (b) Outward taxable supplies (zero rated)
                </td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3 font-medium text-text-dark">
                  (c) Other outward supplies (nil rated, exempted)
                </td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3 font-medium text-text-dark">(d) Inward supplies (reverse charge)</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3 font-medium text-text-dark">(e) Non-GST outward supplies</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-text-muted">—</td>
                <td className="px-6 py-3 text-right text-text-muted">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 6.1: Tax Payable */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-text-dark">6.1 — Payment of Tax</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-text-muted">
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Tax Payable</th>
                <th className="px-6 py-3 text-right">Paid through ITC</th>
                <th className="px-6 py-3 text-right">Paid in Cash</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3 font-medium text-text-dark">Central Tax (CGST)</td>
                <td className="px-6 py-3 text-right font-medium">{formatINR(summary.totalCGST)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right font-medium text-red-600">{formatINR(summary.totalCGST)}</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3 font-medium text-text-dark">State Tax (SGST)</td>
                <td className="px-6 py-3 text-right font-medium">{formatINR(summary.totalSGST)}</td>
                <td className="px-6 py-3 text-right text-text-muted">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right font-medium text-red-600">{formatINR(summary.totalSGST)}</td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-3 text-text-dark">Total Tax Payable</td>
                <td className="px-6 py-3 text-right">{formatINR(summary.totalGST)}</td>
                <td className="px-6 py-3 text-right">{formatINR(0)}</td>
                <td className="px-6 py-3 text-right text-red-600">{formatINR(summary.totalGST)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">Note:</p>
        <p>
          This is an auto-generated summary from FleetOS LR data. Input Tax Credit (ITC) must be
          entered manually from purchase invoices. Consult your CA before filing.
        </p>
      </div>
    </div>
  );
}
