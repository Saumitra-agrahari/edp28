import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { gpsApi } from '../../api/gps.api';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

export const LocationHistoryScreen = () => {
  const navigation = useNavigation();
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');

  const { data, isLoading, refetch, isRefetching } = useQuery({
     queryKey: ['location-history'],
     queryFn: () => gpsApi.getHistory({ limit: 50 }),
  });

  const history = data?.data?.history || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.textNeutral} />
         </TouchableOpacity>
         <Text style={styles.title}>Location History</Text>
         <View style={{width: 24}}/>
      </View>

      <View style={styles.toggleContainer}>
         <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'LIST' && styles.toggleActive]}
            onPress={() => setViewMode('LIST')}
         >
            <Text style={[styles.toggleText, viewMode === 'LIST' && styles.toggleTextActive]}>List View</Text>
         </TouchableOpacity>
         <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'MAP' && styles.toggleActive]}
            onPress={() => setViewMode('MAP')}
         >
            <Text style={[styles.toggleText, viewMode === 'MAP' && styles.toggleTextActive]}>Map View</Text>
         </TouchableOpacity>
      </View>

      {isLoading ? (
         <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
         </View>
      ) : history.length === 0 ? (
         <View style={styles.centerBox}>
            <View style={styles.emptyIconPlaceholder} />
            <Text style={styles.emptyText}>No location history for this period.</Text>
         </View>
      ) : viewMode === 'LIST' ? (
         <FlatList
            data={history}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={isRefetching}
            onRefresh={refetch}
            renderItem={({ item }) => (
               <View style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                     <Icon name="map-marker" size={16} color={colors.primary} style={styles.markerIcon} />
                     <Text style={styles.timeText}>
                        {format(new Date(item.recordedAt), 'MMM dd, h:mm a')}
                     </Text>
                  </View>
                  <Text style={styles.latLngText}>
                     Lat: {item.latitude.toFixed(6)}, Lng: {item.longitude.toFixed(6)}
                  </Text>
                  {item.accuracy && (
                     <Text style={styles.accuracyText}>Accuracy: ±{Math.round(item.accuracy)}m</Text>
                  )}
               </View>
            )}
         />
      ) : (
         <View style={styles.centerBox}>
            <Text style={styles.emptyText}>Map View placeholder for tracking polyline</Text>
         </View>
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
    padding: spacing.xl,
  },
  backButton: {},
  title: {
    fontSize: typography.fontSize.heading,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  toggleContainer: {
     flexDirection: 'row',
     marginHorizontal: spacing.xl,
     marginBottom: spacing.lg,
     backgroundColor: colors.surface,
     borderRadius: borderRadius.sm,
     padding: 4,
     borderWidth: 1,
     borderColor: colors.border,
  },
  toggleBtn: {
     flex: 1,
     paddingVertical: spacing.sm,
     alignItems: 'center',
     borderRadius: borderRadius.sm,
  },
  toggleActive: {
     backgroundColor: colors.primary + '10',
  },
  toggleText: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.textMuted,
     fontWeight: '600',
  },
  toggleTextActive: {
     color: colors.primary,
  },
  centerBox: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     padding: spacing.xl,
  },
  emptyIconPlaceholder: {
     width: 80,
     height: 80,
     backgroundColor: colors.border,
     borderRadius: 40,
     marginBottom: spacing.lg,
  },
  emptyText: {
     fontSize: typography.fontSize.body,
     color: colors.textMuted,
     textAlign: 'center',
  },
  listContent: {
     paddingHorizontal: spacing.xl,
     paddingBottom: spacing.xxl,
  },
  historyCard: {
     backgroundColor: colors.surface,
     padding: spacing.lg,
     borderRadius: borderRadius.md,
     marginBottom: spacing.md,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 4,
     elevation: 1,
  },
  cardHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: spacing.sm,
  },
  markerIcon: {
     marginRight: spacing.sm,
  },
  timeText: {
     fontSize: typography.fontSize.body,
     fontWeight: 'bold',
     color: colors.textNeutral,
  },
  latLngText: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.textNeutral,
     fontFamily: 'monospace',
     marginBottom: 4,
  },
  accuracyText: {
     fontSize: typography.fontSize.caption,
     color: colors.textMuted,
  },
});
