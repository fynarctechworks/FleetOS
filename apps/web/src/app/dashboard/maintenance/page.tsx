'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { ServiceType } from '@fleetos/shared';
import { Plus, Loader2, Wrench } from 'lucide-react';

type MaintenanceItem = {
  id: string;
  service_type: ServiceType;
  description: string | null;
  cost: number;
  odometer_at_service: number;
  next_service_km: number | null;
  next_service_date: string | null;
  workshop_name: string | null;
  serviced_at: string;
  vehicle: { registration_number: string } | null;
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  oil_change: 'Oil Change',
  brake: 'Brake Service',
  clutch: 'Clutch Repair',
  battery: 'Battery',
  tyre: 'Tyre Service',
  electrical: 'Electrical',
  body: 'Body Work',
  other: 'Other',
};

export default function MaintenanceListPage() {
  const [records, setRecords] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [vehicles, setVehicles] = useState<{ id: string; registration_number: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recordsRes, vehiclesRes] = await Promise.all([
      supabase
        .from('maintenance_records')
        .select(`id, service_type, description, cost, odometer_at_service,
          next_service_km, next_service_date, workshop_name, serviced_at,
          vehicle:vehicle_id(registration_number)`)
        .order('serviced_at', { ascending: false })
        .limit(200),
      supabase.from('vehicles').select('id, registration_number').eq('is_active', true).order('registration_number'),
    ]);
    if (recordsRes.data) setRecords(recordsRes.data as unknown as MaintenanceItem[]);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = vehicleFilter === 'all'
    ? records
    : records.filter((r) => r.vehicle?.registration_number === vehicleFilter);

  const totalCost = filtered.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Maintenance Log</h2>
        <Link
          href="/dashboard/maintenance/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Service Entry
        </Link>
      </div>

      {/* Vehicle Filter + Total */}
      <div className="mb-4 flex items-center justify-between">
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
        <span className="text-sm text-text-muted">
          Total: <strong className="text-text-dark">₹{totalCost.toLocaleString('en-IN')}</strong> ({filtered.length} records)
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Wrench className="mx-auto mb-3 h-12 w-12 text-text-muted" />
          <p className="text-text-muted">No maintenance records found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Date</th>
                <th className="px-4 py-3 font-medium text-text-muted">Vehicle</th>
                <th className="px-4 py-3 font-medium text-text-muted">Service Type</th>
                <th className="px-4 py-3 font-medium text-text-muted">Description</th>
                <th className="px-4 py-3 font-medium text-text-muted">Cost</th>
                <th className="px-4 py-3 font-medium text-text-muted">Odometer</th>
                <th className="px-4 py-3 font-medium text-text-muted">Next Service</th>
                <th className="px-4 py-3 font-medium text-text-muted">Workshop</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(r.serviced_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">{r.vehicle?.registration_number ?? '—'}</td>
                  <td className="px-4 py-3 text-text-dark">{SERVICE_LABELS[r.service_type]}</td>
                  <td className="px-4 py-3 text-text-muted max-w-[200px] truncate">{r.description ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-text-dark">₹{r.cost.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{r.odometer_at_service.toLocaleString('en-IN')} km</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {r.next_service_date
                      ? new Date(r.next_service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : r.next_service_km
                      ? `${r.next_service_km.toLocaleString('en-IN')} km`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{r.workshop_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
