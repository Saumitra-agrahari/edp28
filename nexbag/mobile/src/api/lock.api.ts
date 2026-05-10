import { apiClient } from './client';

const generateUuidV4 = (): string => {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const lockApi = {
  getStatus: async () => {
    const response = await apiClient.get('/lock/status');
    return response.data;
  },

  sendCommand: async (action: 'LOCK' | 'UNLOCK') => {
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : generateUuidV4();

    // Backend expects snake_case idempotency_key.
    const response = await apiClient.post('/lock/command', {
      action,
      idempotency_key: idempotencyKey,
    });
    return response.data;
  },

  getHistory: async (limit?: number) => {
    const params = limit ? { limit } : {};
    const response = await apiClient.get('/lock/history', { params });
    return response.data;
  },
};
