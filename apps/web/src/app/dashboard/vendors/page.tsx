'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Vendor } from '@fleetos/shared';
import { Loader2, Plus, Truck, Phone, MapPin, DollarSign } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const fetchVendors = useCallback(async () => {
    let query = supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'active') query = query.eq('is_active', true);
    if (filter === 'inactive') query = query.eq('is_active', false);

    const { data } = await query;
    setVendors((data as Vendor[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const totalDue = vendors.reduce((sum, v) => sum + v.balance_due, 0);
  const withBalance = vendors.filter((v) => v.balance_due > 0).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-dark">Vendors</h2>
          <p className="text-sm text-text-muted">Manage attached vehicle vendors and payments</p>
        </div>
        <Link
          href="/dashboard/vendors/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Total Vendors</p>
          <p className="mt-1 text-2xl font-bold text-text-dark">{vendors.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Vendors with Balance Due</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{withBalance}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Total Balance Due</p>
          <p className="mt-1 text-2xl font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['active', 'all', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setLoading(true); setFilter(f); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${
              filter === f ? 'bg-white text-text-dark shadow-sm' : 'text-text-muted hover:text-text-dark'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <Truck className="mx-auto mb-3 h-12 w-12 text-text-muted" />
          <p className="text-text-muted">No vendors yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Route</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Rate</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Balance Due</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-text-dark">{v.name}</td>
                  <td className="px-4 py-3 text-text-muted">{v.phone || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {v.vehicle_number ? (
                      <span className="font-mono text-xs">{v.vehicle_number}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{v.route_specialisation || '—'}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {v.rate_per_km ? `₹${v.rate_per_km}/km` : v.rate_per_trip ? `₹${v.rate_per_trip}/trip` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${v.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{v.balance_due.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/vendors/${v.id}`}
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
