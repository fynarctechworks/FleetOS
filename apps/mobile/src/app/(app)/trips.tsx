import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '../../lib/supabase';
import type { TripStatus } from '@fleetos/shared';

type TripItem = {
  id: string;
  trip_number: string;
  status: TripStatus;
  origin_city: string;
  destination_city: string;
  planned_departure: string;
  net_profit: number;
  is_loss_flagged: boolean;
  vehicle: { registration_number: string } | null;
  driver: { name: string } | null;
};

const STATUS_TABS: (TripStatus | 'all')[] = ['all', 'planned', 'departed', 'in_transit', 'completed'];

const STATUS_LABEL: Record<string, string> = {
  all: 'All',
  planned: 'Planned',
  departed: 'Departed',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  completed: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_BG: Record<TripStatus, string> = {
  planned: '#DBEAFE',
  departed: '#E0F2FE',
  in_transit: '#FEF3C7',
  arrived: '#CCFBF1',
  completed: '#DCFCE7',
  cancelled: '#FEE2E2',
};

const STATUS_TEXT: Record<TripStatus, string> = {
  planned: '#1E40AF',
  departed: '#0369A1',
  in_transit: '#92400E',
  arrived: '#0F766E',
  completed: '#166534',
  cancelled: '#991B1B',
};

export default function TripsScreen() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TripStatus | 'all'>('all');

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('trips')
      .select(
        `id, trip_number, status, origin_city, destination_city,
         planned_departure, net_profit, is_loss_flagged,
         vehicle:vehicle_id(registration_number),
         driver:driver_id(name)`
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab);
    }

    const { data } = await query;
    if (data) setTrips(data as unknown as TripItem[]);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const renderTrip = ({ item }: { item: TripItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.tripNumber}>{item.trip_number}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_BG[item.status] }]}>
          <Text style={[styles.badgeText, { color: STATUS_TEXT[item.status] }]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.route}>
        {item.origin_city} → {item.destination_city}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>
          {item.vehicle?.registration_number ?? '—'} | {item.driver?.name ?? '—'}
        </Text>
        <Text style={[styles.profit, { color: item.net_profit < 0 ? '#DC2626' : '#16A34A' }]}>
          {item.net_profit < 0 ? '-' : '+'}₹{Math.abs(item.net_profit).toLocaleString('en-IN')}
        </Text>
      </View>
      <Text style={styles.date}>
        {new Date(item.planned_departure).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {STATUS_LABEL[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1A3C6E" style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={trips}
          renderItem={renderTrip}
          estimatedItemSize={120}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No trips found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#1A3C6E' },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  tabTextActive: { color: '#1A3C6E', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tripNumber: { fontSize: 16, fontWeight: '700', color: '#1A3C6E', fontFamily: 'monospace' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  route: { fontSize: 14, color: '#1E293B', marginBottom: 8 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { fontSize: 12, color: '#64748B' },
  profit: { fontSize: 14, fontWeight: '700' },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
