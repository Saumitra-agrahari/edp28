export const ROUTES = {
  // Unauthenticated
  SPLASH: 'Splash',
  ONBOARDING: 'Onboarding',
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  OTP_VERIFICATION: 'OtpVerification',
  NEW_PASSWORD: 'NewPassword',

  // Authenticated (No Device)
  PAIR_DEVICE: 'PairDevice',

  // Main App (Authenticated & Paired)
  MAIN_TABS: 'MainTabs',
  
  // Dashboard Stack
  DASHBOARD: 'Dashboard',
  LOCK_SCREEN: 'LockScreen',
  ACTIVITY_LOG: 'ActivityLog',

  // Items Stack
  ITEM_LIST: 'ItemList',
  EDIT_ITEM: 'EditItem',
  REGISTER_TAG: 'RegisterTag',

  // Map Stack
  LIVE_MAP: 'LiveMap',
  GEOFENCE_SETUP: 'GeofenceSetup',
  LOCATION_HISTORY: 'LocationHistory',

  // Notifications Stack
  NOTIFICATION_CENTER: 'NotificationCenter',

  // Settings Stack
  SETTINGS: 'Settings',
  SETTINGS_MAIN: 'SettingsMain',
  PROFILE_SETTINGS: 'ProfileSettings',
  CHANGE_PASSWORD: 'ChangePassword',
  ALERT_PREFERENCES: 'AlertPreferences',
  QUIET_HOURS: 'QuietHours',
  DEVICE_SETTINGS: 'DeviceSettings',
} as const;

// Bottom Tab Routes
export const TAB_ROUTES = {
  DASHBOARD_TAB: 'DashboardTab',
  ITEMS_TAB: 'ItemsTab',
  MAP_TAB: 'MapTab',
  ALERTS_TAB: 'AlertsTab',
  SETTINGS_TAB: 'SettingsTab',
} as const;
