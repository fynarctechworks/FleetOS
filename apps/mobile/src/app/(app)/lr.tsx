import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import type { LRStatus } from '@fleetos/shared';
import { Ionicons } from '@expo/vector-icons';

type LRListItem = {
  id: string;
  lr_number: string;
  status: LRStatus;
  origin_city: string;
  destination_city: string;
  goods_description: string | null;
  total_amount: number;
  created_at: string;
  consignor: { name: string } | null;
  consignee: { name: string } | null;
};

const TABS: { label: string; value: LRStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Booked', value: 'booked' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Billed', value: 'billed' },
];

const STATUS_COLOR: Record<LRStatus, string> = {
  booked: '#0EA5E9',
  in_transit: '#D97706',
  delivered: '#16A34A',
  pod_uploaded: '#0D9488',
  billed: '#7C3AED',
  payment_received: '#059669',
};

const STATUS_LABEL: Record<LRStatus, string> = {
  booked: 'Booked',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  pod_uploaded: 'POD',
  billed: 'Billed',
  payment_received: 'Paid',
};

function LRCard({ item }: { item: LRListItem }) {
  const color = STATUS_COLOR[item.status];
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardTop}>
        <Text style={styles.lrNumber}>{item.lr_number}</Text>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>{STATUS_LABEL[item.status]}</Text>
        </View>
      </View>
      <Text style={styles.route}>
        {item.origin_city} → {item.destination_city}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.parties} numberOfLines={1}>
          {item.consignor?.name || '—'} → {item.consignee?.name || '—'}
        </Text>
        <Text style={styles.amount}>₹{item.total_amount.toLocaleString('en-IN')}</Text>
      </View>
      {item.goods_description && (
        <Text style={styles.goods} numberOfLines={1}>{item.goods_description}</Text>
      )}
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString('en-IN')}
      </Text>
    </View>
  );
}

export default function LRScreen() {
  const [lrs, setLrs] = useState<LRListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<LRStatus | 'all'>('all');

  const fetchLRs = useCallback(async (status: LRStatus | 'all') => {
    let query = supabase
      .from('lr_entries')
      .select(`
        id, lr_number, status, origin_city, destination_city,
        goods_description, total_amount, created_at,
        consignor:consignor_id(name),
        consignee:consignee_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data } = await query;
    if (data) setLrs(data as unknown as LRListItem[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLRs(activeTab);
  }, [activeTab, fetchLRs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLRs(activeTab);
  }, [activeTab, fetchLRs]);

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            onPress={() => setActiveTab(tab.value)}
            style={[styles.tab, activeTab === tab.value && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.meta}>Loading LRs...</Text>
        </View>
      ) : lrs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color="#64748B" />
          <Text style={styles.emptyText}>No LRs found</Text>
        </View>
      ) : (
        <FlashList
          data={lrs}
          renderItem={({ item }) => <LRCard item={item} />}
          estimatedItemSize={120}
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
  tabBar: { maxHeight: 50, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBarContent: { paddingHorizontal: 12, alignItems: 'center', gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: '#1A3C6E' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  lrNumber: { fontSize: 16, fontWeight: 'bold', color: '#1A3C6E', fontFamily: 'monospace' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  route: { fontSize: 14, fontWeight: '500', color: '#1E293B', marginBottom: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  parties: { flex: 1, fontSize: 12, color: '#64748B', marginRight: 8 },
  amount: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  goods: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  date: { fontSize: 11, color: '#94A3B8' },
  meta: { fontSize: 14, color: '#64748B' },
  emptyText: { fontSize: 16, color: '#64748B', marginTop: 12 },
});
