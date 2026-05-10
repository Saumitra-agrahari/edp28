import { useEffect } from 'react';
import { Platform } from 'react-native';
import axios from 'axios';
import { fcmService } from '../services/fcm.service';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from '../api/client';
import Toast from 'react-native-toast-message';
import { getBackendHost } from '../config/network';

export const useFCM = () => {
  const { isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    const setupFCM = async () => {
      const hasPermission = await fcmService.requestPermission();
      if (!hasPermission) return;

      const registerToken = async (fcmToken: string) => {
        const platform = Platform.OS === 'android' ? 'android' : 'ios';

        try {
          await apiClient.post('/users/me/fcm-token', { fcm_token: fcmToken, platform });
          return;
        } catch (error: any) {
          const isNetworkError = !error?.response;
          if (!isNetworkError || !accessToken) {
            throw error;
          }
        }

        // Fallback: if backend IP changed and axios baseURL is stale, try detected host.
        const fallbackUrl = `http://${getBackendHost()}:3000/v1/users/me/fcm-token`;
        await axios.post(
          fallbackUrl,
          { fcm_token: fcmToken, platform },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
      };

      const token = await fcmService.getToken();
      if (token && isMounted) {
        try {
          await registerToken(token);
        } catch (error) {
          // Keep FCM failure non-blocking to avoid app redbox/noisy crashes.
          console.warn('Failed to register FCM token', error);
        }
      }
    };

    setupFCM();

    const unsubscribeTokenRefresh = fcmService.onTokenRefresh(async (newToken) => {
        try {
           const platform = Platform.OS === 'android' ? 'android' : 'ios';
           await apiClient.post('/users/me/fcm-token', { fcm_token: newToken, platform });
        } catch (error: any) {
           if (accessToken && !error?.response) {
             try {
               await axios.post(
                 `http://${getBackendHost()}:3000/v1/users/me/fcm-token`,
                 { fcm_token: newToken, platform: Platform.OS === 'android' ? 'android' : 'ios' },
                 {
                   headers: {
                     Authorization: `Bearer ${accessToken}`,
                     'Content-Type': 'application/json',
                   },
                   timeout: 15000,
                 }
               );
               return;
             } catch {
               // fall through to warning below
             }
           }
           console.warn('Failed to update FCM token', error);
        }
    });

    const unsubscribeOnMessage = fcmService.onMessage((remoteMessage) => {
       // Handle foreground message
       Toast.show({
          type: Object.keys(remoteMessage.data || {}).includes('isAlert') ? 'error' : 'info',
          text1: remoteMessage.notification?.title || 'New Notification',
          text2: remoteMessage.notification?.body,
          onPress: () => {
             // Handle navigation
          }
       });
    });

    return () => {
      isMounted = false;
      unsubscribeTokenRefresh();
      unsubscribeOnMessage();
    };
  }, [isAuthenticated, accessToken]);
};
