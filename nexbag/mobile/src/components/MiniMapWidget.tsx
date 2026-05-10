import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useGpsStore } from '../store/gps.store';
import { useDeviceStore } from '../store/device.store';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../constants/routes';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing, borderRadius } from '../constants/spacing';
import { formatDistanceToNow } from 'date-fns';
import { locationService, ResolvedLocation } from '../services/location.service';

const FALLBACK_LOCATION = {
  latitude: 23.165710,
  longitude: 79.932358,
};

export const MiniMapWidget = () => {
  const { currentLocation } = useGpsStore();
  const { device } = useDeviceStore();
  const navigation = useNavigation<any>();
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);

  const mapRegion = useMemo(
    () => ({
      latitude: currentLocation?.latitude ?? resolvedLocation?.latitude ?? FALLBACK_LOCATION.latitude,
      longitude: currentLocation?.longitude ?? resolvedLocation?.longitude ?? FALLBACK_LOCATION.longitude,
    }),
    [currentLocation?.latitude, currentLocation?.longitude, resolvedLocation?.latitude, resolvedLocation?.longitude]
  );

  const lastUpdated = currentLocation?.recordedAt 
    ? `${formatDistanceToNow(new Date(currentLocation.recordedAt))} ago`
    : 'Unknown time';

  useEffect(() => {
    let isMounted = true;

    const loadLocation = async () => {
      setIsResolving(true);
      setLocationError(null);

      try {
        if (currentLocation?.latitude != null && currentLocation?.longitude != null) {
          const readable = await locationService.resolveReadableLocation(
            currentLocation.latitude,
            currentLocation.longitude
          );
          if (isMounted) setResolvedLocation(readable);
          return;
        }

        const coords = await locationService.getDeviceLocation();
        const readable = await locationService.resolveReadableLocation(coords.latitude, coords.longitude);

        if (isMounted) {
          setResolvedLocation(readable);
        }
      } catch (error: any) {
        if (isMounted) {
          setLocationError(error?.message || 'Unable to resolve location.');
          setResolvedLocation(null);
        }
      } finally {
        if (isMounted) setIsResolving(false);
      }
    };

    loadLocation();

    return () => {
      isMounted = false;
    };
  }, [currentLocation?.latitude, currentLocation?.longitude, currentLocation?.recordedAt]);

  const locationTitle = resolvedLocation?.label || 'Locating your bag...';
  const locationSubtitle = resolvedLocation?.sublabel || (isResolving ? 'Finding the nearest address' : 'Address unavailable');
  const showGridPreview = Platform.OS === 'web' || !(device?.isOnline ?? false);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconEmoji}>📍</Text>
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Bag Location</Text>
          <Text style={styles.locationTitle} numberOfLines={1}>{locationTitle}</Text>
          <Text style={styles.locationSubtitle} numberOfLines={2}>{locationSubtitle}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
         style={styles.mapContainer} 
         onPress={() => navigation.navigate('MapTab', { screen: ROUTES.LIVE_MAP })}
         activeOpacity={0.9}
      >
        {showGridPreview ? (
          <View style={styles.offlineGridWrap}>
            <View style={styles.offlineGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
              ))}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 14}%` }]} />
              ))}
              <View style={styles.gridCenterPin}>
                <Text style={styles.gridPinText}>📍</Text>
              </View>
            </View>
            <Text style={styles.offlineGridLabel}>
              {Platform.OS === 'web' ? 'Local grid preview (web mode)' : 'Offline local grid preview'}
            </Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            pointerEvents="none"
            mapType="none"
            region={{
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
            <Marker coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} />
          </MapView>
        )}
      </TouchableOpacity>
      
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {mapRegion.latitude.toFixed(4)}, {mapRegion.longitude.toFixed(4)}
        </Text>
        <Text style={styles.footerDot}>•</Text>
        <Text style={styles.footerText}>{lastUpdated}</Text>
      </View>
      {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.22)',
    marginRight: spacing.md,
  },
  iconEmoji: {
    fontSize: 18,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
    color: colors.textNeutral,
    marginBottom: 2,
  },
  locationTitle: {
    fontSize: typography.fontSize.heading,
    fontWeight: '700',
    color: colors.textNeutral,
    marginBottom: 2,
  },
  locationSubtitle: {
    fontSize: typography.fontSize.bodySmall,
    color: colors.textMuted,
    lineHeight: typography.lineHeight.bodySmall,
  },
  mapContainer: {
    height: 150,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  offlineGridWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1327',
  },
  offlineGrid: {
    width: '92%',
    height: '78%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    backgroundColor: 'rgba(9, 18, 40, 0.95)',
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  gridCenterPin: {
    position: 'absolute',
    top: '45%',
    left: '46%',
  },
  gridPinText: {
    fontSize: 20,
  },
  offlineGridLabel: {
    marginTop: 8,
    fontSize: typography.fontSize.caption,
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: typography.fontSize.caption,
    color: colors.textMuted,
  },
  footerDot: {
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  errorText: {
    marginTop: spacing.xs,
    color: colors.warning,
    fontSize: typography.fontSize.caption,
  },
});
