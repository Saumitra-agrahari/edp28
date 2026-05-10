import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing, borderRadius } from '../constants/spacing';
import { formatDistanceToNow } from 'date-fns';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { ROUTES } from '../constants/routes';
import { activityLogApi } from '../api/activity-log.api';
import { webSocketService } from '../services/websocket.service';

type ActivityItem = {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
};

export const RecentActivityWidget = () => {
  const navigation = useNavigation<any>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', 'recent'],
    queryFn: () => activityLogApi.getActivityLogs({ limit: 3 }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const unsubs = [
      webSocketService.subscribe('device.lock_status', () => refetch()),
      webSocketService.subscribe('gps.update', () => refetch()),
      webSocketService.subscribe('alert.item_missing', () => refetch()),
      webSocketService.subscribe('device.online', () => refetch()),
      webSocketService.subscribe('device.offline', () => refetch()),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [refetch]);

  const activities: ActivityItem[] = Array.isArray(data?.data) ? data.data : [];

  const getIconForType = (type: string) => {
    if (type.includes('LOCK')) return <Icon name="lock" size={16} color={colors.textNeutral} />;
    if (type.includes('MISSING') || type.includes('BREACH') || type.includes('UNAUTHORIZED')) {
      return <Icon name="alert" size={16} color={colors.warning} />;
    }
    if (type.includes('LOCATION') || type.includes('GEOFENCE')) {
      return <Icon name="map-marker" size={16} color={colors.textNeutral} />;
    }
    return <Icon name="information" size={16} color={colors.textNeutral} />;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Activity</Text>
      <View style={styles.divider} />

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : activities.length === 0 ? (
        <Text style={styles.emptyText}>No recent activity yet.</Text>
      ) : (
        activities.map((activity) => (
          <View key={activity.id} style={styles.activityRow}>
            <View style={styles.activityLeft}>
              <View style={styles.iconContainer}>{getIconForType(activity.event_type)}</View>
              <Text style={styles.activityTitle}>{activity.description}</Text>
            </View>
            <Text style={styles.activityTime}>
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </Text>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.viewFullLogButton} onPress={() => navigation.navigate(ROUTES.ACTIVITY_LOG)}>
        <Text style={styles.viewFullLogText}>View full log <Icon name="arrow-right" size={14} /></Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl, // extra padding for bottom scroll
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
    color: colors.textNeutral,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activityTitle: {
    fontSize: typography.fontSize.body,
    color: colors.textNeutral,
    maxWidth: 180,
  },
  activityTime: {
    fontSize: typography.fontSize.caption,
    color: colors.textMuted,
  },
  loaderWrap: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.bodySmall,
    marginBottom: spacing.md,
  },
  viewFullLogButton: {
    marginTop: spacing.sm,
  },
  viewFullLogText: {
    fontSize: typography.fontSize.bodySmall,
    color: colors.textNeutral,
    fontWeight: '600',
  },
});
