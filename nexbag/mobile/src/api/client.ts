import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { storageService } from '../services/storage.service';
import Toast from 'react-native-toast-message';
import { getApiBaseUrl } from '../config/network';

const BASE_URL = getApiBaseUrl();

console.log('API Base URL:', BASE_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getApiErrorMessage = (error: any): string | undefined => {
  return (
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    error?.message
  );
};

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & 429
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url ?? '';
    const isPublicAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/password/forgot') ||
      requestUrl.includes('/auth/password/verify-otp') ||
      requestUrl.includes('/auth/password/reset');

    const parsedMessage = getApiErrorMessage(error);
    if (parsedMessage) {
      error.message = parsedMessage;
    }

    // Handle Rate Limit (429)
    if (error.response?.status === 429) {
      Toast.show({
        type: 'error',
        text1: 'Too Many Requests',
        text2: 'Please try again later.',
      });
      return Promise.reject(error);
    }

    // Handle Unauthorized (401) - Token refresh logic
    if (
      error.response?.status === 401 &&
      !isPublicAuthRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storageService.getRefreshToken();
        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        // Call refresh endpoint directly using axios to avoid circular dependency
        const refreshResponse = await axios.post(`${BASE_URL}/auth/token/refresh`, {
          refresh_token: refreshToken,
        });

        const refreshPayload = refreshResponse.data.data ?? refreshResponse.data;
        const newAccessToken = refreshPayload.tokens?.access_token ?? refreshPayload.access_token;
        const newRefreshToken = refreshPayload.tokens?.refresh_token ?? refreshPayload.refresh_token;

        // Save new tokens
        await storageService.setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
        await storageService.setRefreshToken(newRefreshToken);
        
        // Update user state if provided in refresh response
        if (refreshPayload.user) {
            useAuthStore.getState().setAuth({
              id: refreshPayload.user.id,
              fullName: refreshPayload.user.full_name ?? refreshPayload.user.fullName ?? 'User',
              email: refreshPayload.user.email,
              deviceId: refreshPayload.user.device_id ?? refreshPayload.user.deviceId ?? null,
            }, newAccessToken);
        } else {
            // Alternatively, just update the token if the action supports it
            useAuthStore.setState({ accessToken: newAccessToken });
        }


        // Retry original request 
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed, logout user
        await storageService.removeRefreshToken();
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
