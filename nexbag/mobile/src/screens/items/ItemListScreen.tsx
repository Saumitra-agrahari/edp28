import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useRfidStore } from '../../store/rfid.store';
import { rfidApi } from '../../api/rfid.api';
import { ItemsStackParamList } from '../../types/navigation.types';
import { ROUTES } from '../../constants/routes';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<ItemsStackParamList, "ItemList">;

export const ItemListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [filter, setFilter] = useState<'ALL' | 'IN_BAG' | 'MISSING'>('ALL');
   const { setTags, setUnknownTags, updateMultipleReadings, tags, readings, unknownTags } = useRfidStore();

  const { isLoading, refetch } = useQuery({
    queryKey: ['rfid-tags'],
    queryFn: async () => {
      const resp = await rfidApi.getTags();
         const data = resp?.data ?? resp;

         const normalizedItems = Array.isArray(data?.items)
            ? data.items.map((item: any) => ({
                  id: String(item.id),
                  tagId: item.tag_id ?? item.tagId ?? null,
                  epc: item.epc,
                  alias: item.alias ?? null,
                  icon: item.icon || 'tag',
                  isActive: item.isActive ?? item.is_active ?? true,
               }))
            : [];

         const normalizedReadings = Array.isArray(data?.items)
            ? data.items.map((item: any) => ({
                 epc: item.epc,
                 rssi: item.rssi ?? null,
                 lastSeenAt: item.last_seen_at ?? null,
                 status: item.status ?? 'UNKNOWN',
              }))
            : [];

         setTags(normalizedItems);
         updateMultipleReadings(normalizedReadings);
         setUnknownTags(Array.isArray(data?.unknown_tags) ? data.unknown_tags : []);

         return data;
    },
  });

  // Group items logic
   const processedItems = tags.map((tag) => {
    const reading = readings[tag.epc];
      const status = tag.isActive === false ? 'DISABLED' : reading?.status || 'UNKNOWN';
    return {
       ...tag,
          status,
       lastSeen: reading?.lastSeenAt,
       rssi: reading?.rssi,
    };
  });

  let filteredItems = processedItems;
  if (filter === 'IN_BAG') filteredItems = processedItems.filter(i => i.status === 'IN_BAG');
  if (filter === 'MISSING') filteredItems = processedItems.filter(i => i.status === 'MISSING');

  // Sort MISSING items to top
  filteredItems.sort((a, b) => {
     if (a.status === 'MISSING' && b.status !== 'MISSING') return -1;
     if (a.status !== 'MISSING' && b.status === 'MISSING') return 1;
     if (a.status === 'DISABLED' && b.status !== 'DISABLED') return 1;
     if (a.status !== 'DISABLED' && b.status === 'DISABLED') return -1;
     return (a.alias || '').localeCompare(b.alias || '');
  });

  const renderFilterChip = (label: string, value: 'ALL' | 'IN_BAG' | 'MISSING') => (
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
        <Text style={styles.headerTitle}>My Items</Text>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.REGISTER_TAG)} style={styles.addButton}>
           <Icon name="plus" size={24} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
         {renderFilterChip('All', 'ALL')}
         {renderFilterChip('In Bag', 'IN_BAG')}
         {renderFilterChip('Missing', 'MISSING')}
      </View>

         {unknownTags.length > 0 && (
            <TouchableOpacity
               style={styles.unknownBanner}
               onPress={() =>
                 navigation.navigate(ROUTES.REGISTER_TAG, {
                   tagId: String(unknownTags[0]?.tagId ?? unknownTags[0]?.tag_id ?? '').padStart(4, '0'),
                 })
               }
            >
               <Icon name="tag-plus" size={18} color={colors.primary} />
               <Text style={styles.unknownBannerText}>
                  {unknownTags.length} unregistered tag{unknownTags.length > 1 ? 's' : ''} detected.
                  {unknownTags[0]?.tagId ?? unknownTags[0]?.tag_id ? ` Tag ID ${String(unknownTags[0]?.tagId ?? unknownTags[0]?.tag_id).padStart(4, '0')}.` : ''}
                  Tap to register.
               </Text>
            </TouchableOpacity>
         )}

      {isLoading ? (
        <View style={styles.centerContainer}>
           <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
           {/* Illustration placeholder */}
           <View style={styles.emptyImagePlaceholder} />
           <Text style={styles.emptyTitle}>No items found</Text>
           <Text style={styles.emptySubtitle}>
              {filter === 'ALL' ? 'Add RFID tags to start tracking.' : `No items in ${filter.toLowerCase()} state.`}
           </Text>
           {filter === 'ALL' && (
              <TouchableOpacity 
                 style={styles.primaryButton}
                 onPress={() => navigation.navigate(ROUTES.REGISTER_TAG)}
              >
                 <Text style={styles.primaryButtonText}>+ Register First Item</Text>
              </TouchableOpacity>
           )}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
               keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <TouchableOpacity 
               style={styles.itemCard}
                      onPress={() => navigation.navigate(ROUTES.EDIT_ITEM, { tagId: String(item.id) })}
            >
               <View style={styles.itemHeader}>
                  <View style={styles.itemTitleRow}>
                     <Icon name={(item.icon as any) || 'tag'} size={24} color={colors.textNeutral} style={styles.itemIcon} />
                     <Text style={styles.itemTitle}>{item.alias || 'Unnamed Item'}</Text>
                     {item.status === 'MISSING' && <View style={styles.missingDot} />}
                     {item.status === 'DISABLED' && <View style={styles.disabledDot} />}
                  </View>
                  <View style={[
                     styles.statusBadge,
                     item.status === 'IN_BAG'
                        ? styles.statusInBag
                        : item.status === 'MISSING'
                          ? styles.statusMissing
                          : item.status === 'DISABLED'
                            ? styles.statusDisabled
                            : styles.statusUnknown,
                  ]}>
                     <Text style={[styles.statusText, { color: item.status === 'UNKNOWN' ? colors.textMuted : colors.surface }]}>
                        {item.status.replace('_', ' ')}
                     </Text>
                  </View>
               </View>
               <View style={styles.itemDetails}>
                  <Text style={styles.itemSubtext}>
                     TAG ID: {String(item.tagId ?? item.tag_id ?? '').padStart(4, '0') || '0000'}
                  </Text>
                  <Text style={styles.itemSubtext}>
                     Last seen: {item.lastSeen ? formatDistanceToNow(new Date(item.lastSeen), { addSuffix: true }) : 'Never'}
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
  addButton: {
     width: 44,
     height: 44,
     borderRadius: 22,
     backgroundColor: colors.primary,
     justifyContent: 'center',
     alignItems: 'center',
  },
  filterContainer: {
     flexDirection: 'row',
     paddingHorizontal: spacing.xl,
     marginBottom: spacing.md,
  },
  unknownBanner: {
     flexDirection: 'row',
     alignItems: 'center',
     marginHorizontal: spacing.xl,
     marginBottom: spacing.md,
     paddingHorizontal: spacing.md,
     paddingVertical: spacing.sm,
     borderRadius: borderRadius.md,
     backgroundColor: colors.primary + '12',
     borderWidth: 1,
     borderColor: colors.primary + '33',
  },
  unknownBannerText: {
     marginLeft: spacing.sm,
     color: colors.textNeutral,
     fontSize: typography.fontSize.bodySmall,
     flex: 1,
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
  },
  itemCard: {
     backgroundColor: colors.surface,
     padding: spacing.lg,
     borderRadius: borderRadius.md,
     marginBottom: spacing.md,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.05,
     shadowRadius: 8,
     elevation: 2,
  },
  itemHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: spacing.sm,
  },
  itemTitleRow: {
     flexDirection: 'row',
     alignItems: 'center',
  },
  itemIcon: {
     marginRight: spacing.sm,
  },
  itemTitle: {
     fontSize: typography.fontSize.heading,
     fontWeight: 'bold',
     color: colors.textNeutral,
  },
  missingDot: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: colors.danger,
     marginLeft: spacing.sm,
  },
  disabledDot: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: colors.textMuted,
     marginLeft: spacing.sm,
  },
  statusBadge: {
     paddingHorizontal: spacing.sm,
     paddingVertical: 2,
     borderRadius: borderRadius.sm,
  },
  statusInBag: {
     backgroundColor: colors.success,
  },
  statusMissing: {
     backgroundColor: colors.danger,
  },
  statusDisabled: {
     backgroundColor: colors.textMuted,
  },
  statusUnknown: {
     backgroundColor: colors.border,
  },
  statusText: {
     fontSize: typography.fontSize.caption,
     fontWeight: 'bold',
  },
  itemDetails: {
     flexDirection: 'row',
     justifyContent: 'space-between',
  },
  itemSubtext: {
     fontSize: typography.fontSize.caption,
     color: colors.textMuted,
     fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
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
  emptyImagePlaceholder: {
     width: 120,
     height: 120,
     backgroundColor: colors.surface,
     borderRadius: 60,
     marginBottom: spacing.xl,
     borderWidth: 2,
     borderColor: colors.border,
     borderStyle: 'dashed',
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
     marginBottom: spacing.xl,
  },
  primaryButton: {
     backgroundColor: colors.primary,
     paddingHorizontal: spacing.xl,
     paddingVertical: spacing.md,
     borderRadius: borderRadius.full,
  },
  primaryButtonText: {
     color: colors.surface,
     fontSize: typography.fontSize.body,
     fontWeight: 'bold',
  },
});
