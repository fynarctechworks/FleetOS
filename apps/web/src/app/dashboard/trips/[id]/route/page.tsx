'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GoogleMap, useLoadScript, PolylineF, MarkerF } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface LocationPoint {
  latitude: number;
  longitude: number;
  speed_kmph: number | null;
  recorded_at: string;
}

export default function RoutePlaybackPage() {
  const { id } = useParams<{ id: string }>();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
  });

  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [tripNumber, setTripNumber] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRoute = useCallback(async () => {
    const [locRes, tripRes] = await Promise.all([
      supabase
        .from('vehicle_locations')
        .select('latitude, longitude, speed_kmph, recorded_at')
        .eq('trip_id', id)
        .order('recorded_at', { ascending: true }),
      supabase
        .from('trips')
        .select('trip_number')
        .eq('id', id)
        .single(),
    ]);

    if (locRes.data) setPoints(locRes.data);
    if (tripRes.data) setTripNumber(tripRes.data.trip_number);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="p-8">
        <Link href={`/dashboard/trips/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary">
          <ArrowLeft size={16} /> Back to Trip
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-text-muted">No GPS data available for this trip.</p>
        </div>
      </div>
    );
  }

  const start = points[0];
  const end = points[points.length - 1];
  const path = points.map((p) => ({ lat: p.latitude, lng: p.longitude }));
  const center = { lat: (start.latitude + end.latitude) / 2, lng: (start.longitude + end.longitude) / 2 };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
        <Link href={`/dashboard/trips/${id}`} className="text-text-muted hover:text-primary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-primary">Route History — {tripNumber}</h1>
        <span className="text-sm text-text-muted">{points.length} GPS points</span>
      </div>

      <div className="flex-1">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={8}
          onLoad={(map) => {
            const bounds = new google.maps.LatLngBounds();
            points.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
            map.fitBounds(bounds, 60);
          }}
          options={{ streetViewControl: false, mapTypeControl: false }}
        >
          <PolylineF
            path={path}
            options={{
              strokeColor: '#1A3C6E',
              strokeWeight: 3,
              strokeOpacity: 0.8,
            }}
          />
          {/* Start marker (green) */}
          <MarkerF
            position={{ lat: start.latitude, lng: start.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#16A34A',
              fillOpacity: 1,
              strokeColor: '#FFF',
              strokeWeight: 2,
            }}
            title={`Start: ${new Date(start.recorded_at).toLocaleString('en-IN')}`}
          />
          {/* End marker (red flag) */}
          <MarkerF
            position={{ lat: end.latitude, lng: end.longitude }}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#DC2626',
              fillOpacity: 1,
              strokeColor: '#FFF',
              strokeWeight: 2,
            }}
            title={`End: ${new Date(end.recorded_at).toLocaleString('en-IN')}`}
          />
        </GoogleMap>
      </div>
    </div>
  );
}
