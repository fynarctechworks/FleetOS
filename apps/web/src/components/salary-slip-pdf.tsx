'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

export interface SalarySlipData {
  company_name: string;
  driver_name: string;
  driver_phone: string;
  month_display: string;
  fixed_pay: number;
  trip_allowances: number;
  advances_deducted: number;
  other_deductions: number;
  net_salary: number;
  status: string;
  paid_at: string | null;
}

const PRIMARY = '#1A3C6E';
const ACCENT = '#F97316';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  slipTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 9,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rowAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: '#F8FAFC',
  },
  label: {
    color: '#64748B',
    fontSize: 10,
  },
  value: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: PRIMARY,
    borderRadius: 4,
    marginTop: 8,
  },
  totalLabel: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94A3B8',
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
  },
});

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

export function SalarySlipPdfDocument({ data }: { data: SalarySlipData }) {
  const grossEarnings = data.fixed_pay + data.trip_allowances;
  const totalDeductions = data.advances_deducted + data.other_deductions;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.logo}>
              <Text style={styles.logoText}>FleetOS</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' as const }}>
            <Text style={styles.slipTitle}>Salary Slip</Text>
            <Text style={styles.subtitle}>{data.month_display}</Text>
          </View>
        </View>

        {/* Employee Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{data.company_name}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Driver Name</Text>
            <Text style={styles.infoValue}>{data.driver_name}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{data.driver_phone}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{data.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Fixed Pay</Text>
            <Text style={styles.value}>{formatCurrency(data.fixed_pay)}</Text>
          </View>
          <View style={styles.rowAlt}>
            <Text style={styles.label}>Trip Allowances</Text>
            <Text style={styles.value}>{formatCurrency(data.trip_allowances)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ ...styles.label, fontFamily: 'Helvetica-Bold' }}>Gross Earnings</Text>
            <Text style={{ ...styles.value, color: '#16A34A' }}>{formatCurrency(grossEarnings)}</Text>
          </View>
        </View>

        {/* Deductions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Advances Deducted</Text>
            <Text style={styles.value}>{formatCurrency(data.advances_deducted)}</Text>
          </View>
          <View style={styles.rowAlt}>
            <Text style={styles.label}>Other Deductions</Text>
            <Text style={styles.value}>{formatCurrency(data.other_deductions)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ ...styles.label, fontFamily: 'Helvetica-Bold' }}>Total Deductions</Text>
            <Text style={{ ...styles.value, color: '#DC2626' }}>{formatCurrency(totalDeductions)}</Text>
          </View>
        </View>

        {/* Net Salary */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Net Salary</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.net_salary)}</Text>
        </View>

        {/* Payment Info */}
        {data.paid_at && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 9, color: '#16A34A' }}>
              Paid on: {new Date(data.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by FleetOS — Transport Management System
          </Text>
          <Text style={styles.footerText}>
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
