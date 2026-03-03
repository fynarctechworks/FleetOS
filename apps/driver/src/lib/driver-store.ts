import { create } from 'zustand';
import type { Driver, Trip, TripStatus } from '@fleetos/shared';

interface DriverState {
  driver: Driver | null;
  currentTrip: Trip | null;
  isTracking: boolean;
  isOnline: boolean;
  setDriver: (driver: Driver | null) => void;
  setCurrentTrip: (trip: Trip | null) => void;
  setTracking: (tracking: boolean) => void;
  setOnline: (online: boolean) => void;
  updateTripStatus: (status: TripStatus) => void;
  reset: () => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  driver: null,
  currentTrip: null,
  isTracking: false,
  isOnline: true,
  setDriver: (driver) => set({ driver }),
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setTracking: (tracking) => set({ isTracking: tracking }),
  setOnline: (online) => set({ isOnline: online }),
  updateTripStatus: (status) =>
    set((state) => ({
      currentTrip: state.currentTrip ? { ...state.currentTrip, status } : null,
    })),
  reset: () =>
    set({
      driver: null,
      currentTrip: null,
      isTracking: false,
    }),
}));
