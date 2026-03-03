import { View, Text, StyleSheet } from 'react-native';

export default function DriverHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FleetOS</Text>
      <Text style={styles.subtitle}>Driver App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A3C6E',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },
});
