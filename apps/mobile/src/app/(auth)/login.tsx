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

export default function LoginScreen() {
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
      setError('Enter a valid 10-digit phone number');
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
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter a valid 6-digit OTP');
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
        setError('Verification failed. Please try again.');
        return;
      }

      // Call set-custom-claims
      const { data: session } = await supabase.auth.getSession();
      const { data: claimsResult } = await supabase.functions.invoke('set-custom-claims', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (claimsResult?.data?.needs_onboarding) {
        router.replace('/onboarding');
      } else {
        await supabase.auth.refreshSession();
        router.replace('/');
      }
    } catch {
      setError('Verification failed. Please try again.');
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
            <Text style={styles.logoText}>F</Text>
          </View>
          <Text style={styles.title}>FleetOS</Text>
          <Text style={styles.subtitle}>Transport Management System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.heading}>Log in to your account</Text>
              <Text style={styles.description}>
                Enter your phone number to receive a one-time password
              </Text>

              <Text style={styles.label}>Phone Number</Text>
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.heading}>Enter OTP</Text>
              <Text style={styles.description}>
                We sent a 6-digit code to {fullPhone}
              </Text>

              <Text style={styles.label}>One-Time Password</Text>
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Login</Text>
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
                <Text style={styles.backText}>← Change phone number</Text>
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
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1A3C6E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 16,
    color: '#64748B',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#1A3C6E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: '#64748B',
    fontSize: 14,
  },
});
