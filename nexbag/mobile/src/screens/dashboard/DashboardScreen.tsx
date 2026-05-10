import React, { useEffect } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/auth.store';
import { useDeviceStore } from '../../store/device.store';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import { LockWidget } from '../../components/LockWidget';
import { ItemsSummaryWidget } from '../../components/ItemsSummaryWidget';
import { MiniMapWidget } from '../../components/MiniMapWidget';
import { RecentActivityWidget } from '../../components/RecentActivityWidget';
import { HomeAlertsWidget } from '../../components/HomeAlertsWidget';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { webSocketService } from '../../services/websocket.service';
import { ROUTES, TAB_ROUTES } from '../../constants/routes';
import { notificationApi } from '../../api/notification.api';
import { Audio } from 'expo-av';

export const DashboardScreen = () => {
  const { user } = useAuthStore();
  const { device } = useDeviceStore();
  const navigation = useNavigation<any>();
  
  const isOnline = device?.isOnline || false;

  const onRefresh = () => {
    // In a real app, this would dispatch a query invalidation to refetch all dashboard data
  };

  useEffect(() => {
    const playMissingAlertSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          {
            uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
          },
          {
            shouldPlay: false,
            volume: 1,
          }
        );

        await sound.playAsync();
        await new Promise<void>((resolve) => setTimeout(resolve, 1100));
        await sound.replayAsync();
        await new Promise<void>((resolve) => setTimeout(resolve, 1100));
        await sound.unloadAsync();
      } catch (error) {
        console.warn('Failed to play missing-item alert sound:', error);
      }
    };

    const showAlertPopup = (
      title: string,
      message: string,
      actionText = 'View Alerts',
      onAction: () => void | Promise<void> = () => navigation.navigate(ROUTES.NOTIFICATION_CENTER)
    ) => {
      Alert.alert(title, message, [
        { text: 'Ignore', style: 'cancel' },
        {
          text: actionText,
          onPress: onAction,
        },
      ]);
    };

    const markMissingNotificationsAsRead = async () => {
      const response = await notificationApi.getNotifications({
        type: 'ITEM_MISSING',
        unreadOnly: true,
        limit: 50,
      });

      const unreadMissing = Array.isArray(response?.data) ? response.data : [];
      if (unreadMissing.length === 0) return;

      await Promise.all(
        unreadMissing
          .map((notification: any) => String(notification?.id ?? ''))
          .filter((id: string) => id.length > 0)
          .map((id: string) => notificationApi.markRead(id))
      );
    };

    const goToMissingItems = async () => {
      try {
        await markMissingNotificationsAsRead();
      } catch (error) {
        console.warn('Failed to mark missing notifications as read:', error);
      }

      navigation.navigate(ROUTES.MAIN_TABS, {
        screen: TAB_ROUTES.ITEMS_TAB,
        params: {
          screen: ROUTES.ITEM_LIST,
          params: { filter: 'MISSING' },
        },
      });
    };

    const unsubs = [
      webSocketService.subscribe('alert.item_missing', () => {
        playMissingAlertSound();
        showAlertPopup('Items Missing', 'Items are missing in your bag.', 'View Items', goToMissingItems);
      }),
      webSocketService.subscribe('alert.geofence_breach', () => {
        showAlertPopup('Bag Out Of Range', 'Bag is beyond the configured safe distance.');
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.statusRow}>
            <Text style={styles.deviceName}>
               {device?.deviceName || 'Smart Bag-Pack'}
            </Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.textMuted }]} />
              <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
          <Text style={styles.greeting}>Good morning, {user?.fullName?.split(' ')[0] || 'User'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
           <Icon name="account-circle" size={40} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        <LockWidget />
        
        <View style={styles.row}>
          <ItemsSummaryWidget style={styles.halfWidth} />
          {/* Alerts summary widget could go here per wireframe, or stats block */}
          <TouchableOpacity
            style={[styles.statsCard, styles.halfWidth]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
          >
             <Text style={styles.statsTitle}>Alerts</Text>
             <Text style={styles.statsValue}>4 <Text style={{fontSize: 16}}>⚠️</Text></Text>
          </TouchableOpacity>
        </View>
        
        <ItemsSummaryWidget variant="list" />
        
        <MiniMapWidget />

        <HomeAlertsWidget />
        
        <RecentActivityWidget />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl, // account for safe area in real app
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  deviceName: {
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
    color: colors.textNeutral,
    marginRight: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: typography.fontSize.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  greeting: {
    fontSize: typography.fontSize.heading,
    fontWeight: 'normal',
    color: colors.textMuted,
  },
  profileButton: {
    // optional styling
  },
  scrollContent: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  halfWidth: {
    width: '48%',
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: typography.fontSize.body,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statsValue: {
    fontSize: typography.fontSize.title,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
});
