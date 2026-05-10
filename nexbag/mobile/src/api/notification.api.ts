import { apiClient } from './client';

export const notificationApi = {
  getNotifications: async (params?: { cursor?: string; limit?: number; unreadOnly?: boolean; type?: string }) => {
    const query = {
      cursor: params?.cursor,
      limit: params?.limit,
      unread_only: params?.unreadOnly,
      type: params?.type,
    };
    const response = await apiClient.get('/notifications', { params: query });
    return response.data;
  },

  markRead: async (id: string) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data;
  },

  getPreferences: async () => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (preferences: { notificationType: string; isEnabled: boolean }[]) => {
    // API might accept array or object, assuming format based on general norms
    const response = await apiClient.put('/notifications/preferences', { preferences });
    return response.data;
  },
};
