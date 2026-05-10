import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount });
  },
  
  addNotification: (notification) => {
    const current = get().notifications;
    // prevent duplicates if received via FCM and API
    if (!current.some(n => n.id === notification.id)) {
      set({ 
        notifications: [notification, ...current],
        unreadCount: get().unreadCount + 1
      });
    }
  },
  
  markAsRead: (id) => 
    set((state) => {
      const updated = state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      return { 
        notifications: updated,
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    }),
    
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    })),
}));
