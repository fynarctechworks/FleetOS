'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Vehicle } from '@fleetos/shared';
import {
  Plus,
  Loader2,
  ChevronUp,
  ChevronDown,
  Pencil,
} from 'lucide-react';

type SortKey = 'registration_number' | 'vehicle_type' | 'health_score' | 'current_odometer_km';
type SortDir = 'asc' | 'desc';

function healthBadge(score: number) {
  if (score >= 80) return { label: 'Good', cls: 'bg-green-100 text-green-800' };
  if (score >= 50) return { label: 'Fair', cls: 'bg-amber-100 text-amber-800' };
  return { label: 'Poor', cls: 'bg-red-100 text-red-800' };
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('registration_number');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  async function fetchVehicles() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)
      .order(sortKey, { ascending: sortDir === 'asc' });

    if (!error && data) {
      setVehicles(data as Vehicle[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchVehicles();
  }, [sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Vehicles</h2>
        <Link
          href="/dashboard/vehicles/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-text-muted">No vehicles added yet.</p>
          <Link
            href="/dashboard/vehicles/new"
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Add your first vehicle
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-text-muted"
                  onClick={() => toggleSort('registration_number')}
                >
                  Reg. Number <SortIcon col="registration_number" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-text-muted"
                  onClick={() => toggleSort('vehicle_type')}
                >
                  Type <SortIcon col="vehicle_type" />
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">Make / Model</th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-text-muted"
                  onClick={() => toggleSort('current_odometer_km')}
                >
                  Odometer <SortIcon col="current_odometer_km" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-text-muted"
                  onClick={() => toggleSort('health_score')}
                >
                  Health <SortIcon col="health_score" />
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const badge = healthBadge(v.health_score);
                return (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-text-dark">
                      {v.registration_number}
                    </td>
                    <td className="px-4 py-3 capitalize text-text-muted">{v.vehicle_type}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {[v.make, v.model].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {v.current_odometer_km.toLocaleString('en-IN')} km
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                        {v.health_score} — {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/vehicles/${v.id}`}
                        className="rounded p-1.5 text-text-muted hover:bg-gray-100 hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
