import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { storageService } from '../services/storage.service';
import Toast from 'react-native-toast-message';

const normalizeUser = (user: any) => ({
  id: user.id,
  fullName: user.full_name ?? user.fullName ?? 'User',
  email: user.email,
  deviceId: user.device_id ?? user.deviceId ?? null,
});

const normalizeTokens = (tokens: any) => ({
  accessToken: tokens.access_token ?? tokens.accessToken,
  refreshToken: tokens.refresh_token ?? tokens.refreshToken,
});

const readAuthPayload = (data: any) => data?.data ?? data;

export const useAuth = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const logoutState = useAuthStore((state) => state.logout);

  const getLoginErrorToast = (error: any) => {
    const message = String(error?.message ?? '').toLowerCase();

    if (message.includes('invalid email or password')) {
      return {
        text1: 'Wrong Password',
        text2: 'The password you entered is incorrect.',
      };
    }

    if (message.includes('account') && message.includes('locked')) {
      return {
        text1: 'Account Locked',
        text2: error?.message || 'Too many failed attempts. Please try again later.',
      };
    }

    return {
      text1: 'Login Error',
      text2: error?.message || 'Unable to login right now.',
    };
  };

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data: any) => {
      try {
        const payload = readAuthPayload(data);
        const user = payload?.user ? normalizeUser(payload.user) : null;
        const tokens = normalizeTokens(payload?.tokens ?? payload ?? {});

        if (!user || !tokens.accessToken || !tokens.refreshToken) {
          throw new Error('Login succeeded, but the server returned an invalid auth payload.');
        }

        await storageService.setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        await storageService.setRefreshToken(tokens.refreshToken);
        await storageService.setAuthUser(user);

        setAuth(user, tokens.accessToken);

        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: `Welcome back, ${user.fullName}!`,
        });
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: error.message || 'Could not complete login.',
        });
        throw error;
      }
    },
    onError: (error: any) => {
      const toast = getLoginErrorToast(error);
      Toast.show({
        type: 'error',
        text1: toast.text1,
        text2: toast.text2,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data: any) => {
      try {
        const payload = readAuthPayload(data);
        const user = payload?.user ? normalizeUser(payload.user) : null;
        const tokens = normalizeTokens(payload?.tokens ?? payload ?? {});

        if (user && tokens.accessToken && tokens.refreshToken) {
          await storageService.setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          await storageService.setRefreshToken(tokens.refreshToken);
          await storageService.setAuthUser(user);
          setAuth(user, tokens.accessToken);
        }

        Toast.show({
          type: 'success',
          text1: 'Registration Successful',
          text2: 'Welcome to Smart Bag-Pack!',
        });
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: error.message || 'Could not create account.',
        });
        throw error;
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error.message || 'Could not create account.',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = await storageService.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    },
    onSettled: async () => {
      await storageService.removeTokens();
      await storageService.removeRefreshToken();
      await storageService.removeAuthUser();
      logoutState();
    },
  });

  return {
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
};
