import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useDriverStore } from '../../lib/driver-store';
import { useTranslation } from 'react-i18next';

export default function DriverAppLayout() {
  const { t } = useTranslation();
  const isOnline = useDriverStore((s) => s.isOnline);

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('common.offline_banner')}</Text>
        </View>
      )}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#F97316',
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E2E8F0',
            height: 70,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          headerStyle: { backgroundColor: '#1A3C6E' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('home.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pod"
          options={{
            title: t('pod.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="camera" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: t('expenses.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="salary"
          options={{
            title: t('salary.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('profile.title'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="trip"
          options={{
            href: null,
            title: t('trip.title'),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
});
