'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { TripStatus } from '@fleetos/shared';
import { Plus, Loader2, Eye } from 'lucide-react';

type TripListItem = {
  id: string;
  trip_number: string;
  status: TripStatus;
  origin_city: string;
  destination_city: string;
  planned_departure: string;
  net_profit: number;
  is_loss_flagged: boolean;
  created_at: string;
  vehicle: { registration_number: string } | null;
  driver: { name: string } | null;
};

const STATUS_TABS: { label: string; value: TripStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Planned', value: 'planned' },
  { label: 'Departed', value: 'departed' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Arrived', value: 'arrived' },
  { label: 'Completed', value: 'completed' },
];

const STATUS_BADGE: Record<TripStatus, string> = {
  planned: 'bg-blue-100 text-blue-800',
  departed: 'bg-sky-100 text-sky-800',
  in_transit: 'bg-amber-100 text-amber-800',
  arrived: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<TripStatus, string> = {
  planned: 'Planned',
  departed: 'Departed',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TripListPage() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TripStatus | 'all'>('all');

  async function fetchTrips(status: TripStatus | 'all') {
    setLoading(true);

    let query = supabase
      .from('trips')
      .select(
        `id, trip_number, status, origin_city, destination_city,
         planned_departure, net_profit, is_loss_flagged, created_at,
         vehicle:vehicle_id(registration_number),
         driver:driver_id(name)`
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTrips(data as unknown as TripListItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTrips(activeTab);
  }, [activeTab]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Trips</h2>
        <Link
          href="/dashboard/trips/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Create Trip
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-white'
                : 'text-text-muted hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-text-muted">
            {activeTab === 'all' ? 'No trips created yet.' : `No trips with status "${activeTab}".`}
          </p>
          <Link
            href="/dashboard/trips/new"
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Create your first trip
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Trip #</th>
                <th className="px-4 py-3 font-medium text-text-muted">Vehicle</th>
                <th className="px-4 py-3 font-medium text-text-muted">Driver</th>
                <th className="px-4 py-3 font-medium text-text-muted">Route</th>
                <th className="px-4 py-3 font-medium text-text-muted">Departure</th>
                <th className="px-4 py-3 font-medium text-text-muted">P&L</th>
                <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-text-muted">View</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-primary">{trip.trip_number}</td>
                  <td className="px-4 py-3 text-text-dark">{trip.vehicle?.registration_number ?? '—'}</td>
                  <td className="px-4 py-3 text-text-dark">{trip.driver?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {trip.origin_city} → {trip.destination_city}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(trip.planned_departure).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        trip.net_profit < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {trip.net_profit < 0 ? '-' : '+'}₹{Math.abs(trip.net_profit).toLocaleString('en-IN')}
                    </span>
                    {trip.is_loss_flagged && (
                      <span className="ml-1 text-xs text-red-500" title="Loss flagged">!</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[trip.status]
                      }`}
                    >
                      {STATUS_LABEL[trip.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/trips/${trip.id}`}
                      className="rounded p-1.5 text-text-muted hover:bg-gray-100 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
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
