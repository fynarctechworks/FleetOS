'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Vendor, Trip } from '@fleetos/shared';
import {
  ArrowLeft, Loader2, Truck, Phone, MapPin, DollarSign,
  CheckCircle2, XCircle,
} from 'lucide-react';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVendor = useCallback(async () => {
    const [vendorRes, tripsRes] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', id).single(),
      supabase
        .from('trips')
        .select('*')
        .eq('vendor_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (vendorRes.data) setVendor(vendorRes.data as Vendor);
    if (tripsRes.data) setTrips(tripsRes.data as Trip[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  async function recordPayment() {
    if (!vendor) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;

    setSaving(true);
    const newBalance = Math.max(0, vendor.balance_due - amount);

    await supabase
      .from('vendors')
      .update({ balance_due: newBalance })
      .eq('id', id);

    setVendor({ ...vendor, balance_due: newBalance });
    setShowPayment(false);
    setPaymentAmount('');
    setSaving(false);
  }

  async function toggleActive() {
    if (!vendor) return;
    await supabase
      .from('vendors')
      .update({ is_active: !vendor.is_active })
      .eq('id', id);
    setVendor({ ...vendor, is_active: !vendor.is_active });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor) {
    return <div className="p-6 text-center text-text-muted">Vendor not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/vendors" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-text-dark">{vendor.name}</h2>
            <p className="text-sm text-text-muted">
              {vendor.is_active ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-red-600">Inactive</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPayment(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <DollarSign className="h-4 w-4" />
            Record Payment
          </button>
          <button
            onClick={toggleActive}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50"
          >
            {vendor.is_active ? (
              <><XCircle className="h-4 w-4" /> Deactivate</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Reactivate</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Vendor Info */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-base font-semibold text-text-dark">Details</h3>
            <dl className="space-y-3 text-sm">
              {vendor.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-text-muted" />
                  <div>
                    <dt className="text-xs text-text-muted">Phone</dt>
                    <dd className="font-medium text-text-dark">{vendor.phone}</dd>
                  </div>
                </div>
              )}
              {vendor.vehicle_number && (
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 text-text-muted" />
                  <div>
                    <dt className="text-xs text-text-muted">Vehicle</dt>
                    <dd className="font-mono font-medium text-text-dark">
                      {vendor.vehicle_number}
                      {vendor.vehicle_type && (
                        <span className="ml-2 text-xs capitalize text-text-muted">({vendor.vehicle_type})</span>
                      )}
                    </dd>
                  </div>
                </div>
              )}
              {vendor.route_specialisation && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-text-muted" />
                  <div>
                    <dt className="text-xs text-text-muted">Route</dt>
                    <dd className="font-medium text-text-dark">{vendor.route_specialisation}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <DollarSign className="mt-0.5 h-4 w-4 text-text-muted" />
                <div>
                  <dt className="text-xs text-text-muted">Rates</dt>
                  <dd className="font-medium text-text-dark">
                    {vendor.rate_per_km ? `₹${vendor.rate_per_km}/km` : ''}
                    {vendor.rate_per_km && vendor.rate_per_trip ? ' | ' : ''}
                    {vendor.rate_per_trip ? `₹${vendor.rate_per_trip}/trip` : ''}
                    {!vendor.rate_per_km && !vendor.rate_per_trip ? '—' : ''}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Balance Due */}
          <div className={`rounded-xl border p-6 ${vendor.balance_due > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Balance Due</p>
            <p className={`mt-1 text-3xl font-bold ${vendor.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{vendor.balance_due.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Right: Trip History */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-base font-semibold text-text-dark">Trip History</h3>
            {trips.length === 0 ? (
              <p className="text-sm text-text-muted">No trips linked to this vendor.</p>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/dashboard/trips/${trip.id}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 hover:bg-gray-100"
                  >
                    <div>
                      <span className="font-mono text-sm font-medium text-primary">{trip.trip_number}</span>
                      <span className="ml-2 text-sm text-text-muted">
                        {trip.origin_city} → {trip.destination_city}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs capitalize text-text-muted">{trip.status}</span>
                      <span className={`text-sm font-medium ${trip.net_profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{Math.abs(trip.net_profit).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-text-dark">Record Payment</h3>
            <p className="mb-4 text-sm text-text-muted">
              Current balance due: <strong className="text-red-600">₹{vendor.balance_due.toLocaleString('en-IN')}</strong>
            </p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                disabled={saving || !paymentAmount || Number(paymentAmount) <= 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
