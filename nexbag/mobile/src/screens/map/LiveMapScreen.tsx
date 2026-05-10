import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform,/* BottomSheetBehavior */ } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useGpsStore } from '../../store/gps.store';
import { useDeviceStore } from '../../store/device.store';
import { MapStackParamList } from '../../types/navigation.types';
import { ROUTES } from '../../constants/routes';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<MapStackParamList, 'LiveMap'>;

export const LiveMapScreen = () => {
   const navigation = useNavigation<NavigationProp>();
   const { currentLocation, geofence } = useGpsStore();
   const { device } = useDeviceStore();
   const mapRef = useRef<MapView | null>(null);

   const fallbackLocation = { latitude: 23.165710, longitude: 79.932358 };
   const location = currentLocation || fallbackLocation;

   const isOffline = !device?.isOnline;
   const mapRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
   };

   const centerOnBag = () => {
      mapRef.current?.animateToRegion(mapRegion, 500);
   };

   return (
      <View style={styles.container}>
         {Platform.OS === 'web' ? (
            <View style={styles.mapFallback}>
               <Icon name="map-outline" size={48} color={colors.textMuted} />
               <Text style={styles.mapFallbackText}>Live Map is not available on web</Text>
               <Text style={styles.mapFallbackSubtext}>Open this screen in Expo Go on Android or iOS</Text>
            </View>
         ) : (
            <MapView ref={mapRef} style={styles.map} initialRegion={mapRegion}>
               <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
                  <View style={[styles.markerContainer, isOffline && styles.markerOffline]}>
                     <Icon name="bag-personal" size={22} color={colors.surface} />
                  </View>
               </Marker>

               {geofence?.isEnabled && (
                  <Circle
                     center={{ latitude: geofence.centerLat, longitude: geofence.centerLng }}
                     radius={geofence.radiusMeters}
                     strokeColor={colors.primary}
                     fillColor={colors.primary + '22'}
                     strokeWidth={2}
                  />
               )}
            </MapView>
         )}

         <SafeAreaView style={styles.topSafeArea}>
            {isOffline && (
               <View style={styles.offlineBanner}>
                  <Text style={styles.offlineBannerText}>⚠️ Showing last known location — bag is offline</Text>
               </View>
            )}
         </SafeAreaView>

         <TouchableOpacity style={styles.centerButton} onPress={centerOnBag}>
            <Icon name="crosshairs-gps" size={24} color={colors.primary} />
         </TouchableOpacity>

         <View style={styles.bottomSheetWrapper}>
            <View style={styles.bottomSheet}>
               <View style={styles.sheetHandle} />
               <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Bag Location</Text>
               </View>

               <View style={styles.infoRow}>
                  <Icon name="clock-outline" size={20} color={colors.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                     Last updated: {currentLocation?.recordedAt ? `${formatDistanceToNow(new Date(currentLocation.recordedAt))} ago` : 'Unknown'}
                  </Text>
               </View>

               <View style={styles.infoRow}>
                  <Icon name="crosshairs" size={20} color={colors.textMuted} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                     Accuracy: ±{currentLocation?.accuracy ? Math.round(currentLocation.accuracy) : '?'} meters
                  </Text>
               </View>

               <View style={styles.actionRow}>
                  <TouchableOpacity
                     style={styles.actionButton}
                     onPress={() => navigation.navigate(ROUTES.LOCATION_HISTORY)}
                  >
                     <Icon name="history" size={20} color={colors.primary} />
                     <Text style={styles.actionButtonText}>History</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                     style={styles.actionButton}
                     onPress={() => navigation.navigate(ROUTES.GEOFENCE_SETUP)}
                  >
                     <Icon name="shield-check-outline" size={20} color={colors.primary} />
                     <Text style={styles.actionButtonText}>Geofence</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </View>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
   },
   map: {
      ...StyleSheet.absoluteFillObject,
   },
   mapFallback: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.05)',
   },
   mapFallbackText: {
      fontSize: typography.fontSize.heading,
      color: colors.textMuted,
      fontWeight: 'bold',
      marginTop: spacing.md,
   },
   mapFallbackSubtext: {
      fontSize: typography.fontSize.body,
      color: colors.textMuted,
      marginTop: spacing.xs,
   },
   topSafeArea: {
      position: 'absolute',
      top: 0,
      width: '100%',
   },
   offlineBanner: {
      backgroundColor: '#1E2A3BEE',
      padding: spacing.md,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      marginTop: spacing.md,
   },
   offlineBannerText: {
      color: colors.warning,
      fontSize: typography.fontSize.bodySmall,
      fontWeight: 'bold',
      textAlign: 'center',
   },
   markerContainer: {
      backgroundColor: colors.primary,
      padding: spacing.xs,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.surface,
   },
   markerOffline: {
      backgroundColor: colors.textMuted,
   },
   centerButton: {
      position: 'absolute',
      right: spacing.xl,
      bottom: 240, // above bottom sheet
      backgroundColor: colors.surface,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
   },
   bottomSheetWrapper: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
   },
   bottomSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      padding: spacing.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
   },
   sheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.md,
   },
   sheetHeader: {
      marginBottom: spacing.lg,
   },
   sheetTitle: {
      fontSize: typography.fontSize.heading,
      fontWeight: 'bold',
      color: colors.textNeutral,
   },
   infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
   },
   infoIcon: {
      marginRight: spacing.sm,
   },
   infoText: {
      fontSize: typography.fontSize.body,
      color: colors.textNeutral,
   },
   actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
   },
   actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '10',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      marginHorizontal: spacing.xs,
   },
   actionButtonText: {
      color: colors.primary,
      fontSize: typography.fontSize.body,
      fontWeight: 'bold',
      marginLeft: spacing.sm,
   },
});
