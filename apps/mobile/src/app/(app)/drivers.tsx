import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import type { Driver } from '@fleetos/shared';
import { Ionicons } from '@expo/vector-icons';

function DriverItem({ driver }: { driver: Driver }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{driver.name}</Text>
          <Text style={styles.meta}>{driver.phone}</Text>
        </View>
        <View style={[
          styles.scoreBadge,
          { backgroundColor: driver.performance_score >= 80 ? '#16A34A20' : driver.performance_score >= 50 ? '#D9770620' : '#DC262620' },
        ]}>
          <Text style={[
            styles.scoreText,
            { color: driver.performance_score >= 80 ? '#16A34A' : driver.performance_score >= 50 ? '#D97706' : '#DC2626' },
          ]}>
            {driver.performance_score}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        {driver.licence_number && (
          <Text style={styles.detail}>Licence: {driver.licence_number}</Text>
        )}
        {driver.aadhaar_last4 && (
          <Text style={styles.detail}>Aadhaar: XXXX-{driver.aadhaar_last4}</Text>
        )}
        {driver.fixed_salary > 0 && (
          <Text style={styles.detail}>Salary: ₹{driver.fixed_salary.toLocaleString('en-IN')}/mo</Text>
        )}
      </View>
    </View>
  );
}

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDrivers = useCallback(async () => {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setDrivers(data as Driver[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrivers();
  }, [fetchDrivers]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {drivers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#64748B" />
          <Text style={styles.emptyText}>No drivers added yet</Text>
        </View>
      ) : (
        <FlashList
          data={drivers}
          renderItem={({ item }) => <DriverItem driver={item} />}
          estimatedItemSize={130}
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
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A3C6E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  meta: { fontSize: 14, color: '#64748B' },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  scoreText: { fontSize: 14, fontWeight: '600' },
  details: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  detail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  emptyText: { fontSize: 16, color: '#64748B', marginTop: 12 },
});
