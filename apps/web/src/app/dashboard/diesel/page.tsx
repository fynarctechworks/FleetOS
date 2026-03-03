'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, AlertTriangle, Fuel } from 'lucide-react';

type DieselListItem = {
  id: string;
  litres: number;
  price_per_litre: number;
  total_cost: number;
  station_name: string | null;
  odometer_at_fill: number;
  filled_at: string;
  is_theft_flagged: boolean;
  vehicle: { registration_number: string } | null;
  driver: { name: string } | null;
  trip: { trip_number: string } | null;
};

export default function DieselListPage() {
  const [entries, setEntries] = useState<DieselListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');

  async function fetchEntries() {
    setLoading(true);

    let query = supabase
      .from('diesel_entries')
      .select(
        `id, litres, price_per_litre, total_cost, station_name,
         odometer_at_fill, filled_at, is_theft_flagged,
         vehicle:vehicle_id(registration_number),
         driver:driver_id(name),
         trip:trip_id(trip_number)`
      )
      .order('filled_at', { ascending: false })
      .limit(200);

    if (filter === 'flagged') {
      query = query.eq('is_theft_flagged', true);
    }

    const { data, error } = await query;
    if (!error && data) {
      setEntries(data as unknown as DieselListItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEntries();
  }, [filter]);

  // Monthly totals
  const monthlyTotal = entries.reduce((sum, e) => sum + e.total_cost, 0);
  const monthlyLitres = entries.reduce((sum, e) => sum + e.litres, 0);
  const flaggedCount = entries.filter((e) => e.is_theft_flagged).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Diesel Log</h2>
        <Link
          href="/dashboard/diesel/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Diesel Entry
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            <span className="text-sm text-text-muted">Total Litres</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-text-dark">
            {monthlyLitres.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Total Cost</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-text-dark">
            ₹{monthlyTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-sm text-text-muted">Theft Flags</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">{flaggedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white text-text-muted border border-gray-200'
          }`}
        >
          All Entries
        </button>
        <button
          onClick={() => setFilter('flagged')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
            filter === 'flagged' ? 'bg-red-600 text-white' : 'bg-white text-text-muted border border-gray-200'
          }`}
        >
          Flagged Only ({flaggedCount})
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-text-muted">No diesel entries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Date</th>
                <th className="px-4 py-3 font-medium text-text-muted">Vehicle</th>
                <th className="px-4 py-3 font-medium text-text-muted">Driver</th>
                <th className="px-4 py-3 font-medium text-text-muted">Trip</th>
                <th className="px-4 py-3 font-medium text-text-muted">Litres</th>
                <th className="px-4 py-3 font-medium text-text-muted">Rate</th>
                <th className="px-4 py-3 font-medium text-text-muted">Total</th>
                <th className="px-4 py-3 font-medium text-text-muted">Odometer</th>
                <th className="px-4 py-3 font-medium text-text-muted">Station</th>
                <th className="px-4 py-3 font-medium text-text-muted">Flag</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-gray-100 ${
                    entry.is_theft_flagged ? 'bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(entry.filled_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-text-dark">
                    {entry.vehicle?.registration_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-text-dark">{entry.driver?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">
                    {entry.trip?.trip_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-text-dark">{entry.litres} L</td>
                  <td className="px-4 py-3 text-text-muted">₹{entry.price_per_litre}</td>
                  <td className="px-4 py-3 font-medium text-text-dark">
                    ₹{entry.total_cost.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {entry.odometer_at_fill.toLocaleString('en-IN')} km
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{entry.station_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {entry.is_theft_flagged && (
                      <span title="Theft flagged"><AlertTriangle className="h-4 w-4 text-red-500" /></span>
                    )}
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
