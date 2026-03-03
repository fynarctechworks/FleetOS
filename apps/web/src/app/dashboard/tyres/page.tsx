'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { tyreNeedsReplacement } from '@fleetos/shared';
import type { TyrePosition } from '@fleetos/shared';
import { Plus, Loader2, Circle } from 'lucide-react';

type TyreItem = {
  id: string;
  brand: string | null;
  serial_number: string | null;
  position: TyrePosition;
  fitment_date: string;
  odometer_at_fitment: number;
  expected_life_km: number;
  current_km: number;
  is_retreaded: boolean;
  purchase_cost: number | null;
  status: 'active' | 'replaced' | 'retreaded';
  vehicle: { registration_number: string } | null;
};

const POSITION_LABELS: Record<TyrePosition, string> = {
  fl: 'Front Left',
  fr: 'Front Right',
  rl: 'Rear Left',
  rr: 'Rear Right',
  spare: 'Spare',
};

export default function TyreListPage() {
  const [tyres, setTyres] = useState<TyreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [vehicles, setVehicles] = useState<{ id: string; registration_number: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tyresRes, vehiclesRes] = await Promise.all([
      supabase
        .from('tyre_records')
        .select('*, vehicle:vehicle_id(registration_number)')
        .order('fitment_date', { ascending: false }),
      supabase.from('vehicles').select('id, registration_number').eq('is_active', true).order('registration_number'),
    ]);
    if (tyresRes.data) setTyres(tyresRes.data as unknown as TyreItem[]);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = vehicleFilter === 'all'
    ? tyres
    : tyres.filter((t) => t.vehicle?.registration_number === vehicleFilter);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Tyre Inventory</h2>
        <Link
          href="/dashboard/tyres/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Tyre
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.registration_number}>{v.registration_number}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Circle className="mx-auto mb-3 h-12 w-12 text-text-muted" />
          <p className="text-text-muted">No tyres recorded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tyre) => {
            const lifePercent = tyre.expected_life_km > 0
              ? Math.min(100, Math.round((tyre.current_km / tyre.expected_life_km) * 100))
              : 0;
            const needsReplacement = tyreNeedsReplacement(tyre.current_km, tyre.expected_life_km);
            const barColor = needsReplacement ? 'bg-red-500' : lifePercent > 60 ? 'bg-amber-500' : 'bg-green-500';

            return (
              <div
                key={tyre.id}
                className={`rounded-xl border bg-white p-4 ${
                  needsReplacement ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-primary">{tyre.vehicle?.registration_number ?? '—'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tyre.status === 'active' ? 'bg-green-100 text-green-800'
                      : tyre.status === 'replaced' ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {tyre.status}
                  </span>
                </div>

                <p className="text-sm font-medium text-text-dark">{POSITION_LABELS[tyre.position]}</p>
                <p className="text-xs text-text-muted">
                  {tyre.brand ?? 'Unknown brand'} {tyre.serial_number ? `· ${tyre.serial_number}` : ''}
                  {tyre.is_retreaded && ' · Retreaded'}
                </p>

                {/* Life Progress Bar */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-text-muted">{tyre.current_km.toLocaleString('en-IN')} km</span>
                    <span className="text-text-muted">{tyre.expected_life_km.toLocaleString('en-IN')} km</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${lifePercent}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className={needsReplacement ? 'font-bold text-red-600' : 'text-text-muted'}>
                      {lifePercent}% used
                    </span>
                    {needsReplacement && (
                      <span className="font-bold text-red-600">Replace Soon</span>
                    )}
                  </div>
                </div>

                {tyre.purchase_cost && (
                  <p className="mt-2 text-xs text-text-muted">
                    Cost: ₹{tyre.purchase_cost.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
