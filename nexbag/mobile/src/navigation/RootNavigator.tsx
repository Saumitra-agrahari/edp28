import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/colors';
import { useAuthStore } from '../store/auth.store';
import { useFCM } from '../hooks/useFCM';
import { useWebSocket } from '../hooks/useWebSocket';

import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { LockScreen } from '../screens/lock/LockScreen';
import { NotificationCenterScreen } from '../screens/notifications/NotificationCenterScreen';
import { ActivityLogScreen } from '../screens/notifications/ActivityLogScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isRestoring } = useAuthStore();
  useWebSocket();
  useFCM();

  if (isRestoring) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
        <Stack.Screen 
          name="LockScreen" 
          component={LockScreen} 
          options={{ presentation: 'fullScreenModal' }} 
        />
        <Stack.Screen 
          name="NotificationCenter" 
          component={NotificationCenterScreen} 
          options={{ presentation: 'card' }} 
        />
        <Stack.Screen
          name="ActivityLog"
          component={ActivityLogScreen}
          options={{ presentation: 'card' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};