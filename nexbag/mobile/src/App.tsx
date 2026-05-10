import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './navigation/RootNavigator';
import { colors } from './constants/colors';
import { useAuthStore } from './store/auth.store';
import { storageService } from './services/storage.service';

const queryClient = new QueryClient();

export default function App() {
  const { setRestoring, setAuth, setDeviceId } = useAuthStore();

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const [tokens, user] = await Promise.all([
          storageService.getTokens(),
          storageService.getAuthUser(),
        ]);

        if (tokens?.accessToken) {
          setAuth(
            user ?? { id: 'restored', email: '', fullName: 'User', deviceId: null },
            tokens.accessToken
          );
        }
        
        const deviceId = await storageService.getDeviceId();
        if (deviceId) {
           setDeviceId(deviceId);
        }
      } catch (error) {
         console.warn("Failed to restore Auth state:", error);
      } finally {
        setRestoring(false);
      }
    };
    bootstrapAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.surface} />
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
