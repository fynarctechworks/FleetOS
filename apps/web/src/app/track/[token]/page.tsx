import { createClient } from '@supabase/supabase-js';
import type { LRStatus } from '@fleetos/shared';
import TrackingMap from './tracking-map';

// This page is fully PUBLIC — no auth required.
// Uses the public RLS policy on lr_entries that allows SELECT by tracking_token.

const ALL_STATUSES: { key: LRStatus; label: string }[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'pod_uploaded', label: 'POD Uploaded' },
  { key: 'billed', label: 'Billed' },
  { key: 'payment_received', label: 'Paid' },
];

async function getLR(token: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('lr_entries')
    .select(`
      lr_number, status, origin_city, destination_city,
      goods_description, weight_kg, total_amount,
      created_at, tracking_token, trip_id
    `)
    .eq('tracking_token', token)
    .maybeSingle();

  if (error || !data) return null;

  // If there's a trip, fetch latest GPS location
  let lastLocation: { latitude: number; longitude: number; recorded_at: string; speed_kmph: number | null } | null = null;
  if (data.trip_id) {
    const { data: locData } = await supabase
      .from('vehicle_locations')
      .select('latitude, longitude, recorded_at, speed_kmph')
      .eq('trip_id', data.trip_id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (locData) {
      // Only show if location is within last 2 hours
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      if (new Date(locData.recorded_at).getTime() > twoHoursAgo) {
        lastLocation = locData;
      }
    }
  }

  return { ...data, lastLocation };
}

export default async function PublicTrackingPage({
  params,
}: {
  params: { token: string };
}) {
  const lr = await getLR(params.token);

  if (!lr) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Shipment Not Found</h1>
          <p className="text-gray-500">
            The tracking link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = ALL_STATUSES.findIndex((s) => s.key === lr.status);
  const createdDate = new Date(lr.created_at);
  const estimatedDelivery = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A3C6E] px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded bg-[#F97316] px-2 py-1">
                <span className="text-sm font-bold text-white">FleetOS</span>
              </div>
              <span className="text-sm text-white/70">Shipment Tracking</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* LR Number */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
            LR Number
          </p>
          <h1 className="mb-3 font-mono text-3xl font-bold text-[#1A3C6E]">
            {lr.lr_number}
          </h1>
          <p className="text-sm text-gray-600">
            {lr.origin_city} → {lr.destination_city}
          </p>
        </div>

        {/* Live Map (if GPS data available) */}
        {lr.lastLocation && (
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-gray-700">Live Location</h2>
              <span className="ml-auto text-xs text-gray-400">
                Updated {new Date(lr.lastLocation.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <TrackingMap
              latitude={lr.lastLocation.latitude}
              longitude={lr.lastLocation.longitude}
              originCity={lr.origin_city}
              destinationCity={lr.destination_city}
            />
          </div>
        )}

        {/* Status Timeline */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Shipment Status</h2>
          <div className="space-y-3">
            {ALL_STATUSES.map((status, idx) => {
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={status.key} className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-gray-300 text-gray-400'
                    } ${isCurrent ? 'ring-2 ring-green-200' : ''}`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      isCurrent
                        ? 'font-bold text-green-700'
                        : isCompleted
                        ? 'font-medium text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipment Details */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Shipment Details</h2>
          <dl className="space-y-2 text-sm">
            {lr.goods_description && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Goods</dt>
                <dd className="font-medium text-gray-900">{lr.goods_description}</dd>
              </div>
            )}
            {lr.weight_kg && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Weight</dt>
                <dd className="font-medium text-gray-900">{lr.weight_kg} kg</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-medium text-gray-900">
                ₹{lr.total_amount.toLocaleString('en-IN')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Booked On</dt>
              <dd className="font-medium text-gray-900">
                {createdDate.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Est. Delivery</dt>
              <dd className="font-medium text-gray-900">
                {estimatedDelivery.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Powered by FleetOS — Transport Management System
        </p>
      </main>
    </div>
  );
}
