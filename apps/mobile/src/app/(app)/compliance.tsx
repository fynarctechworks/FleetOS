import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '../../lib/supabase';
import { computeComplianceStatus, daysUntilExpiry } from '@fleetos/shared';
import type { ComplianceStatus, DocType } from '@fleetos/shared';

type ComplianceItem = {
  id: string;
  entity_type: 'vehicle' | 'driver';
  entity_id: string;
  doc_type: DocType;
  doc_number: string | null;
  expiry_date: string;
  status: ComplianceStatus;
  entity_name: string;
};

const DOC_LABELS: Record<DocType, string> = {
  insurance: 'Insurance',
  puc: 'PUC',
  fitness: 'Fitness',
  national_permit: 'National Permit',
  state_permit: 'State Permit',
  driver_licence: 'Driver Licence',
};

const STATUS_COLORS: Record<ComplianceStatus, { bg: string; text: string }> = {
  valid: { bg: '#DCFCE7', text: '#166534' },
  expiring_soon: { bg: '#FEF3C7', text: '#92400E' },
  expired: { bg: '#FEE2E2', text: '#991B1B' },
};

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
};

export default function ComplianceScreen() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const { data: docs } = await supabase
      .from('compliance_documents')
      .select('*')
      .order('expiry_date', { ascending: true });

    if (!docs) { setLoading(false); return; }

    const vehicleIds = [...new Set(docs.filter((d) => d.entity_type === 'vehicle').map((d) => d.entity_id))];
    const driverIds = [...new Set(docs.filter((d) => d.entity_type === 'driver').map((d) => d.entity_id))];

    const [vRes, dRes] = await Promise.all([
      vehicleIds.length > 0 ? supabase.from('vehicles').select('id, registration_number').in('id', vehicleIds) : { data: [] },
      driverIds.length > 0 ? supabase.from('drivers').select('id, name').in('id', driverIds) : { data: [] },
    ]);

    const vMap = new Map((vRes.data ?? []).map((v: { id: string; registration_number: string }) => [v.id, v.registration_number]));
    const dMap = new Map((dRes.data ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));

    const enriched: ComplianceItem[] = docs.map((doc) => ({
      ...doc,
      status: computeComplianceStatus(doc.expiry_date),
      entity_name: doc.entity_type === 'vehicle'
        ? vMap.get(doc.entity_id) ?? 'Unknown Vehicle'
        : dMap.get(doc.entity_id) ?? 'Unknown Driver',
    }));

    setItems(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const expiringCount = items.filter((i) => i.status === 'expiring_soon').length;
  const validCount = items.filter((i) => i.status === 'valid').length;

  const renderItem = ({ item }: { item: ComplianceItem }) => {
    const days = daysUntilExpiry(item.expiry_date);
    const cfg = STATUS_COLORS[item.status];
    return (
      <View style={[styles.card, item.status === 'expired' && styles.cardExpired]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.entityName}>{item.entity_name}</Text>
            <Text style={styles.entityType}>{item.entity_type}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.text }]}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        <Text style={styles.docType}>{DOC_LABELS[item.doc_type]}</Text>
        {item.doc_number && <Text style={styles.docNumber}>{item.doc_number}</Text>}
        <View style={styles.cardFooter}>
          <Text style={styles.expiryLabel}>Expires: {new Date(item.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
          <Text style={[styles.daysLeft, { color: days <= 0 ? '#DC2626' : days <= 30 ? '#D97706' : '#16A34A' }]}>
            {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: '#BBF7D0' }]}>
          <Text style={[styles.summaryCount, { color: '#166534' }]}>{validCount}</Text>
          <Text style={styles.summaryLabel}>Valid</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#FDE68A' }]}>
          <Text style={[styles.summaryCount, { color: '#92400E' }]}>{expiringCount}</Text>
          <Text style={styles.summaryLabel}>Expiring</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#FECACA' }]}>
          <Text style={[styles.summaryCount, { color: '#991B1B' }]}>{expiredCount}</Text>
          <Text style={styles.summaryLabel}>Expired</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1A3C6E" style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          estimatedItemSize={130}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No compliance documents.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: 'center',
  },
  summaryCount: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardExpired: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  entityName: { fontSize: 15, fontWeight: '600', color: '#1A3C6E' },
  entityType: { fontSize: 11, color: '#64748B', textTransform: 'capitalize' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  docType: { fontSize: 13, fontWeight: '500', color: '#1E293B', marginBottom: 2 },
  docNumber: { fontSize: 11, color: '#64748B', fontFamily: 'monospace' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  expiryLabel: { fontSize: 12, color: '#64748B' },
  daysLeft: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
