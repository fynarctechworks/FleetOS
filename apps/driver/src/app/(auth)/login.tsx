import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Step = 'phone' | 'otp';

export default function DriverLoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSendOtp() {
    setError('');
    const trimmed = phone.trim();

    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      setError('सही 10 अंकों का फ़ोन नंबर दर्ज करें');
      return;
    }

    setIsLoading(true);
    const normalizedPhone = `+91${trimmed}`;

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setFullPhone(normalizedPhone);
      setStep('otp');
    } catch {
      setError('OTP भेजने में विफल। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('सही 6 अंकों का OTP दर्ज करें');
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      if (!authData.user) {
        setError('सत्यापन विफल। कृपया पुनः प्रयास करें।');
        return;
      }

      // Set custom claims
      const { data: session } = await supabase.auth.getSession();
      await supabase.functions.invoke('set-custom-claims', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      await supabase.auth.refreshSession();
      router.replace('/');
    } catch {
      setError('सत्यापन विफल। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🚛</Text>
          </View>
          <Text style={styles.title}>FleetOS Driver</Text>
          <Text style={styles.subtitle}>ड्राइवर ऐप / డ్రైవర్ యాప్</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.heading}>लॉगिन / Login</Text>
              <Text style={styles.description}>
                अपना फ़ोन नंबर दर्ज करें{'\n'}Enter your phone number
              </Text>

              <Text style={styles.label}>फ़ोन नंबर / Phone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Text style={styles.buttonText}>OTP भेजें / Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.heading}>OTP दर्ज करें / Enter OTP</Text>
              <Text style={styles.description}>
                {fullPhone} पर भेजा गया 6-अंकों का कोड दर्ज करें
              </Text>

              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Text style={styles.buttonText}>सत्यापित करें / Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                style={styles.backButton}
              >
                <Text style={styles.backText}>← नंबर बदलें / Change number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A3C6E',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  prefix: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#CBD5E1',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    color: '#1E293B',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 16,
  },
  error: {
    color: '#DC2626',
    fontSize: 15,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: '#64748B',
    fontSize: 15,
  },
});
