import { create } from 'zustand';

export interface User {
  id: string;
  fullName: string;
  email: string;
  deviceId: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setDeviceId: (deviceId: string | null) => void;
  logout: () => void;
  setRestoring: (isRestoring: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isRestoring: true, // Initially true while we check for refresh token on app start
  
  setAuth: (user, accessToken) => 
    set({ user, accessToken, isAuthenticated: true }),
    
  setDeviceId: (deviceId) =>
    set((state) => ({
      user: state.user ? { ...state.user, deviceId } : null,
    })),
    
  logout: () => 
    set({ user: null, accessToken: null, isAuthenticated: false }),
    
  setRestoring: (isRestoring) => set({ isRestoring }),
}));
