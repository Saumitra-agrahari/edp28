import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { AppTabParamList, ItemsStackParamList, MapStackParamList, SettingsStackParamList } from '../types/navigation.types';
import { colors } from '../constants/colors';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { LiveMapScreen } from '../screens/map/LiveMapScreen';
import { GeofenceSetupScreen } from '../screens/map/GeofenceSetupScreen';
import { LocationHistoryScreen } from '../screens/map/LocationHistoryScreen';
import { ItemListScreen } from '../screens/items/ItemListScreen';
import { EditItemScreen } from '../screens/items/EditItemScreen';
import { RegisterTagScreen } from '../screens/items/RegisterTagScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { ChangePasswordScreen } from '../screens/settings/ChangePasswordScreen';
import { AlertPreferencesScreen } from '../screens/settings/AlertPreferencesScreen';
import { QuietHoursScreen } from '../screens/settings/QuietHoursScreen';
import { DeviceSettingsScreen } from '../screens/settings/DeviceSettingsScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();
const MapStack = createNativeStackNavigator<MapStackParamList>();
const ItemsStack = createNativeStackNavigator<ItemsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const MapNavigator = () => (
  <MapStack.Navigator screenOptions={{ headerShown: false }}>
    <MapStack.Screen name="LiveMap" component={LiveMapScreen} />
    <MapStack.Screen name="GeofenceSetup" component={GeofenceSetupScreen} />
    <MapStack.Screen name="LocationHistory" component={LocationHistoryScreen} />
  </MapStack.Navigator>
);

const ItemsNavigator = () => (
  <ItemsStack.Navigator screenOptions={{ headerShown: false }}>
    <ItemsStack.Screen name="ItemList" component={ItemListScreen} />
    <ItemsStack.Screen name="RegisterTag" component={RegisterTagScreen} options={{ presentation: 'modal' }} />
    <ItemsStack.Screen name="EditItem" component={EditItemScreen} options={{ presentation: 'modal' }} />
  </ItemsStack.Navigator>
);

const SettingsNavigator = () => (
  <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
    <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
    <SettingsStack.Screen name="ProfileSettings" component={ProfileScreen} />
    <SettingsStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <SettingsStack.Screen name="AlertPreferences" component={AlertPreferencesScreen} />
    <SettingsStack.Screen name="QuietHours" component={QuietHoursScreen} />
    <SettingsStack.Screen name="DeviceSettings" component={DeviceSettingsScreen} />
  </SettingsStack.Navigator>
);

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'view-dashboard';
          if (route.name === 'DashboardTab') iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          else if (route.name === 'MapTab') iconName = focused ? 'map-marker' : 'map-marker-outline';
          else if (route.name === 'ItemsTab') iconName = focused ? 'bag-personal' : 'bag-personal-outline';
          else if (route.name === 'SettingsTab') iconName = focused ? 'cog' : 'cog-outline';

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          elevation: 8,
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapNavigator} 
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="ItemsTab" 
        component={ItemsNavigator} 
        options={{ title: 'Items' }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsNavigator} 
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};