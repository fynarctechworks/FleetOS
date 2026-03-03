import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  Modal, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useDriverStore } from '../../lib/driver-store';
import { useAuthStore } from '../../lib/auth-store';

type ExpenseType = 'diesel' | 'toll' | 'misc';

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const trip = useDriverStore((s) => s.currentTrip);
  const driver = useDriverStore((s) => s.driver);
  const { appUser } = useAuthStore();
  const [activeType, setActiveType] = useState<ExpenseType | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [litres, setLitres] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState('');
  const [station, setStation] = useState('');
  const [odometer, setOdometer] = useState('');
  const [amount, setAmount] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const fetchTodayTotal = useCallback(async () => {
    if (!trip) return;
    const today = new Date().toISOString().split('T')[0];

    const [diesel, toll] = await Promise.all([
      supabase
        .from('diesel_entries')
        .select('total_cost')
        .eq('trip_id', trip.id)
        .gte('created_at', today),
      supabase
        .from('trip_costs')
        .select('amount')
        .eq('trip_id', trip.id)
        .gte('created_at', today),
    ]);

    const dieselTotal = (diesel.data ?? []).reduce((s, d) => s + (d.total_cost ?? 0), 0);
    const tollTotal = (toll.data ?? []).reduce((s, d) => s + (d.amount ?? 0), 0);
    setTodayTotal(dieselTotal + tollTotal);
  }, [trip]);

  useEffect(() => { fetchTodayTotal(); }, [fetchTodayTotal]);

  const resetForm = () => {
    setLitres(''); setPricePerLitre(''); setStation(''); setOdometer('');
    setAmount(''); setLocation(''); setDescription('');
    setActiveType(null);
  };

  const submitDiesel = async () => {
    if (!trip || !driver || !appUser) return;
    const l = parseFloat(litres);
    const p = parseFloat(pricePerLitre);
    const odo = parseInt(odometer, 10);
    if (isNaN(l) || isNaN(p) || l <= 0 || p <= 0) {
      Alert.alert(t('common.error'), 'Enter valid litres and price');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('diesel_entries').insert({
      company_id: trip.company_id,
      trip_id: trip.id,
      vehicle_id: trip.vehicle_id,
      driver_id: driver.id,
      litres: l,
      price_per_litre: p,
      total_cost: l * p,
      station_name: station || null,
      odometer_at_fill: isNaN(odo) ? trip.odometer_start : odo,
      filled_at: new Date().toISOString(),
      entered_by: appUser.id,
    });

    setSaving(false);
    if (error) { Alert.alert(t('common.error'), error.message); return; }
    Alert.alert(t('expenses.saved'));
    resetForm();
    fetchTodayTotal();
  };

  const submitToll = async () => {
    if (!trip) return;
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) {
      Alert.alert(t('common.error'), 'Enter valid amount');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('trips')
      .update({ total_toll_cost: (trip.total_toll_cost ?? 0) + a })
      .eq('id', trip.id);

    setSaving(false);
    if (error) { Alert.alert(t('common.error'), error.message); return; }
    Alert.alert(t('expenses.saved'));
    resetForm();
    fetchTodayTotal();
  };

  const submitMisc = async () => {
    if (!trip) return;
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) {
      Alert.alert(t('common.error'), 'Enter valid amount');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('trips')
      .update({ total_misc_cost: (trip.total_misc_cost ?? 0) + a })
      .eq('id', trip.id);

    setSaving(false);
    if (error) { Alert.alert(t('common.error'), error.message); return; }
    Alert.alert(t('expenses.saved'));
    resetForm();
    fetchTodayTotal();
  };

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('home.no_trip')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Today's total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>{t('expenses.today_total')}</Text>
        <Text style={styles.totalValue}>₹{todayTotal.toLocaleString('en-IN')}</Text>
      </View>

      {/* Expense type buttons */}
      <View style={styles.typeRow}>
        <TouchableOpacity style={[styles.typeButton, styles.dieselBtn]} onPress={() => setActiveType('diesel')}>
          <Ionicons name="water" size={36} color="#FFF" />
          <Text style={styles.typeText}>{t('expenses.diesel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeButton, styles.tollBtn]} onPress={() => setActiveType('toll')}>
          <Ionicons name="card" size={36} color="#FFF" />
          <Text style={styles.typeText}>{t('expenses.toll')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeButton, styles.miscBtn]} onPress={() => setActiveType('misc')}>
          <Ionicons name="receipt" size={36} color="#FFF" />
          <Text style={styles.typeText}>{t('expenses.misc')}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom sheet modal */}
      <Modal visible={activeType !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeType === 'diesel' ? t('expenses.diesel') : activeType === 'toll' ? t('expenses.toll') : t('expenses.misc')}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {activeType === 'diesel' && (
                <>
                  <Text style={styles.inputLabel}>{t('expenses.litres')}</Text>
                  <TextInput style={styles.input} keyboardType="decimal-pad" value={litres} onChangeText={setLitres} placeholder="0" />
                  <Text style={styles.inputLabel}>{t('expenses.price_per_litre')}</Text>
                  <TextInput style={styles.input} keyboardType="decimal-pad" value={pricePerLitre} onChangeText={setPricePerLitre} placeholder="0" />
                  <Text style={styles.inputLabel}>{t('expenses.station')}</Text>
                  <TextInput style={styles.input} value={station} onChangeText={setStation} placeholder="Optional" />
                  <Text style={styles.inputLabel}>{t('expenses.odometer')}</Text>
                  <TextInput style={styles.input} keyboardType="number-pad" value={odometer} onChangeText={setOdometer} placeholder="0" />
                  {litres && pricePerLitre && (
                    <Text style={styles.calcTotal}>
                      Total: ₹{(parseFloat(litres || '0') * parseFloat(pricePerLitre || '0')).toLocaleString('en-IN')}
                    </Text>
                  )}
                  <TouchableOpacity style={styles.submitBtn} onPress={submitDiesel} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>{t('expenses.submit')}</Text>}
                  </TouchableOpacity>
                </>
              )}
              {activeType === 'toll' && (
                <>
                  <Text style={styles.inputLabel}>{t('expenses.amount')}</Text>
                  <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" />
                  <Text style={styles.inputLabel}>{t('expenses.location')}</Text>
                  <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Optional" />
                  <TouchableOpacity style={styles.submitBtn} onPress={submitToll} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>{t('expenses.submit')}</Text>}
                  </TouchableOpacity>
                </>
              )}
              {activeType === 'misc' && (
                <>
                  <Text style={styles.inputLabel}>{t('expenses.amount')}</Text>
                  <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" />
                  <Text style={styles.inputLabel}>{t('expenses.description')}</Text>
                  <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" />
                  <TouchableOpacity style={styles.submitBtn} onPress={submitMisc} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>{t('expenses.submit')}</Text>}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  emptyText: { fontSize: 16, color: '#94A3B8' },
  totalCard: {
    backgroundColor: '#1A3C6E', borderRadius: 16, padding: 20, marginBottom: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 14, color: '#94A3B8' },
  totalValue: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1, borderRadius: 16, paddingVertical: 30, alignItems: 'center',
    justifyContent: 'center', minHeight: 120,
  },
  dieselBtn: { backgroundColor: '#0EA5E9' },
  tollBtn: { backgroundColor: '#F97316' },
  miscBtn: { backgroundColor: '#8B5CF6' },
  typeText: { fontSize: 15, fontWeight: '700', color: '#FFF', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A3C6E' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, color: '#1E293B',
  },
  calcTotal: { fontSize: 16, fontWeight: '700', color: '#16A34A', marginTop: 12, textAlign: 'right' },
  submitBtn: {
    backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 20, minHeight: 56,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
