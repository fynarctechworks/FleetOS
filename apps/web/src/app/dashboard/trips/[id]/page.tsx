'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { calculateNetProfit, isPreDepartureLoss } from '@fleetos/shared';
import type { Trip, LREntry, DieselEntry, TripStatus } from '@fleetos/shared';
import {
  ArrowLeft, Loader2, Truck, User, MapPin, Clock,
  DollarSign, Fuel, AlertTriangle, CheckCircle2, X,
} from 'lucide-react';

const STATUS_FLOW: TripStatus[] = ['planned', 'departed', 'in_transit', 'arrived', 'completed'];

const STATUS_LABEL: Record<TripStatus, string> = {
  planned: 'Planned',
  departed: 'Departed',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<TripStatus, string> = {
  planned: 'bg-blue-500',
  departed: 'bg-sky-500',
  in_transit: 'bg-amber-500',
  arrived: 'bg-teal-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

type TripWithRelations = Trip & {
  vehicle: { registration_number: string; baseline_mileage_kmpl: number } | null;
  driver: { name: string; phone: string } | null;
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TripWithRelations | null>(null);
  const [linkedLRs, setLinkedLRs] = useState<LREntry[]>([]);
  const [dieselEntries, setDieselEntries] = useState<DieselEntry[]>([]);
  const [unlinkedLRs, setUnlinkedLRs] = useState<LREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TripStatus | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [odometerEnd, setOdometerEnd] = useState('');
  const [serverError, setServerError] = useState('');

  // Cost fields state (auto-save on blur)
  const [costs, setCosts] = useState({
    total_toll_cost: 0,
    total_driver_allowance: 0,
    total_loading_cost: 0,
    total_misc_cost: 0,
  });

  const fetchTrip = useCallback(async () => {
    const [tripRes, lrRes, dieselRes, unlinkedRes] = await Promise.all([
      supabase
        .from('trips')
        .select(`*, vehicle:vehicle_id(registration_number, baseline_mileage_kmpl), driver:driver_id(name, phone)`)
        .eq('id', id)
        .single(),
      supabase
        .from('lr_entries')
        .select('*')
        .eq('trip_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('diesel_entries')
        .select('*')
        .eq('trip_id', id)
        .order('filled_at', { ascending: false }),
      supabase
        .from('lr_entries')
        .select('id, lr_number, origin_city, destination_city, total_amount')
        .is('trip_id', null)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (tripRes.data) {
      const t = tripRes.data as unknown as TripWithRelations;
      setTrip(t);
      setCosts({
        total_toll_cost: t.total_toll_cost,
        total_driver_allowance: t.total_driver_allowance,
        total_loading_cost: t.total_loading_cost,
        total_misc_cost: t.total_misc_cost,
      });
    }
    if (lrRes.data) setLinkedLRs(lrRes.data as LREntry[]);
    if (dieselRes.data) setDieselEntries(dieselRes.data as DieselEntry[]);
    if (unlinkedRes.data) setUnlinkedLRs(unlinkedRes.data as unknown as LREntry[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  // Auto-save cost on blur
  async function saveCostField(field: keyof typeof costs, value: number) {
    if (!trip) return;
    setCosts((prev) => ({ ...prev, [field]: value }));

    const updatedCosts = { ...costs, [field]: value };
    const totalRevenue = linkedLRs.reduce((sum, lr) => sum + lr.total_amount, 0);
    const totalDiesel = dieselEntries.reduce((sum, d) => sum + d.total_cost, 0);

    const netProfit = calculateNetProfit({
      total_revenue: totalRevenue,
      total_diesel_cost: totalDiesel,
      ...updatedCosts,
    });

    await supabase
      .from('trips')
      .update({
        [field]: value,
        net_profit: netProfit,
        total_revenue: totalRevenue,
        total_diesel_cost: totalDiesel,
        is_loss_flagged: netProfit < 0,
      })
      .eq('id', id);

    setTrip((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
            net_profit: netProfit,
            total_revenue: totalRevenue,
            total_diesel_cost: totalDiesel,
            is_loss_flagged: netProfit < 0,
          }
        : prev
    );
  }

  // Link LR to trip
  async function linkLR(lrId: string) {
    await supabase.from('lr_entries').update({ trip_id: id }).eq('id', lrId);
    fetchTrip();
  }

  // Unlink LR from trip
  async function unlinkLR(lrId: string) {
    await supabase.from('lr_entries').update({ trip_id: null }).eq('id', lrId);
    fetchTrip();
  }

  // Status update with pre-departure loss check
  async function handleStatusChange(newStatus: TripStatus) {
    if (!trip) return;

    // If departing and there's a loss, show warning
    if (newStatus === 'departed') {
      const totalRevenue = linkedLRs.reduce((sum, lr) => sum + lr.total_amount, 0);
      const totalDiesel = dieselEntries.reduce((sum, d) => sum + d.total_cost, 0);
      if (
        isPreDepartureLoss({
          total_revenue: totalRevenue,
          total_diesel_cost: totalDiesel,
          ...costs,
        })
      ) {
        setPendingStatus(newStatus);
        setShowLossModal(true);
        return;
      }
    }

    // If completing, prompt for odometer_end
    if (newStatus === 'completed') {
      setShowCompleteModal(true);
      return;
    }

    await updateStatus(newStatus);
  }

  async function updateStatus(newStatus: TripStatus, extraFields?: Record<string, unknown>) {
    setSaving(true);
    setServerError('');

    const updates: Record<string, unknown> = { status: newStatus, ...extraFields };
    if (newStatus === 'departed') updates.actual_departure = new Date().toISOString();
    if (newStatus === 'arrived') updates.actual_arrival = new Date().toISOString();
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();

    const { error } = await supabase.from('trips').update(updates).eq('id', id);

    if (error) {
      setServerError(error.message);
    } else {
      // If completed, trigger P&L calculation via Edge Function
      if (newStatus === 'completed') {
        await supabase.functions.invoke('calculate-trip-pl', {
          body: { trip_id: id },
        });
        // Trigger diesel theft detection for each diesel entry
        for (const entry of dieselEntries) {
          await supabase.functions.invoke('detect-diesel-theft', {
            body: { diesel_entry_id: entry.id },
          });
        }
      }
      fetchTrip();
    }
    setSaving(false);
    setShowLossModal(false);
    setShowCompleteModal(false);
  }

  async function handleComplete() {
    const odoEnd = Number(odometerEnd);
    if (!odoEnd || odoEnd <= (trip?.odometer_start ?? 0)) {
      setServerError('Odometer end must be greater than odometer start');
      return;
    }
    await updateStatus('completed', { odometer_end: odoEnd });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-6 text-center text-text-muted">Trip not found.</div>
    );
  }

  const totalRevenue = linkedLRs.reduce((sum, lr) => sum + lr.total_amount, 0);
  const totalDiesel = dieselEntries.reduce((sum, d) => sum + d.total_cost, 0);
  const currentStatusIdx = STATUS_FLOW.indexOf(trip.status);
  const nextStatus = currentStatusIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStatusIdx + 1] : null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/trips" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-text-dark font-mono">{trip.trip_number}</h2>
            <p className="text-sm text-text-muted">
              {trip.origin_city} → {trip.destination_city}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/trips/${id}/route`}
            className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <MapPin className="h-4 w-4" />
            View Route
          </Link>
          {nextStatus && trip.status !== 'cancelled' && (
            <button
              onClick={() => handleStatusChange(nextStatus)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Mark as {STATUS_LABEL[nextStatus]}
            </button>
          )}
        </div>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
      )}

      {/* Status Timeline */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          {STATUS_FLOW.map((s, i) => {
            const isActive = i <= currentStatusIdx;
            const isCurrent = s === trip.status;
            return (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                      isActive ? STATUS_COLOR[s] : 'bg-gray-300'
                    } ${isCurrent ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  >
                    {isActive ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`mt-1 text-xs ${isCurrent ? 'font-semibold text-text-dark' : 'text-text-muted'}`}>
                    {STATUS_LABEL[s]}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-12 sm:w-20 ${
                      i < currentStatusIdx ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Trip info + costs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Trip Info Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <Truck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-text-muted">Vehicle</p>
                <p className="font-medium text-text-dark">{trip.vehicle?.registration_number ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <User className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-text-muted">Driver</p>
                <p className="font-medium text-text-dark">{trip.driver?.name ?? '—'}</p>
                <p className="text-xs text-text-muted">{trip.driver?.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <MapPin className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-text-muted">Odometer</p>
                <p className="font-medium text-text-dark">
                  Start: {trip.odometer_start.toLocaleString('en-IN')} km
                </p>
                {trip.odometer_end && (
                  <p className="text-xs text-text-muted">
                    End: {trip.odometer_end.toLocaleString('en-IN')} km ({(trip.odometer_end - trip.odometer_start).toLocaleString('en-IN')} km)
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <Clock className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-text-muted">Planned Departure</p>
                <p className="font-medium text-text-dark">
                  {new Date(trip.planned_departure).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {trip.actual_departure && (
                  <p className="text-xs text-text-muted">
                    Actual: {new Date(trip.actual_departure).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stopovers */}
          {trip.stopovers && trip.stopovers.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-3 text-base font-semibold text-text-dark">Stopovers</h3>
              <div className="space-y-2">
                {trip.stopovers.map((stop, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                      {i + 1}
                    </span>
                    <span className="font-medium text-text-dark">{stop.city}</span>
                    <span className="text-text-muted">
                      ETA: {new Date(stop.expected_arrival).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Entry (auto-save on blur) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-base font-semibold text-text-dark">
              <DollarSign className="mr-1 inline h-4 w-4" /> Cost Entry
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {([
                { key: 'total_toll_cost', label: 'Toll' },
                { key: 'total_driver_allowance', label: 'Driver Allowance' },
                { key: 'total_loading_cost', label: 'Loading' },
                { key: 'total_misc_cost', label: 'Misc' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-text-muted">{label} (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={costs[key]}
                    onChange={(e) => setCosts((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                    onBlur={(e) => saveCostField(key, Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">Costs auto-save when you leave each field.</p>
          </div>

          {/* Linked LRs */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-base font-semibold text-text-dark">Linked LRs</h3>
            {linkedLRs.length === 0 ? (
              <p className="text-sm text-text-muted">No LRs linked to this trip yet.</p>
            ) : (
              <div className="space-y-2">
                {linkedLRs.map((lr) => (
                  <div key={lr.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                    <div>
                      <span className="font-mono text-sm font-medium text-primary">{lr.lr_number}</span>
                      <span className="ml-2 text-sm text-text-muted">
                        {lr.origin_city} → {lr.destination_city}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-dark">
                        ₹{lr.total_amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => unlinkLR(lr.id)}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Unlink LR"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Link Unlinked LRs */}
            {unlinkedLRs.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-text-muted">Available LRs to link:</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {unlinkedLRs.map((lr) => (
                    <button
                      key={lr.id}
                      onClick={() => linkLR(lr.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-dashed border-gray-300 px-4 py-2 text-left hover:border-primary hover:bg-blue-50"
                    >
                      <div>
                        <span className="font-mono text-sm text-primary">{lr.lr_number}</span>
                        <span className="ml-2 text-xs text-text-muted">
                          {lr.origin_city} → {lr.destination_city}
                        </span>
                      </div>
                      <span className="text-sm text-text-dark">₹{lr.total_amount.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Diesel Entries */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-dark">
                <Fuel className="mr-1 inline h-4 w-4" /> Diesel Entries
              </h3>
              <Link
                href={`/dashboard/diesel/new?trip_id=${id}&vehicle_id=${trip.vehicle_id}&driver_id=${trip.driver_id}`}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-gray-50"
              >
                + Add Diesel
              </Link>
            </div>
            {dieselEntries.length === 0 ? (
              <p className="text-sm text-text-muted">No diesel entries for this trip.</p>
            ) : (
              <div className="space-y-2">
                {dieselEntries.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
                      d.is_theft_flagged ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium text-text-dark">
                        {d.litres}L @ ₹{d.price_per_litre}/L
                      </span>
                      <span className="ml-2 text-xs text-text-muted">
                        Odo: {d.odometer_at_fill.toLocaleString('en-IN')} km
                      </span>
                      {d.station_name && (
                        <span className="ml-2 text-xs text-text-muted">{d.station_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-dark">
                        ₹{d.total_cost.toLocaleString('en-IN')}
                      </span>
                      {d.is_theft_flagged && (
                        <span title="Theft flagged"><AlertTriangle className="h-4 w-4 text-red-500" /></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: P&L Summary */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-base font-semibold text-text-dark">P&L Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Revenue ({linkedLRs.length} LRs)</span>
                <span className="font-medium text-green-600">₹{totalRevenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-gray-100 pt-2" />
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Diesel</span>
                <span className="text-red-600">-₹{totalDiesel.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Toll</span>
                <span className="text-red-600">-₹{costs.total_toll_cost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Driver Allowance</span>
                <span className="text-red-600">-₹{costs.total_driver_allowance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Loading</span>
                <span className="text-red-600">-₹{costs.total_loading_cost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Misc</span>
                <span className="text-red-600">-₹{costs.total_misc_cost.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-gray-200 pt-2" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-text-dark">Net Profit</span>
                <span className={trip.net_profit < 0 ? 'text-red-600' : 'text-green-600'}>
                  {trip.net_profit < 0 ? '-' : '+'}₹{Math.abs(trip.net_profit).toLocaleString('en-IN')}
                </span>
              </div>
              {trip.is_loss_flagged && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Loss flagged on this trip
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-departure Loss Alert Modal */}
      {showLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-text-dark">Loss Alert</h3>
            </div>
            <p className="mb-4 text-sm text-text-muted">
              This trip currently shows a <strong className="text-red-600">net loss</strong>. Revenue
              from linked LRs does not cover estimated costs. Are you sure you want to depart?
            </p>
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3">
              <div className="flex justify-between text-sm">
                <span>Revenue</span>
                <span className="text-green-600">₹{totalRevenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Costs</span>
                <span className="text-red-600">
                  ₹{(totalDiesel + costs.total_toll_cost + costs.total_driver_allowance + costs.total_loading_cost + costs.total_misc_cost).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-red-200 pt-1 text-sm font-bold">
                <span>Net Loss</span>
                <span className="text-red-600">
                  -₹{Math.abs(
                    calculateNetProfit({
                      total_revenue: totalRevenue,
                      total_diesel_cost: totalDiesel,
                      ...costs,
                    })
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLossModal(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={() => pendingStatus && updateStatus(pendingStatus)}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Depart Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Trip Modal (odometer_end) */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-text-dark">Complete Trip</h3>
            <p className="mb-4 text-sm text-text-muted">
              Enter the final odometer reading to complete this trip. This triggers P&L calculation
              and diesel theft detection.
            </p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Odometer End (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={odometerEnd}
                onChange={(e) => setOdometerEnd(e.target.value)}
                placeholder={`Must be > ${trip.odometer_start.toLocaleString('en-IN')}`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-text-muted">
                Start: {trip.odometer_start.toLocaleString('en-IN')} km
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
