import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing, borderRadius } from '../constants/spacing';
import { ROUTES } from '../constants/routes';
import { notificationApi } from '../api/notification.api';

type AlertNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

const isAlertType = (type?: string) => {
  const t = String(type ?? '').toUpperCase();
  return t.includes('MISSING') || t.includes('BREACH') || t.includes('UNAUTHORIZED') || t.includes('ALERT');
};

export const HomeAlertsWidget = () => {
  const navigation = useNavigation<any>();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['home-alerts'],
    queryFn: () => notificationApi.getNotifications({ limit: 20 }),
    refetchInterval: 8000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => refetch(),
  });

  const rawItems: AlertNotification[] = Array.isArray(data?.data) ? data.data : [];
  const alerts = rawItems.filter((n) => isAlertType(n.type) && !n.is_read).slice(0, 6);
  const unreadCount = alerts.filter((n) => !n.is_read).length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Alerts</Text>
        {alerts.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount} unread</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {isLoading || isRefetching ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : alerts.length === 0 ? (
        <Text style={styles.emptyText}>No alerts right now.</Text>
      ) : (
        alerts.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.alertRow, !item.is_read && styles.unreadRow]}
            onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
            activeOpacity={0.85}
          >
            <View style={styles.leftWrap}>
              <Icon
                name={item.type.toUpperCase().includes('MISSING') ? 'alert' : 'shield-alert'}
                size={16}
                color={colors.warning}
              />
              <View style={styles.textWrap}>
                <Text style={styles.alertTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.alertBody} numberOfLines={1}>
                  {item.body}
                </Text>
                <Text style={styles.alertTime}>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.ignoreBtn}
              onPress={() => markReadMutation.mutate(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.ignoreText}>Ignore</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
        activeOpacity={0.85}
      >
        <Text style={styles.viewAllText}>Open alerts <Icon name="arrow-right" size={14} /></Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  badge: {
    backgroundColor: 'rgba(255, 77, 109, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.4)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.danger,
    fontSize: typography.fontSize.caption,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  loaderWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.bodySmall,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  unreadRow: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  leftWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  alertTitle: {
    color: colors.textNeutral,
    fontSize: typography.fontSize.bodySmall,
    fontWeight: '700',
  },
  alertBody: {
    color: colors.textMuted,
    fontSize: typography.fontSize.caption,
  },
  alertTime: {
    color: colors.textMuted,
    fontSize: typography.fontSize.caption,
    marginTop: 2,
  },
  ignoreBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  ignoreText: {
    color: colors.textNeutral,
    fontSize: typography.fontSize.caption,
    fontWeight: '600',
  },
  readText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.caption,
    fontWeight: '600',
  },
  viewAllButton: {
    marginTop: spacing.sm,
  },
  viewAllText: {
    fontSize: typography.fontSize.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
});
