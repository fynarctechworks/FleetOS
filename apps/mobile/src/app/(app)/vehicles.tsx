import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import type { Vehicle } from '@fleetos/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

function healthColor(score: number): string {
  if (score >= 80) return '#16A34A';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

function VehicleItem({ vehicle }: { vehicle: Vehicle }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.regNumber}>{vehicle.registration_number}</Text>
        <View style={[styles.healthBadge, { backgroundColor: healthColor(vehicle.health_score) + '20' }]}>
          <Text style={[styles.healthText, { color: healthColor(vehicle.health_score) }]}>
            {vehicle.health_score}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}
        {vehicle.make ? ` | ${vehicle.make}` : ''}
        {vehicle.model ? ` ${vehicle.model}` : ''}
      </Text>
      <Text style={styles.meta}>
        Odometer: {vehicle.current_odometer_km.toLocaleString('en-IN')} km
      </Text>
    </View>
  );
}

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)
      .order('registration_number');
    if (data) setVehicles(data as Vehicle[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicles();
  }, [fetchVehicles]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>Loading vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {vehicles.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={48} color="#64748B" />
          <Text style={styles.emptyText}>No vehicles added yet</Text>
        </View>
      ) : (
        <FlashList
          data={vehicles}
          renderItem={({ item }) => <VehicleItem vehicle={item} />}
          estimatedItemSize={100}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3C6E" />
          }
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  regNumber: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  healthBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  healthText: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 14, color: '#64748B', marginTop: 2 },
  emptyText: { fontSize: 16, color: '#64748B', marginTop: 12 },
});
