'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import { Loader2, Truck, MapPin } from 'lucide-react';

interface VehiclePin {
  id: string;
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  driver_name: string | null;
  trip_number: string | null;
  trip_status: string | null;
  origin_city: string | null;
  destination_city: string | null;
  latitude: number;
  longitude: number;
  speed_kmph: number | null;
  recorded_at: string;
}

const MAP_CENTER = { lat: 17.6868, lng: 83.2185 }; // Vizag default
const MAP_STYLES = { width: '100%', height: '100%' };

export default function FleetMapPage() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
  });

  const [vehicles, setVehicles] = useState<VehiclePin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase
      .from('v_latest_vehicle_locations')
      .select('*');

    if (data) setVehicles(data as VehiclePin[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVehicles();

    // Realtime subscription for live updates
    const channel = supabase
      .channel('fleet-map-locations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vehicle_locations' },
        (payload) => {
          const newLoc = payload.new as {
            vehicle_id: string;
            latitude: number;
            longitude: number;
            speed_kmph: number | null;
            recorded_at: string;
          };

          setVehicles((prev) =>
            prev.map((v) =>
              v.vehicle_id === newLoc.vehicle_id
                ? {
                    ...v,
                    latitude: newLoc.latitude,
                    longitude: newLoc.longitude,
                    speed_kmph: newLoc.speed_kmph,
                    recorded_at: newLoc.recorded_at,
                  }
                : v
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchVehicles]);

  const selected = vehicles.find((v) => v.vehicle_id === selectedId);

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (vehicles.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      vehicles.forEach((v) => bounds.extend({ lat: v.latitude, lng: v.longitude }));
      map.fitBounds(bounds, 60);
    }
  };

  useEffect(() => {
    if (mapRef.current && vehicles.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      vehicles.forEach((v) => bounds.extend({ lat: v.latitude, lng: v.longitude }));
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [vehicles.length]);

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-primary">Live Fleet Map</h2>
          <p className="text-sm text-text-muted">{vehicles.length} vehicles tracked</p>
        </div>
        <div className="divide-y divide-gray-100">
          {vehicles.map((v) => {
            const isActive = v.trip_status && !['completed', 'cancelled'].includes(v.trip_status);
            const timeSince = new Date(v.recorded_at);
            return (
              <button
                key={v.vehicle_id}
                onClick={() => {
                  setSelectedId(v.vehicle_id);
                  mapRef.current?.panTo({ lat: v.latitude, lng: v.longitude });
                  mapRef.current?.setZoom(14);
                }}
                className={`w-full p-3 text-left hover:bg-gray-50 transition ${
                  selectedId === v.vehicle_id ? 'bg-blue-50 border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-primary">
                    {v.registration_number}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isActive ? 'On Trip' : 'Idle'}
                  </span>
                </div>
                {v.driver_name && (
                  <p className="text-xs text-text-muted mt-0.5">{v.driver_name}</p>
                )}
                {v.trip_number && (
                  <p className="text-xs text-accent font-mono mt-0.5">{v.trip_number}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  {timeSince.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {v.speed_kmph != null && ` · ${v.speed_kmph} km/h`}
                </p>
              </button>
            );
          })}
          {vehicles.length === 0 && (
            <div className="p-8 text-center text-sm text-text-muted">
              No vehicles with GPS data
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <GoogleMap
          mapContainerStyle={MAP_STYLES}
          center={MAP_CENTER}
          zoom={6}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {vehicles.map((v) => (
            <MarkerF
              key={v.vehicle_id}
              position={{ lat: v.latitude, lng: v.longitude }}
              onClick={() => setSelectedId(v.vehicle_id)}
              icon={{
                path: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
                fillColor: '#1A3C6E',
                fillOpacity: 1,
                strokeColor: '#FFF',
                strokeWeight: 1,
                scale: 1.2,
                anchor: new google.maps.Point(12, 12),
              }}
            />
          ))}

          {selected && (
            <InfoWindowF
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelectedId(null)}
            >
              <div className="min-w-[180px] p-1">
                <p className="font-bold text-sm text-primary">{selected.registration_number}</p>
                {selected.driver_name && (
                  <p className="text-xs text-gray-600 mt-0.5">{selected.driver_name}</p>
                )}
                {selected.trip_number && (
                  <p className="text-xs mt-0.5">
                    <span className="font-mono text-accent">{selected.trip_number}</span>
                    {selected.origin_city && selected.destination_city && (
                      <span className="text-gray-500"> · {selected.origin_city} → {selected.destination_city}</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {selected.speed_kmph != null && `${selected.speed_kmph} km/h · `}
                  Last seen: {new Date(selected.recorded_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
