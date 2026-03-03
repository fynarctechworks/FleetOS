'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, TrendingUp, Users, MapPin } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Link from 'next/link';

// ─── Types ───

type DriverComparison = {
  driver_id: string;
  driver_name: string;
  total_litres: number;
  total_km: number;
  avg_kmpl: number;
  entry_count: number;
};

type RouteBenchmark = {
  id: string;
  origin_city: string;
  destination_city: string;
  expected_kmpl: number;
  distance_km: number;
};

type MileageTrendPoint = {
  month: string;
  avg_kmpl: number;
};

export default function DieselReportsPage() {
  const [driverComparisons, setDriverComparisons] = useState<DriverComparison[]>([]);
  const [benchmarks, setBenchmarks] = useState<RouteBenchmark[]>([]);
  const [mileageTrend, setMileageTrend] = useState<MileageTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Benchmark form
  const [showBenchmarkForm, setShowBenchmarkForm] = useState(false);
  const [bmOrigin, setBmOrigin] = useState('');
  const [bmDest, setBmDest] = useState('');
  const [bmKmpl, setBmKmpl] = useState('');
  const [bmDistance, setBmDistance] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Driver comparison — aggregate diesel entries per driver
    const { data: dieselData } = await supabase
      .from('diesel_entries')
      .select('driver_id, litres, odometer_at_fill, driver:driver_id(name)')
      .order('driver_id')
      .order('filled_at');

    if (dieselData) {
      const driverMap = new Map<string, { name: string; litres: number; entries: { odo: number }[] }>();

      for (const entry of dieselData as unknown as Array<{
        driver_id: string;
        litres: number;
        odometer_at_fill: number;
        driver: { name: string } | null;
      }>) {
        const existing = driverMap.get(entry.driver_id);
        if (existing) {
          existing.litres += entry.litres;
          existing.entries.push({ odo: entry.odometer_at_fill });
        } else {
          driverMap.set(entry.driver_id, {
            name: entry.driver?.name ?? 'Unknown',
            litres: entry.litres,
            entries: [{ odo: entry.odometer_at_fill }],
          });
        }
      }

      const comparisons: DriverComparison[] = [];
      for (const [driverId, data] of driverMap) {
        const odos = data.entries.map((e) => e.odo).sort((a, b) => a - b);
        const totalKm = odos.length > 1 ? odos[odos.length - 1] - odos[0] : 0;
        const avgKmpl = data.litres > 0 ? Math.round((totalKm / data.litres) * 100) / 100 : 0;
        comparisons.push({
          driver_id: driverId,
          driver_name: data.name,
          total_litres: Math.round(data.litres * 10) / 10,
          total_km: totalKm,
          avg_kmpl: avgKmpl,
          entry_count: data.entries.length,
        });
      }

      comparisons.sort((a, b) => b.avg_kmpl - a.avg_kmpl);
      setDriverComparisons(comparisons);
    }

    // 2. Route benchmarks
    const { data: bmData } = await supabase
      .from('route_benchmarks')
      .select('id, origin_city, destination_city, expected_kmpl, distance_km')
      .order('origin_city');

    if (bmData) setBenchmarks(bmData as RouteBenchmark[]);

    // 3. Mileage trend — monthly avg km/L for last 12 months
    const { data: trendData } = await supabase
      .from('diesel_entries')
      .select('filled_at, litres, odometer_at_fill')
      .order('filled_at', { ascending: true });

    if (trendData && trendData.length > 1) {
      const monthMap = new Map<string, { litres: number; firstOdo: number; lastOdo: number }>();

      for (const entry of trendData as Array<{ filled_at: string; litres: number; odometer_at_fill: number }>) {
        const month = entry.filled_at.slice(0, 7); // YYYY-MM
        const existing = monthMap.get(month);
        if (existing) {
          existing.litres += entry.litres;
          if (entry.odometer_at_fill < existing.firstOdo) existing.firstOdo = entry.odometer_at_fill;
          if (entry.odometer_at_fill > existing.lastOdo) existing.lastOdo = entry.odometer_at_fill;
        } else {
          monthMap.set(month, {
            litres: entry.litres,
            firstOdo: entry.odometer_at_fill,
            lastOdo: entry.odometer_at_fill,
          });
        }
      }

      const trend: MileageTrendPoint[] = [];
      for (const [month, data] of monthMap) {
        const km = data.lastOdo - data.firstOdo;
        const avgKmpl = data.litres > 0 ? Math.round((km / data.litres) * 100) / 100 : 0;
        trend.push({ month, avg_kmpl: avgKmpl > 0 ? avgKmpl : 0 });
      }
      setMileageTrend(trend);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addBenchmark() {
    if (!bmOrigin || !bmDest || !bmKmpl) return;

    await supabase.from('route_benchmarks').insert({
      origin_city: bmOrigin,
      destination_city: bmDest,
      expected_kmpl: Number(bmKmpl),
      distance_km: Number(bmDistance) || 0,
    });

    setBmOrigin('');
    setBmDest('');
    setBmKmpl('');
    setBmDistance('');
    setShowBenchmarkForm(false);
    fetchData();
  }

  async function deleteBenchmark(id: string) {
    await supabase.from('route_benchmarks').delete().eq('id', id);
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark">Diesel Reports</h2>
        <Link
          href="/dashboard/diesel"
          className="text-sm text-primary hover:underline"
        >
          Back to Diesel Log
        </Link>
      </div>

      <div className="space-y-6">
        {/* Mileage Trend Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-dark">
            <TrendingUp className="h-5 w-5 text-primary" />
            Mileage Trend (km/L)
          </h3>
          {mileageTrend.length < 2 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Need at least 2 months of data to show a trend.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mileageTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
                  formatter={(value: number) => [`${value} km/L`, 'Avg Mileage']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_kmpl"
                  stroke="#1A3C6E"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Avg km/L"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Driver Comparison */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-dark">
            <Users className="h-5 w-5 text-primary" />
            Driver Fuel Efficiency Comparison
          </h3>
          {driverComparisons.length === 0 ? (
            <p className="text-sm text-text-muted">No driver data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-text-muted">Rank</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Driver</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Entries</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Total Litres</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Total KM</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Avg km/L</th>
                  </tr>
                </thead>
                <tbody>
                  {driverComparisons.map((d, i) => (
                    <tr key={d.driver_id} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                            i === 0 ? 'bg-green-500' : i === driverComparisons.length - 1 ? 'bg-red-500' : 'bg-gray-400'
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-dark">{d.driver_name}</td>
                      <td className="px-4 py-3 text-text-muted">{d.entry_count}</td>
                      <td className="px-4 py-3 text-text-muted">{d.total_litres} L</td>
                      <td className="px-4 py-3 text-text-muted">{d.total_km.toLocaleString('en-IN')} km</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${
                            d.avg_kmpl >= 4 ? 'text-green-600' : d.avg_kmpl >= 3 ? 'text-amber-600' : 'text-red-600'
                          }`}
                        >
                          {d.avg_kmpl} km/L
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Route Benchmarks */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-text-dark">
              <MapPin className="h-5 w-5 text-primary" />
              Route Benchmarks
            </h3>
            <button
              onClick={() => setShowBenchmarkForm(!showBenchmarkForm)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-gray-50"
            >
              + Add Benchmark
            </button>
          </div>

          {showBenchmarkForm && (
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <input
                  value={bmOrigin}
                  onChange={(e) => setBmOrigin(e.target.value)}
                  placeholder="Origin city"
                  className={inputCls}
                />
                <input
                  value={bmDest}
                  onChange={(e) => setBmDest(e.target.value)}
                  placeholder="Destination city"
                  className={inputCls}
                />
                <input
                  value={bmKmpl}
                  onChange={(e) => setBmKmpl(e.target.value)}
                  type="number"
                  step="0.1"
                  placeholder="Expected km/L"
                  className={inputCls}
                />
                <input
                  value={bmDistance}
                  onChange={(e) => setBmDistance(e.target.value)}
                  type="number"
                  placeholder="Distance (km)"
                  className={inputCls}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={addBenchmark}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowBenchmarkForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {benchmarks.length === 0 ? (
            <p className="text-sm text-text-muted">
              No route benchmarks set. Add benchmarks to compare actual mileage against expected values.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-text-muted">Route</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Distance</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Expected km/L</th>
                    <th className="px-4 py-3 font-medium text-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((bm) => (
                    <tr key={bm.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium text-text-dark">
                        {bm.origin_city} → {bm.destination_city}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{bm.distance_km} km</td>
                      <td className="px-4 py-3 font-medium text-primary">{bm.expected_kmpl} km/L</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteBenchmark(bm.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
