import { apiClient } from './client';

export const deviceApi = {
  pairDevice: async (deviceCode: string) => {
    const response = await apiClient.post('/devices/pair', { deviceCode });
    return response.data;
  },

  getDevice: async () => {
    const response = await apiClient.get('/devices/me');
    return response.data;
  },

  updateDevice: async (deviceName: string) => {
    const response = await apiClient.patch('/devices/me', { deviceName });
    return response.data;
  },

  unpairDevice: async () => {
    const response = await apiClient.delete('/devices/me/unpair');
    return response.data;
  },
};
