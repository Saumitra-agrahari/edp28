import { create } from 'zustand';

export interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
}

export interface GeofenceConfig {
  isEnabled: boolean;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}

interface GpsState {
  currentLocation: LocationInfo | null;
  geofence: GeofenceConfig | null;
  history: LocationInfo[];
  setCurrentLocation: (location: LocationInfo) => void;
  setGeofence: (geofence: GeofenceConfig | null) => void;
}

export const useGpsStore = create<GpsState>((set) => ({
  currentLocation: null,
  geofence: null,
  history: [],
  
  setCurrentLocation: (location) => set({ currentLocation: location }),
  setGeofence: (geofence) => set({ geofence }),
}));
