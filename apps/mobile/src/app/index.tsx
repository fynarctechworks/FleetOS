import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function IndexScreen() {
  const { supabaseUser, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C6E" />
      </View>
    );
  }

  if (!supabaseUser) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
});
