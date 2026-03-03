import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'expo-router';

const menuItems = [
  { icon: 'book-outline' as const, label: 'Address Book', route: '/address-book' },
  { icon: 'business-outline' as const, label: 'Branches', route: '/branches' },
  { icon: 'document-text-outline' as const, label: 'LR / Bilty', route: '/lr' },
  { icon: 'map-outline' as const, label: 'Trips', route: '/trips' },
  { icon: 'water-outline' as const, label: 'Diesel', route: '/diesel' },
  { icon: 'shield-checkmark-outline' as const, label: 'Compliance', route: '/compliance' },
  { icon: 'construct-outline' as const, label: 'Maintenance', route: '/maintenance' },
  { icon: 'navigate-outline' as const, label: 'GPS Tracking', route: '/tracking' },
  { icon: 'cash-outline' as const, label: 'Finance', route: '/finance' },
];

export default function MoreScreen() {
  const { appUser } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* User Info */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#FFFFFF" />
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.userName}>{appUser?.name || 'Fleet Owner'}</Text>
          <Text style={styles.userRole}>{appUser?.role || 'owner'}</Text>
        </View>
      </View>

      {/* Menu Items */}
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={styles.menuItem}
          activeOpacity={0.7}
        >
          <Ionicons name={item.icon} size={22} color="#1A3C6E" />
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>
      ))}

      {/* Logout */}
      <TouchableOpacity style={[styles.menuItem, { marginTop: 16 }]} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
        <Text style={[styles.menuLabel, { color: '#DC2626' }]}>Logout</Text>
        <View />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A3C6E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  userRole: { fontSize: 14, color: '#64748B', textTransform: 'capitalize' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuLabel: { flex: 1, fontSize: 16, color: '#1E293B', marginLeft: 12 },
});
