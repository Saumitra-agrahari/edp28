import { apiClient } from './client';

export const activityLogApi = {
  getActivityLogs: async (params?: {
    cursor?: string;
    limit?: number;
    event_type?: string;
    from?: string;
    to?: string;
  }) => {
    const response = await apiClient.get('/activity-logs', { params });
    return response.data;
  },
};
