import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKENS_KEY = 'auth_tokens';
const AUTH_USER_KEY = 'auth_user';
const DEVICE_ID_KEY = 'paired_device_id';
const ONBOARDING_SHOWN_KEY = 'onboarding_shown';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const storageService = {
  // Use AsyncStorage instead of EncryptedStorage to support Expo Go without custom native builds
  async setTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Error saving tokens', error);
    }
  },

  async getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
       const val = await AsyncStorage.getItem(TOKENS_KEY);
       return val ? JSON.parse(val) : null;
    } catch (error) {
      console.error('Error getting tokens', error);
      return null;
    }
  },

  async removeTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKENS_KEY);
    } catch (error) {
      console.error('Error removing tokens', error);
    }
  },

  async setAuthUser(user: { id: string; fullName: string; email: string; deviceId: string | null }): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving auth user', error);
    }
  },

  async getAuthUser(): Promise<{ id: string; fullName: string; email: string; deviceId: string | null } | null> {
    try {
      const value = await AsyncStorage.getItem(AUTH_USER_KEY);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting auth user', error);
      return null;
    }
  },

  async removeAuthUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    } catch (error) {
      console.error('Error removing auth user', error);
    }
  },
  
  async getDeviceId(): Promise<string | null> {
     try {
       return await AsyncStorage.getItem(DEVICE_ID_KEY);
     } catch (e) {
       return null;
     }
  },

  async setOnboardingShown(shown: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_SHOWN_KEY, JSON.stringify(shown));
    } catch (error) {
      console.error('Error saving onboarding state', error);
    }
  },

  async getOnboardingShown(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_SHOWN_KEY);
      return value !== null ? JSON.parse(value) : false;
    } catch (error) {
      console.error('Error getting onboarding state', error);
      return false;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving refresh token', error);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token', error);
      return null;
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing refresh token', error);
    }
  },
};
