'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { PLSummary, RoutePL } from '@fleetos/shared';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: {
    backgroundColor: '#1A3C6E',
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: { fontSize: 8, color: '#64748B', textTransform: 'uppercase' },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 16,
  },
  table: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    padding: 8,
  },
  thCell: { fontSize: 8, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' },
  tdCell: { fontSize: 9, color: '#1E293B' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

function fmt(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PLReportPDFProps {
  summary: PLSummary;
  routes: RoutePL[];
  dateRange: string;
  companyName: string;
}

export function PLReportPDF({ summary, routes, dateRange, companyName }: PLReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FleetOS — P&L Report</Text>
          <Text style={styles.headerSub}>
            {companyName} | {dateRange}
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Revenue</Text>
            <Text style={styles.summaryValue}>{fmt(summary.totalRevenue)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Costs</Text>
            <Text style={[styles.summaryValue, { color: '#DC2626' }]}>{fmt(summary.totalCosts)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: summary.netProfit >= 0 ? '#16A34A' : '#DC2626' },
              ]}
            >
              {fmt(summary.netProfit)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Margin</Text>
            <Text style={styles.summaryValue}>{summary.profitMarginPct}%</Text>
          </View>
        </View>

        {/* Cost Breakdown */}
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tdCell, { flex: 2 }]}>Diesel</Text>
            <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>{fmt(summary.totalDieselCost)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tdCell, { flex: 2 }]}>Toll</Text>
            <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>{fmt(summary.totalTollCost)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tdCell, { flex: 2 }]}>Driver Allowance</Text>
            <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>{fmt(summary.totalDriverAllowance)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tdCell, { flex: 2 }]}>Loading</Text>
            <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>{fmt(summary.totalLoadingCost)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tdCell, { flex: 2 }]}>Miscellaneous</Text>
            <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>{fmt(summary.totalMiscCost)}</Text>
          </View>
        </View>

        {/* Route Profitability */}
        <Text style={styles.sectionTitle}>Route Profitability ({routes.length} routes)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 3 }]}>Route</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Trips</Text>
            <Text style={[styles.thCell, { flex: 2, textAlign: 'right' }]}>Revenue</Text>
            <Text style={[styles.thCell, { flex: 2, textAlign: 'right' }]}>Net Profit</Text>
          </View>
          {routes.slice(0, 15).map((r) => (
            <View key={r.route} style={styles.tableRow}>
              <Text style={[styles.tdCell, { flex: 3 }]}>{r.route}</Text>
              <Text style={[styles.tdCell, { flex: 1, textAlign: 'center' }]}>{r.tripCount}</Text>
              <Text style={[styles.tdCell, { flex: 2, textAlign: 'right' }]}>{fmt(r.totalRevenue)}</Text>
              <Text
                style={[
                  styles.tdCell,
                  { flex: 2, textAlign: 'right', color: r.netProfit >= 0 ? '#16A34A' : '#DC2626' },
                ]}
              >
                {fmt(r.netProfit)}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by FleetOS on {new Date().toLocaleDateString('en-IN')}
        </Text>
      </Page>
    </Document>
  );
}
