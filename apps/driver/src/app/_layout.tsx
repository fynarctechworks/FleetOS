import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { defineLocationTask } from '@/lib/location-service';
import '@/lib/i18n';

// Register background location task at module level
defineLocationTask();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { supabaseUser, isLoading, setSupabaseUser, setAppUser, setLoading, reset } = useAuthStore();

  useEffect(() => {
    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setSupabaseUser(session.user);

        const { data: appUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (appUser) {
          setAppUser(appUser);
        }
      }

      setLoading(false);
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          reset();
          return;
        }

        setSupabaseUser(session.user);

        const { data: appUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (appUser) {
          setAppUser(appUser);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setSupabaseUser, setAppUser, setLoading, reset]);

  // Auth routing guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!supabaseUser && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (supabaseUser && inAuthGroup) {
      router.replace('/');
    }
  }, [supabaseUser, isLoading, segments, router]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1A3C6E' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: 'FleetOS Driver' }} />
      </Stack>
    </>
  );
}
