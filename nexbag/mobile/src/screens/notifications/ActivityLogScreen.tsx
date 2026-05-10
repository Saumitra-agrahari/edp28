import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';

import { activityLogApi } from '../../api/activity-log.api';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';

type ActivityLogItem = {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
};

const getEventIcon = (eventType: string) => {
  if (eventType.includes('LOCK')) {
    return <Icon name="lock" size={18} color={colors.textNeutral} />;
  }
  if (eventType.includes('MISSING') || eventType.includes('BREACH') || eventType.includes('UNAUTHORIZED')) {
    return <Icon name="alert" size={18} color={colors.warning} />;
  }
  if (eventType.includes('LOCATION') || eventType.includes('GEOFENCE')) {
    return <Icon name="map-marker" size={18} color={colors.textNeutral} />;
  }
  if (eventType.includes('DEVICE_ONLINE') || eventType.includes('DEVICE_OFFLINE')) {
    return <Icon name="wifi" size={18} color={colors.textNeutral} />;
  }
  return <Icon name="information" size={18} color={colors.textNeutral} />;
};

export const ActivityLogScreen = () => {
  const navigation = useNavigation();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['activity-logs', 'full'],
    queryFn: () => activityLogApi.getActivityLogs({ limit: 100 }),
    refetchInterval: 5000,
  });

  const logs: ActivityLogItem[] = Array.isArray(data?.data) ? data.data : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.textNeutral} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Log</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>Events from lock, RFID and location will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.iconWrap}>{getEventIcon(item.event_type)}</View>
              <View style={styles.textWrap}>
                <Text style={styles.title}>{item.description}</Text>
                <Text style={styles.time}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    color: colors.textNeutral,
    fontSize: typography.fontSize.title,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    color: colors.textNeutral,
    fontSize: typography.fontSize.heading,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSize.body,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 30,
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    color: colors.textNeutral,
    fontSize: typography.fontSize.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  time: {
    color: colors.textMuted,
    fontSize: typography.fontSize.caption,
  },
});
