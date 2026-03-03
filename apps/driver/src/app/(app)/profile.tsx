import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useDriverStore } from '../../lib/driver-store';
import { useAuthStore } from '../../lib/auth-store';
import { daysUntilExpiry, computeComplianceStatus } from '@fleetos/shared';
import type { Language } from '@fleetos/shared';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const driver = useDriverStore((s) => s.driver);
  const { appUser, reset: resetAuth } = useAuthStore();
  const resetDriver = useDriverStore((s) => s.reset);
  const [selectedLang, setSelectedLang] = useState<Language>(i18n.language as Language);

  const changeLanguage = async (lang: Language) => {
    await i18n.changeLanguage(lang);
    setSelectedLang(lang);
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logout_confirm'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            resetAuth();
            resetDriver();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!driver) return null;

  const licenceStatus = driver.licence_expiry
    ? computeComplianceStatus(driver.licence_expiry)
    : 'valid';
  const licenceDays = driver.licence_expiry ? daysUntilExpiry(driver.licence_expiry) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#FFF" />
        </View>
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.phone}>{driver.phone}</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('profile.licence')}</Text>
          <Text style={styles.value}>{driver.licence_number ?? '—'}</Text>
        </View>
        {driver.licence_expiry && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.licence_expiry')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.value}>
                {new Date(driver.licence_expiry).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
              <View style={[styles.statusDot, {
                backgroundColor: licenceStatus === 'expired' ? '#DC2626'
                  : licenceStatus === 'expiring_soon' ? '#D97706' : '#16A34A',
              }]} />
              {licenceDays !== null && (
                <Text style={{
                  fontSize: 11,
                  color: licenceDays <= 0 ? '#DC2626' : licenceDays <= 30 ? '#D97706' : '#16A34A',
                  fontWeight: '600',
                }}>
                  {licenceDays <= 0 ? `${Math.abs(licenceDays)}d overdue` : `${licenceDays}d left`}
                </Text>
              )}
            </View>
          </View>
        )}
        {driver.emergency_contact_name && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.emergency')}</Text>
            <Text style={styles.value}>
              {driver.emergency_contact_name} ({driver.emergency_contact_phone})
            </Text>
          </View>
        )}
      </View>

      {/* Language Selector */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langButton, selectedLang === lang.code && styles.langButtonActive]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={[styles.langText, selectedLang === lang.code && styles.langTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out" size={22} color="#DC2626" />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A3C6E',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  phone: { fontSize: 14, color: '#64748B', marginTop: 4 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', width: '100%', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  label: { fontSize: 14, color: '#64748B' },
  value: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A3C6E', marginBottom: 12, alignSelf: 'flex-start' },
  langRow: { flexDirection: 'row', gap: 8, width: '100%' },
  langButton: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#F1F5F9',
    borderWidth: 2, borderColor: 'transparent',
  },
  langButtonActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  langText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  langTextActive: { color: '#F97316' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#DC2626' },
});
