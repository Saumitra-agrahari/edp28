import { NavigatorScreenParams } from '@react-navigation/native';
import { ROUTES, TAB_ROUTES } from '../constants/routes';

export type AuthStackParamList = {
  [ROUTES.SPLASH]: undefined;
  [ROUTES.ONBOARDING]: undefined;
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.OTP_VERIFICATION]: { email: string };
  [ROUTES.NEW_PASSWORD]: { resetToken: string };
};

export type DashboardStackParamList = {
  [ROUTES.DASHBOARD]: undefined;
  [ROUTES.LOCK_SCREEN]: undefined;
  [ROUTES.ACTIVITY_LOG]: undefined;
};

export type ItemsStackParamList = {
  [ROUTES.ITEM_LIST]: { filter?: 'ALL' | 'IN_BAG' | 'MISSING' };
  [ROUTES.EDIT_ITEM]: { tagId: string };
  [ROUTES.REGISTER_TAG]: { epc?: string } | undefined;
};

export type MapStackParamList = {
  [ROUTES.LIVE_MAP]: undefined;
  [ROUTES.GEOFENCE_SETUP]: undefined;
  [ROUTES.LOCATION_HISTORY]: undefined;
};

export type NotificationsStackParamList = {
  [ROUTES.NOTIFICATION_CENTER]: undefined;
};

export type SettingsStackParamList = {
  [ROUTES.SETTINGS]: undefined;
  [ROUTES.PROFILE_SETTINGS]: undefined;
  [ROUTES.CHANGE_PASSWORD]: undefined;
  [ROUTES.ALERT_PREFERENCES]: undefined;
  [ROUTES.QUIET_HOURS]: undefined;
  [ROUTES.DEVICE_SETTINGS]: undefined;
};

export type AppTabParamList = {
  [TAB_ROUTES.DASHBOARD_TAB]: NavigatorScreenParams<DashboardStackParamList>;
  [TAB_ROUTES.ITEMS_TAB]: NavigatorScreenParams<ItemsStackParamList>;
  [TAB_ROUTES.MAP_TAB]: NavigatorScreenParams<MapStackParamList>;
  [TAB_ROUTES.ALERTS_TAB]: NavigatorScreenParams<NotificationsStackParamList>;
  [TAB_ROUTES.SETTINGS_TAB]: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
  [ROUTES.SPLASH]: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  [ROUTES.PAIR_DEVICE]: undefined;
  [ROUTES.MAIN_TABS]: NavigatorScreenParams<AppTabParamList>;
  [ROUTES.LOCK_SCREEN]: undefined;
  [ROUTES.NOTIFICATION_CENTER]: undefined;
  [ROUTES.ACTIVITY_LOG]: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
