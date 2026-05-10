import { apiClient } from './client';

export const rfidApi = {
  getTags: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/rfid/tags', { params });
    return response.data;
  },

  getLiveStatus: async () => {
    const response = await apiClient.get('/rfid/live');
    return response.data;
  },

  registerTag: async (data: { tagId: string; alias?: string; icon?: string }) => {
    const response = await apiClient.post('/rfid/tags', data);
    return response.data;
  },

  updateTag: async (tagId: string, data: { alias?: string; icon?: string; isActive?: boolean }) => {
    const response = await apiClient.patch(`/rfid/tags/${tagId}`, {
      ...(data.alias !== undefined ? { alias: data.alias } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
    });
    return response.data;
  },

  deleteTag: async (tagId: string) => {
    const response = await apiClient.delete(`/rfid/tags/${tagId}`);
    return response.data;
  },
};
