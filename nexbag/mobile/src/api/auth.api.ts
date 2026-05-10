import { apiClient } from './client';

export const authApi = {
  register: async (data: any) => {
    const response = await apiClient.post('/auth/register', {
      full_name: data.fullName,
      email: data.email,
      password: data.password,
      confirm_password: data.confirmPassword ?? data.password,
    });
    return response.data;
  },

  login: async (data: any) => {
    const response = await apiClient.post('/auth/login', {
      email: data.email,
      password: data.password,
      remember_me: data.rememberMe ?? false,
    });
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/password/forgot', { email });
    return response.data;
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const response = await apiClient.post('/auth/password/verify-otp', data);
    return response.data;
  },

  resetPassword: async (data: any) => {
    const response = await apiClient.post('/auth/password/reset', {
      reset_token: data.resetToken,
      new_password: data.newPassword,
      confirm_password: data.confirmPassword ?? data.newPassword,
    });
    return response.data;
  },
};
