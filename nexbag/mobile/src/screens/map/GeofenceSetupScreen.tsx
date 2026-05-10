import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import MapView, { Marker, PROVIDER_GOOGLE, Circle, Region } from 'react-native-maps';
import { useMutation } from '@tanstack/react-query';
import { useGpsStore } from '../../store/gps.store';
import { gpsApi } from '../../api/gps.api';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

export const GeofenceSetupScreen = () => {
  const navigation = useNavigation();
  const { geofence, setGeofence, currentLocation } = useGpsStore();
  
  const [isEnabled, setIsEnabled] = useState(geofence?.isEnabled || false);
  const [radius, setRadius] = useState(geofence?.radiusMeters || 100);
  const [center, setCenter] = useState({
     latitude: geofence?.centerLat || currentLocation?.latitude || 23.165710,
     longitude: geofence?.centerLng || currentLocation?.longitude || 79.932358,
  });

  const mapRef = useRef<any>(null);

  const saveMutation = useMutation({
     mutationFn: () => gpsApi.updateGeofence({
        isEnabled,
        centerLat: center.latitude,
        centerLng: center.longitude,
        radiusMeters: radius,
     }),
     onSuccess: (data) => {
        setGeofence(data.data.geofence);
        Toast.show({ type: 'success', text1: 'Geofence Updated' });
        navigation.goBack();
     },
     onError: () => Toast.show({ type: 'error', text1: 'Failed to update geofence' })
  });

  const handleRegionChangeComplete = (region: any) => {
     setCenter({ latitude: region.latitude, longitude: region.longitude });
  };

  const useCurrentLocation = () => {
     if (currentLocation) {
        setCenter({ latitude: currentLocation.latitude, longitude: currentLocation.longitude });
        // mapRef.current?.animateToRegion({...});
     }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.textNeutral} />
         </TouchableOpacity>
         <Text style={styles.title}>Geofence Setup</Text>
         <View style={{width: 24}}/>
      </View>

      <View style={styles.mapContainer}>
         <View style={styles.mapFallback}>
            <Icon name="map-outline" size={48} color={colors.textMuted} />
            <Text style={styles.mapFallbackText}>Map view disabled</Text>
            <Text style={styles.mapFallbackSubtext}>(Maps disabled in Expo Go)</Text>
         </View>

         {/* Fixed marker in the center of the map to select the location block */}
         <View style={styles.centerMarker}>
            <Icon name="map-marker" size={40} color={colors.primary} style={{marginTop: -20}}/>
         </View>

         <TouchableOpacity style={styles.myLocationBtn} onPress={useCurrentLocation}>
            <Icon name="crosshairs-gps" size={20} color={colors.primary} />
            <Text style={styles.myLocationText}>Use bag location</Text>
         </TouchableOpacity>
      </View>

      <SafeAreaView style={styles.controls}>
         <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Geofence Alert</Text>
            <Switch
               value={isEnabled}
               onValueChange={setIsEnabled}
               trackColor={{ false: colors.border, true: colors.primary }}
            />
         </View>
         
         <Text style={styles.radiusLabel}>Alert Radius</Text>
         <View style={styles.radiusSelector}>
            {[50, 100, 200, 500].map(r => (
               <TouchableOpacity 
                  key={r}
                  style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
                  onPress={() => setRadius(r)}
               >
                  <Text style={[styles.radiusBtnText, radius === r && styles.radiusTextActive]}>{r}m</Text>
               </TouchableOpacity>
            ))}
         </View>

         <View style={styles.actions}>
            <TouchableOpacity 
               style={styles.cancelBtn}
               onPress={() => navigation.goBack()}
            >
               <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
               style={[styles.saveBtn, saveMutation.isPending && {opacity: 0.7}]}
               onPress={() => saveMutation.mutate()}
               disabled={saveMutation.isPending}
            >
               <Text style={styles.saveText}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
         </View>
      </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    paddingTop: spacing.xxl, // safe area approx
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  backButton: {},
  title: {
    fontSize: typography.fontSize.heading,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  mapContainer: {
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
   centerMarker: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
   },
  myLocationBtn: {
     position: 'absolute',
     top: spacing.lg,
     right: spacing.lg,
     backgroundColor: colors.surface,
     flexDirection: 'row',
     alignItems: 'center',
     padding: spacing.sm,
     paddingHorizontal: spacing.md,
     borderRadius: borderRadius.full,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.2,
     shadowRadius: 4,
     elevation: 4,
  },
  myLocationText: {
     marginLeft: spacing.xs,
     fontSize: typography.fontSize.bodySmall,
     color: colors.primary,
     fontWeight: 'bold',
  },
  controls: {
     backgroundColor: colors.surface,
     padding: spacing.xl,
     borderTopLeftRadius: borderRadius.lg,
     borderTopRightRadius: borderRadius.lg,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: -2 },
     shadowOpacity: 0.1,
     shadowRadius: 10,
     elevation: 10,
  },
  switchRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: spacing.lg,
  },
  switchLabel: {
     fontSize: typography.fontSize.body,
     fontWeight: 'bold',
     color: colors.textNeutral,
  },
  radiusLabel: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.textMuted,
     marginBottom: spacing.sm,
  },
  radiusSelector: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     marginBottom: spacing.xxl,
  },
  radiusBtn: {
     flex: 1,
     paddingVertical: spacing.sm,
     alignItems: 'center',
     borderWidth: 1,
     borderColor: colors.border,
     backgroundColor: colors.background,
  },
  radiusBtnActive: {
     backgroundColor: colors.primary + '20',
     borderColor: colors.primary,
  },
  radiusBtnText: {
     fontSize: typography.fontSize.body,
     color: colors.textNeutral,
     fontWeight: '500',
  },
  radiusTextActive: {
     color: colors.primary,
     fontWeight: 'bold',
  },
  actions: {
     flexDirection: 'row',
     justifyContent: 'space-between',
  },
  cancelBtn: {
     flex: 1,
     paddingVertical: spacing.md,
     alignItems: 'center',
     marginRight: spacing.sm,
  },
  cancelText: {
     fontSize: typography.fontSize.body,
     color: colors.textMuted,
     fontWeight: 'bold',
  },
  saveBtn: {
     flex: 2,
     backgroundColor: colors.primary,
     paddingVertical: spacing.md,
     alignItems: 'center',
     borderRadius: borderRadius.full,
     marginLeft: spacing.sm,
  },
  saveText: {
     fontSize: typography.fontSize.body,
     color: colors.surface,
     fontWeight: 'bold',
  },
});
