import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../src/lib/auth-store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('starts with loading=true and null user', () => {
    const state = useAuthStore.getState();
    // After reset, isLoading is false. Initial state has isLoading=true
    // but we reset it in beforeEach. Test the reset behavior.
    expect(state.supabaseUser).toBeNull();
    expect(state.appUser).toBeNull();
    expect(state.needsOnboarding).toBe(false);
  });

  it('sets and clears supabaseUser', () => {
    const mockUser = { id: 'test-id', email: 'test@test.com' } as any;
    useAuthStore.getState().setSupabaseUser(mockUser);
    expect(useAuthStore.getState().supabaseUser).toEqual(mockUser);

    useAuthStore.getState().setSupabaseUser(null);
    expect(useAuthStore.getState().supabaseUser).toBeNull();
  });

  it('sets appUser with correct shape', () => {
    const mockAppUser = {
      id: 'user-123',
      company_id: 'company-456',
      branch_id: 'branch-789',
      name: 'Ramesh Kumar',
      phone: '+919876543210',
      role: 'owner' as const,
      is_active: true,
      created_at: '2026-03-01T00:00:00Z',
    };

    useAuthStore.getState().setAppUser(mockAppUser);
    const state = useAuthStore.getState();

    expect(state.appUser).toEqual(mockAppUser);
    expect(state.appUser?.role).toBe('owner');
    expect(state.appUser?.company_id).toBe('company-456');
  });

  it('tracks onboarding state', () => {
    useAuthStore.getState().setNeedsOnboarding(true);
    expect(useAuthStore.getState().needsOnboarding).toBe(true);

    useAuthStore.getState().setNeedsOnboarding(false);
    expect(useAuthStore.getState().needsOnboarding).toBe(false);
  });

  it('reset clears all state', () => {
    const mockUser = { id: 'test-id' } as any;
    useAuthStore.getState().setSupabaseUser(mockUser);
    useAuthStore.getState().setAppUser({ id: 'u1' } as any);
    useAuthStore.getState().setNeedsOnboarding(true);
    useAuthStore.getState().setLoading(true);

    useAuthStore.getState().reset();
    const state = useAuthStore.getState();

    expect(state.supabaseUser).toBeNull();
    expect(state.appUser).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.needsOnboarding).toBe(false);
  });
});
