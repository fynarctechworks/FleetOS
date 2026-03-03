import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../../lib/supabase';

interface VehiclePin {
  vehicle_id: string;
  registration_number: string;
  driver_name: string | null;
  trip_number: string | null;
  trip_status: string | null;
  latitude: number;
  longitude: number;
  speed_kmph: number | null;
  recorded_at: string;
}

export default function FleetMapScreen() {
  const [vehicles, setVehicles] = useState<VehiclePin[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase
      .from('v_latest_vehicle_locations')
      .select('*');
    if (data) {
      setVehicles(data as VehiclePin[]);
      // Fit to all markers
      if (data.length > 0 && mapRef.current) {
        mapRef.current.fitToCoordinates(
          data.map((v: VehiclePin) => ({ latitude: v.latitude, longitude: v.longitude })),
          { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
        );
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVehicles();

    const channel = supabase
      .channel('mobile-fleet-map')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vehicle_locations' },
        (payload) => {
          const loc = payload.new as {
            vehicle_id: string;
            latitude: number;
            longitude: number;
            speed_kmph: number | null;
            recorded_at: string;
          };
          setVehicles((prev) =>
            prev.map((v) =>
              v.vehicle_id === loc.vehicle_id
                ? { ...v, latitude: loc.latitude, longitude: loc.longitude, speed_kmph: loc.speed_kmph, recorded_at: loc.recorded_at }
                : v
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchVehicles]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A3C6E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 17.6868,
          longitude: 83.2185,
          latitudeDelta: 5,
          longitudeDelta: 5,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {vehicles.map((v) => (
          <Marker
            key={v.vehicle_id}
            coordinate={{ latitude: v.latitude, longitude: v.longitude }}
            pinColor="#1A3C6E"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{v.registration_number}</Text>
                {v.driver_name && <Text style={styles.calloutMeta}>{v.driver_name}</Text>}
                {v.trip_number && (
                  <Text style={styles.calloutTrip}>{v.trip_number}</Text>
                )}
                <Text style={styles.calloutSpeed}>
                  {v.speed_kmph != null ? `${v.speed_kmph} km/h` : 'Stationary'}
                  {' · '}
                  {new Date(v.recorded_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {vehicles.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>No vehicles with GPS data</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  callout: { minWidth: 160, padding: 4 },
  calloutTitle: { fontSize: 14, fontWeight: '700', color: '#1A3C6E' },
  calloutMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  calloutTrip: { fontSize: 11, fontFamily: 'monospace', color: '#F97316', marginTop: 2 },
  calloutSpeed: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  emptyOverlay: {
    position: 'absolute', top: '50%', left: 0, right: 0,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: '#64748B', backgroundColor: '#FFF', padding: 12, borderRadius: 8 },
});
