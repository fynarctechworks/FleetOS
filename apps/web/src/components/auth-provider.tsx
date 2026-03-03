'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';

const PUBLIC_ROUTES = ['/login', '/onboarding', '/track'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setSupabaseUser, setAppUser, setLoading, setNeedsOnboarding, reset } =
    useAuthStore();

  useEffect(() => {
    // Check current session
    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        if (!PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
          router.push('/login');
        }
        return;
      }

      setSupabaseUser(session.user);

      // Fetch app user from our users table
      const { data: appUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (appUser) {
        setAppUser(appUser);
        setNeedsOnboarding(false);
      } else {
        setNeedsOnboarding(true);
        if (pathname !== '/onboarding') {
          router.push('/onboarding');
        }
      }

      setLoading(false);
    }

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          reset();
          router.push('/login');
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSupabaseUser(session.user);

          const { data: appUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (appUser) {
            setAppUser(appUser);
            setNeedsOnboarding(false);
          } else {
            setNeedsOnboarding(true);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [pathname, router, setSupabaseUser, setAppUser, setLoading, setNeedsOnboarding, reset]);

  return <>{children}</>;
}
