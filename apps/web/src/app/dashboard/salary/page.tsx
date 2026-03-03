'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { DriverSalaryEntry, SalaryStatus } from '@fleetos/shared';
import { formatSalaryMonth, getCurrentMonth } from '@fleetos/shared';
import { Loader2, Plus, DollarSign, FileText, Check } from 'lucide-react';

type SalaryWithDriver = DriverSalaryEntry & {
  driver: { name: string; phone: string } | null;
};

const STATUS_TABS: { key: SalaryStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<SalaryStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

export default function SalaryPage() {
  const [entries, setEntries] = useState<SalaryWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SalaryStatus | 'all'>('all');
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());

  const fetchSalaries = useCallback(async () => {
    let query = supabase
      .from('driver_salary_entries')
      .select('*, driver:driver_id(name, phone)')
      .eq('month', monthFilter)
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data } = await query;
    setEntries((data as SalaryWithDriver[]) ?? []);
    setLoading(false);
  }, [filter, monthFilter]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  const totalNet = entries.reduce((sum, e) => sum + e.net_salary, 0);
  const draftCount = entries.filter((e) => e.status === 'draft').length;
  const paidCount = entries.filter((e) => e.status === 'paid').length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-dark">Driver Salary</h2>
          <p className="text-sm text-text-muted">Manage salary slips, approvals, and payments</p>
        </div>
        <Link
          href="/dashboard/salary/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Create Salary Entry
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Total Net Salary ({formatSalaryMonth(monthFilter)})
          </p>
          <p className="mt-1 text-2xl font-bold text-text-dark">₹{totalNet.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Pending Approval</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{draftCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Paid</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{paidCount}</p>
        </div>
      </div>

      {/* Month Selector + Status Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => { setLoading(true); setMonthFilter(e.target.value); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setLoading(true); setFilter(tab.key); }}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                filter === tab.key ? 'bg-white text-text-dark shadow-sm' : 'text-text-muted hover:text-text-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <DollarSign className="mx-auto mb-3 h-12 w-12 text-text-muted" />
          <p className="text-text-muted">No salary entries for {formatSalaryMonth(monthFilter)}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Driver</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Fixed Pay</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Allowances</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Deductions</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Net Salary</th>
                <th className="px-4 py-3 text-center font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-dark">{entry.driver?.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{entry.driver?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text-dark">
                    ₹{entry.fixed_pay.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    +₹{entry.trip_allowances.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    -₹{(entry.advances_deducted + entry.other_deductions).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-text-dark">
                    ₹{entry.net_salary.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/salary/${entry.id}`}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-gray-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
