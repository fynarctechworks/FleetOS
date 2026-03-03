import { create } from 'zustand';
import type { User as AppUser } from '@fleetos/shared';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthState {
  supabaseUser: SupabaseUser | null;
  appUser: AppUser | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  setSupabaseUser: (user: SupabaseUser | null) => void;
  setAppUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsOnboarding: (needs: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  supabaseUser: null,
  appUser: null,
  isLoading: true,
  needsOnboarding: false,
  setSupabaseUser: (user) => set({ supabaseUser: user }),
  setAppUser: (user) => set({ appUser: user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setNeedsOnboarding: (needs) => set({ needsOnboarding: needs }),
  reset: () =>
    set({
      supabaseUser: null,
      appUser: null,
      isLoading: false,
      needsOnboarding: false,
    }),
}));
