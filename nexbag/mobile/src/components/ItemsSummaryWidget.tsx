import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useRfidStore } from '../store/rfid.store';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing, borderRadius } from '../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { ROUTES, TAB_ROUTES } from '../constants/routes';

interface Props {
  style?: ViewStyle;
  variant?: 'card' | 'list';
}

export const ItemsSummaryWidget = ({ style, variant = 'card' }: Props) => {
  const { tags, readings } = useRfidStore();
  const navigation = useNavigation<any>();

  const openItems = (filter?: 'ALL' | 'IN_BAG' | 'MISSING') => {
    navigation.navigate(TAB_ROUTES.ITEMS_TAB, {
      screen: ROUTES.ITEM_LIST,
      params: filter ? { filter } : undefined,
    });
  };
  
  // Calculate stats based on readings
  const activeTags = tags.filter(t => t.isActive);
  const totalItems = activeTags.length;
  
  const inBagTags = activeTags.filter((tag) => {
     const r = readings[tag.epc];
     return r?.status === 'IN_BAG';
  });

  if (variant === 'card') {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={() => openItems('ALL')} activeOpacity={0.85}>
         <Text style={styles.cardTitle}>Items</Text>
         <Text style={styles.cardValue}>{inBagTags.length}/{totalItems} <Text style={{fontSize: 16}}>✅</Text></Text>
      </TouchableOpacity>
    );
  }

  // List View (Top 4 items from quick list)
  return (
    <View style={[styles.listContainer, style]}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Items in Bag</Text>
      </View>
      <View style={styles.divider} />
      
      {activeTags.slice(0, 4).map((tag, index) => {
        const reading = readings[tag.epc];
        const isMissing = reading?.status === 'MISSING';
        
        return (
          <TouchableOpacity
            key={tag.id}
            style={styles.listItem}
            activeOpacity={0.8}
            onPress={() => openItems(isMissing ? 'MISSING' : 'IN_BAG')}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>{isMissing ? '⚠️' : '✅'}</Text>
              <Text style={[styles.itemName, isMissing && styles.itemMissing]}>
                {tag.alias || 'Unknown Item'}
              </Text>
            </View>
            <View style={styles.itemRight}>
              {isMissing ? (
                 <Text style={styles.missingBadge}>MISSING</Text>
              ) : (
                 <Text style={styles.rssiText}>RSSI ███░</Text> // Visual bars in real app
              )}
            </View>
          </TouchableOpacity>
        );
      })}
      
      <TouchableOpacity style={styles.viewAllButton} onPress={() => openItems('ALL')} activeOpacity={0.8}>
        <Text style={styles.viewAllText}>View all items <Icon name="arrow-right" size={14}/></Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
  cardTitle: {
    fontSize: typography.fontSize.body,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.fontSize.title,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  listContainer: {
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
  listHeader: {
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  itemName: {
    fontSize: typography.fontSize.body,
    color: colors.textNeutral,
  },
  itemMissing: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  itemRight: {},
  rssiText: {
    fontSize: typography.fontSize.caption,
    color: colors.textMuted,
  },
  missingBadge: {
    fontSize: typography.fontSize.caption,
    fontWeight: 'bold',
    color: colors.danger,
  },
  viewAllButton: {
    marginTop: spacing.sm,
  },
  viewAllText: {
    fontSize: typography.fontSize.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
