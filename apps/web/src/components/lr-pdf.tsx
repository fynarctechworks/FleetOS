'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

interface LRPdfData {
  lr_number: string;
  load_type: string;
  origin_city: string;
  destination_city: string;
  goods_description: string | null;
  weight_kg: number | null;
  freight_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  ewb_number: string | null;
  notes: string | null;
  created_at: string;
  consignor_name: string;
  consignor_address: string;
  consignor_gst: string;
  consignee_name: string;
  consignee_address: string;
  consignee_gst: string;
  tracking_url: string;
  qr_data_url: string;
}

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica', color: '#1E293B' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A3C6E',
    padding: 16,
    borderRadius: 4,
    marginBottom: 20,
  },
  logo: {
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  logoText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  lrNumberHeader: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  dateHeader: { color: '#FFFFFF', fontSize: 9, opacity: 0.8 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1A3C6E',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 120, fontFamily: 'Helvetica-Bold', color: '#64748B' },
  value: { flex: 1, color: '#1E293B' },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 10,
  },
  partyTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#64748B', marginBottom: 4 },
  partyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 3 },
  partySub: { color: '#64748B', fontSize: 9, marginBottom: 1 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  amountLabel: { color: '#64748B' },
  amountValue: { fontFamily: 'Helvetica-Bold' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginTop: 4,
  },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#1A3C6E' },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  qrImage: { width: 80, height: 80 },
  qrText: { fontSize: 8, color: '#64748B', textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#94A3B8',
  },
});

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LRPdfDocument({ data }: { data: LRPdfData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logo}>
            <Text style={s.logoText}>FleetOS</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.lrNumberHeader}>LR {data.lr_number}</Text>
            <Text style={s.dateHeader}>
              {new Date(data.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Consignor / Consignee */}
        <View style={[s.section, { flexDirection: 'row', gap: 12 }]}>
          <View style={s.partyBox}>
            <Text style={s.partyTitle}>CONSIGNOR (SENDER)</Text>
            <Text style={s.partyName}>{data.consignor_name}</Text>
            {data.consignor_address && <Text style={s.partySub}>{data.consignor_address}</Text>}
            {data.consignor_gst && <Text style={s.partySub}>GST: {data.consignor_gst}</Text>}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyTitle}>CONSIGNEE (RECEIVER)</Text>
            <Text style={s.partyName}>{data.consignee_name}</Text>
            {data.consignee_address && <Text style={s.partySub}>{data.consignee_address}</Text>}
            {data.consignee_gst && <Text style={s.partySub}>GST: {data.consignee_gst}</Text>}
          </View>
        </View>

        {/* Shipment Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Shipment Details</Text>
          <View style={s.row}>
            <Text style={s.label}>Load Type</Text>
            <Text style={s.value}>{data.load_type.toUpperCase()}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Route</Text>
            <Text style={s.value}>
              {data.origin_city} → {data.destination_city}
            </Text>
          </View>
          {data.goods_description && (
            <View style={s.row}>
              <Text style={s.label}>Goods</Text>
              <Text style={s.value}>{data.goods_description}</Text>
            </View>
          )}
          {data.weight_kg && (
            <View style={s.row}>
              <Text style={s.label}>Weight</Text>
              <Text style={s.value}>{data.weight_kg} kg</Text>
            </View>
          )}
          {data.ewb_number && (
            <View style={s.row}>
              <Text style={s.label}>E-Way Bill</Text>
              <Text style={s.value}>{data.ewb_number}</Text>
            </View>
          )}
        </View>

        {/* Amount Breakdown */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Amount Breakdown</Text>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Freight Amount</Text>
            <Text style={s.amountValue}>{formatCurrency(data.freight_amount)}</Text>
          </View>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>GST ({data.gst_rate}%)</Text>
            <Text style={s.amountValue}>{formatCurrency(data.gst_amount)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalValue}>{formatCurrency(data.total_amount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* QR Code */}
        <View style={s.qrSection}>
          {data.qr_data_url && (
            <Image style={s.qrImage} src={data.qr_data_url} />
          )}
          <View>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
              Track this shipment
            </Text>
            <Text style={s.qrText}>{data.tracking_url}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          Generated by FleetOS — Transport Management System
        </Text>
      </Page>
    </Document>
  );
}
