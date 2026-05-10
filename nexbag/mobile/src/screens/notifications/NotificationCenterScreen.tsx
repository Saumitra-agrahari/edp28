import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { notificationApi } from '../../api/notification.api';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';

export const NotificationCenterScreen = () => {
  const [filter, setFilter] = useState<'ALL' | 'ALERT' | 'INFO'>('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
     queryKey: ['notifications'],
     queryFn: () => notificationApi.getNotifications({ limit: 50 }),
  });

  const markReadMutation = useMutation({
     mutationFn: (id: string) => notificationApi.markRead(id),
     onSuccess: () => refetch(),
  });

  const markAllReadMutation = useMutation({
     mutationFn: () => notificationApi.markAllRead(),
     onSuccess: () => refetch(),
  });

   const notifications = Array.isArray(data?.data)
      ? data.data.map((n: any) => ({
            ...n,
            isRead: Boolean(n.isRead ?? n.is_read),
            createdAt: n.createdAt ?? n.created_at,
         }))
      : [];
  
  // Filter logic (Alerts might map to Security/Item alerts, Info to System)
     let filteredNotifications = notifications.filter((n: any) => !n.isRead);
   if (filter === 'ALERT') {
         filteredNotifications = notifications.filter(
         (n: any) =>
            !n.isRead &&
            (n.type.includes('ALERT') || n.type.includes('BREACH') || n.type.includes('MISSING'))
      );
   }
     if (filter === 'INFO') {
        filteredNotifications = filteredNotifications.filter(
           (n: any) =>
              !n.isRead &&
              !n.type.includes('ALERT') &&
              !n.type.includes('BREACH') &&
              !n.type.includes('MISSING')
        );
     }

  const renderFilterChip = (label: string, value: 'ALL' | 'ALERT' | 'INFO') => (
    <TouchableOpacity 
       style={[styles.filterChip, filter === value && styles.activeFilterChip]}
       onPress={() => setFilter(value)}
    >
       <Text style={[styles.filterText, filter === value && styles.activeFilterText]}>
         {label}
       </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.headerTitle}>Notifications</Text>
         <TouchableOpacity onPress={() => markAllReadMutation.mutate()}>
            <Text style={styles.markAllReadText}>Mark all read</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
         {renderFilterChip('All', 'ALL')}
         {renderFilterChip('Alerts', 'ALERT')}
         {renderFilterChip('System', 'INFO')}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
           <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
           <Icon name="bell-outline" size={64} color={colors.border} style={styles.emptyIcon} />
           <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptySubtitle}>You&apos;ll see alerts here when your bag needs attention.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <TouchableOpacity 
               style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
               onPress={() => !item.isRead && markReadMutation.mutate(item.id)}
            >
               {!item.isRead && <View style={styles.unreadDot} />}
               <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody}>{item.body}</Text>
                  <Text style={styles.cardTime}>
                     {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </Text>
               </View>
            </TouchableOpacity>
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
     justifyContent: 'space-between',
     alignItems: 'center',
     padding: spacing.xl,
  },
  headerTitle: {
     fontSize: typography.fontSize.display,
     fontWeight: 'bold',
     color: colors.textNeutral,
  },
  markAllReadText: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.primary,
     fontWeight: '600',
  },
  filterContainer: {
     flexDirection: 'row',
     paddingHorizontal: spacing.xl,
     marginBottom: spacing.md,
  },
  filterChip: {
     paddingVertical: spacing.sm,
     paddingHorizontal: spacing.lg,
     backgroundColor: colors.surface,
     borderRadius: borderRadius.full,
     marginRight: spacing.sm,
     borderWidth: 1,
     borderColor: colors.border,
  },
  activeFilterChip: {
     backgroundColor: colors.primary,
     borderColor: colors.primary,
  },
  filterText: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.textNeutral,
     fontWeight: '600',
  },
  activeFilterText: {
     color: colors.surface,
  },
  listContent: {
     padding: spacing.lg,
     paddingBottom: spacing.xxl,
  },
  notificationCard: {
     flexDirection: 'row',
     backgroundColor: colors.surface, // light grey if read, but spec says surface
     padding: spacing.lg,
     borderRadius: borderRadius.md,
     marginBottom: spacing.sm,
     borderLeftWidth: 4,
     borderLeftColor: 'transparent',
  },
  unreadCard: {
     borderLeftColor: colors.primary,
     backgroundColor: colors.surface, // White
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
     elevation: 2,
  },
  unreadDot: {
     width: 10,
     height: 10,
     borderRadius: 5,
     backgroundColor: colors.danger,
     position: 'absolute',
     top: spacing.lg,
     right: spacing.lg,
  },
  cardContent: {
     flex: 1,
  },
  cardTitle: {
     fontSize: typography.fontSize.body,
     fontWeight: 'bold',
     color: colors.textNeutral,
     marginBottom: spacing.xs,
  },
  cardBody: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.textMuted,
     lineHeight: typography.lineHeight.bodySmall,
     marginBottom: spacing.sm,
     paddingRight: spacing.xl, // make room for dot
  },
  cardTime: {
     fontSize: typography.fontSize.caption,
     color: colors.textMuted,
  },
  centerContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
  },
  emptyContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     padding: spacing.xxl,
  },
  emptyIcon: {
     marginBottom: spacing.lg,
  },
  emptyTitle: {
     fontSize: typography.fontSize.title,
     fontWeight: 'bold',
     color: colors.textNeutral,
     marginBottom: spacing.xs,
  },
  emptySubtitle: {
     fontSize: typography.fontSize.body,
     color: colors.textMuted,
     textAlign: 'center',
  },
});
