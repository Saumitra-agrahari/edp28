import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_ANDROID_HOST = '10.0.2.2';
const DEFAULT_IOS_HOST = 'localhost';

const normalizeHost = (value?: string | null): string | null => {
  if (!value) return null;
  return value.split(':')[0] ?? null;
};

const normalizeUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.replace(/\/+$/, '') : null;
};

export const getBackendHost = (): string => {
  const envHost = process.env.EXPO_PUBLIC_BACKEND_HOST;
  if (envHost) {
    return envHost;
  }

  const hostUri =
    normalizeHost(Constants.expoConfig?.hostUri) ??
    normalizeHost((Constants as any).manifest?.debuggerHost) ??
    normalizeHost((Constants as any).manifest2?.extra?.expoClient?.hostUri);

  if (hostUri) {
    return hostUri;
  }

  return Platform.OS === 'android' ? DEFAULT_ANDROID_HOST : DEFAULT_IOS_HOST;
};

export const getApiBaseUrl = (): string => {
  const envApiUrl = normalizeUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  if (envApiUrl) {
    return envApiUrl;
  }

  return `http://${getBackendHost()}:3000/v1`;
};

export const getWebSocketBaseUrl = (): string => {
  const envWsUrl = normalizeUrl(process.env.EXPO_PUBLIC_BACKEND_WS_URL);
  if (envWsUrl) {
    return envWsUrl;
  }

  return `ws://${getBackendHost()}:3000/ws`;
};