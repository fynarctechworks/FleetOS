import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import type { ComplianceDocument } from '@fleetos/shared';
import { Ionicons } from '@expo/vector-icons';

function statusColor(status: string): string {
  if (status === 'expired') return '#DC2626';
  if (status === 'expiring_soon') return '#D97706';
  return '#16A34A';
}

function AlertItem({ doc }: { doc: ComplianceDocument }) {
  const daysLeft = Math.ceil(
    (new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <View style={[styles.card, { borderLeftColor: statusColor(doc.status) }]}>
      <View style={styles.row}>
        <Text style={styles.docType}>{doc.doc_type.replace(/_/g, ' ').toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(doc.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: statusColor(doc.status) }]}>
            {doc.status === 'expired' ? 'Expired' : `${daysLeft}d left`}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>Expiry: {new Date(doc.expiry_date).toLocaleDateString('en-IN')}</Text>
    </View>
  );
}

export default function AlertsScreen() {
  const [docs, setDocs] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from('compliance_documents')
      .select('*')
      .in('status', ['expiring_soon', 'expired'])
      .order('expiry_date');
    if (data) setDocs(data as ComplianceDocument[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  if (loading) {
    return <View style={styles.center}><Text style={styles.meta}>Loading alerts...</Text></View>;
  }

  return (
    <View style={styles.container}>
      {docs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#16A34A" />
          <Text style={styles.emptyText}>All compliance documents are valid</Text>
        </View>
      ) : (
        <FlashList
          data={docs}
          renderItem={({ item }) => <AlertItem doc={item} />}
          estimatedItemSize={80}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A3C6E" />}
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
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  docType: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  meta: { fontSize: 13, color: '#64748B' },
  emptyText: { fontSize: 16, color: '#64748B', marginTop: 12 },
});
