export const fcmService = {
  async requestPermission(): Promise<boolean> {
    // Mocked for Expo Go compatibility, Firebase requires a custom EAS native build
    console.log('Firebase Cloud Messaging is mocked in Expo Go.');
    return true;
  },

  async getToken(): Promise<string | null> {
    // Mocked for Expo Go
    return "mock_fcm_token_expo_go";
  },

  onTokenRefresh(callback: (token: string) => void) {
    // Return a dummy unsubscribe function
    return () => {};
  },

  onMessage(callback: (message: any) => void) {
    // Return a dummy unsubscribe function
    return () => {};
  },
  
  onNotificationOpenedApp(callback: (message: any) => void) {
     return () => {};
  },
  
  getInitialNotification() {
     return Promise.resolve(null);
  }
};
