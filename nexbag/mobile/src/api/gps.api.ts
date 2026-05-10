import { apiClient } from './client';

export const gpsApi = {
  getCurrentLocation: async () => {
    const response = await apiClient.get('/gps/current');
    return response.data;
  },

  getHistory: async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    const response = await apiClient.get('/gps/history', { params });
    return response.data;
  },

  getGeofence: async () => {
    const response = await apiClient.get('/gps/geofence');
    return response.data;
  },

  updateGeofence: async (data: { 
    isEnabled: boolean; 
    centerLat?: number; 
    centerLng?: number; 
    radiusMeters?: number 
  }) => {
    const response = await apiClient.put('/gps/geofence', data);
    return response.data;
  },
};
