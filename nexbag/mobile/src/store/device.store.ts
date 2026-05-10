import { create } from 'zustand';

export interface Device {
  id: string;
  deviceCode: string;
  deviceName: string;
  isOnline: boolean;
  firmwareVersion: string | null;
  geofenceState: string;
  lockState: string;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  lastLocationAt: string | null;
}

interface DeviceState {
  device: Device | null;
  isLoading: boolean;
  error: string | null;
  setDevice: (device: Device | null) => void;
  updateDeviceState: (updates: Partial<Device>) => void;
  clearDevice: () => void;
}

const DEFAULT_DEVICE: Device = {
  id: '',
  deviceCode: '',
  deviceName: 'Smart Bag-Pack',
  isOnline: false,
  firmwareVersion: null,
  geofenceState: 'UNKNOWN',
  lockState: 'UNKNOWN',
  lastKnownLat: null,
  lastKnownLng: null,
  lastLocationAt: null,
};

export const useDeviceStore = create<DeviceState>((set) => ({
  device: null,
  isLoading: false,
  error: null,
  
  setDevice: (device) => set({ device }),
  
  updateDeviceState: (updates) => 
    set((state) => ({ 
      device: state.device ? { ...state.device, ...updates } : { ...DEFAULT_DEVICE, ...updates },
    })),
    
  clearDevice: () => set({ device: null }),
}));
