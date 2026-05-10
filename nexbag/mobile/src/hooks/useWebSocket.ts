import { useEffect } from 'react';
import { webSocketService } from '../services/websocket.service';
import { useAuthStore } from '../store/auth.store';
import { useDeviceStore } from '../store/device.store';
import { useRfidStore } from '../store/rfid.store';
import { useGpsStore } from '../store/gps.store';
import { rfidApi } from '../api/rfid.api';
import { deviceApi } from '../api/device.api';
import { gpsApi } from '../api/gps.api';
import { getBackendHost, getWebSocketBaseUrl } from '../config/network';

export const useWebSocket = () => {
  const { accessToken, user } = useAuthStore();
  const updateDeviceState = useDeviceStore((state) => state.updateDeviceState);
  const setDevice = useDeviceStore((state) => state.setDevice);
  const setTags = useRfidStore((state) => state.setTags);
  const updateMultipleReadings = useRfidStore((state) => state.updateMultipleReadings);
  const setUnknownTags = useRfidStore((state) => state.setUnknownTags);
  const setCurrentLocation = useGpsStore((state) => state.setCurrentLocation);

  useEffect(() => {
    if (!accessToken || !user?.deviceId) {
      webSocketService.disconnect();
      return;
    }

    // Connect
    const wsUrl = getWebSocketBaseUrl();
    const fallbackWsUrl = `ws://${getBackendHost()}:3000/ws`;
    webSocketService.connectWithFallback([wsUrl, fallbackWsUrl], accessToken);

    // Seed device state once so lock controls are not stuck disabled while
    // waiting for first websocket status event.
    const syncDeviceState = async () => {
      try {
        const resp = await deviceApi.getDevice();
        const payload = resp?.data?.device ?? resp?.data ?? resp;
        if (cancelled || !payload) return;

        setDevice({
          id: String(payload.id ?? user.deviceId ?? ''),
          deviceCode: String(payload.device_code ?? payload.deviceCode ?? ''),
          deviceName: String(payload.device_name ?? payload.deviceName ?? 'Smart Bag-Pack'),
          isOnline: Boolean(payload.is_online ?? payload.isOnline ?? false),
          firmwareVersion: payload.firmware_version ?? payload.firmwareVersion ?? null,
          geofenceState: String(payload.geofence_state ?? payload.geofenceState ?? 'UNKNOWN'),
          lockState: String(payload.lock_state ?? payload.lockState ?? 'UNKNOWN'),
          lastKnownLat: payload.last_known_lat ?? payload.lastKnownLat ?? null,
          lastKnownLng: payload.last_known_lng ?? payload.lastKnownLng ?? null,
          lastLocationAt: payload.last_location_at ?? payload.lastLocationAt ?? null,
        });
      } catch (error) {
        console.warn('Failed to seed device state from API:', error);
      }
    };

    let cancelled = false;
    syncDeviceState();

    // Seed RFID state immediately so dashboard/widgets render items before the
    // next websocket heartbeat/update arrives.
    const syncRfidState = async () => {
      try {
        const resp = await rfidApi.getTags();
        const data = resp?.data ?? resp;

        if (cancelled) return;

        const normalizedTags = Array.isArray(data?.items)
          ? data.items.map((item: any) => ({
              id: item.id,
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

        setTags(normalizedTags);
        updateMultipleReadings(normalizedReadings);
        setUnknownTags(Array.isArray(data?.unknown_tags) ? data.unknown_tags : []);
      } catch (error) {
        console.warn('Failed to seed RFID state from API:', error);
      }
    };

    syncRfidState();
    const syncInterval = setInterval(syncRfidState, 15000);

    // Seed + periodic GPS state sync so dashboard location age is correct even
    // if a websocket gps event is missed during reconnect/hotspot changes.
    const syncGpsState = async () => {
      try {
        const resp = await gpsApi.getCurrentLocation();
        const payload = resp?.data ?? resp;
        if (cancelled || !payload) return;

        const latitude = Number(payload.latitude ?? payload.lat);
        const longitude = Number(payload.longitude ?? payload.lng ?? payload.lon);
        const recordedAt = payload.recorded_at ?? payload.recordedAt ?? null;

        if (Number.isFinite(latitude) && Number.isFinite(longitude) && recordedAt) {
          setCurrentLocation({
            latitude,
            longitude,
            accuracy: payload.accuracy ?? null,
            recordedAt,
          });
        }
      } catch (error) {
        console.warn('Failed to seed GPS state from API:', error);
      }
    };

    syncGpsState();
    const gpsSyncInterval = setInterval(syncGpsState, 10000);

    // Subscriptions
    const unsubs = [
      webSocketService.subscribe('device.status', (payload) => {
        updateDeviceState({
          isOnline: payload.isOnline,
        });
      }),

      webSocketService.subscribe('device.online', () => {
        updateDeviceState({ isOnline: true });
      }),

      webSocketService.subscribe('device.offline', () => {
        updateDeviceState({ isOnline: false });
      }),
      
      webSocketService.subscribe('device.lock_status', (payload) => {
        updateDeviceState({
           lockState: payload.status,
           // could also update last history event
        });
      }),

      webSocketService.subscribe('lock.status', (payload) => {
        updateDeviceState({
          lockState: payload.lock_state,
        });
      }),

      webSocketService.subscribe('rfid.tags_updated', (payload) => {
         if (payload.readings) {
            updateMultipleReadings(payload.readings);
         }
      }),

      webSocketService.subscribe('rfid.update', (payload) => {
        if (Array.isArray(payload.items)) {
          updateMultipleReadings(
            payload.items.map((item: any) => ({
              epc: String(item.epc ?? '').trim().toUpperCase(),
              rssi: item.rssi ?? null,
              lastSeenAt: item.last_seen_at,
              status: item.status,
            }))
          );
        }

        if (Array.isArray(payload.unknown_tags)) {
          setUnknownTags(
            payload.unknown_tags.map((tag: any) => ({
              epc: String(tag.epc ?? '').trim().toUpperCase(),
              tag_id: tag.tag_id ?? null,
              tagId: tag.tag_id ?? tag.tagId ?? null,
            }))
          );
        }
      }),

      webSocketService.subscribe('gps.location_updated', (payload) => {
         const latitude = Number(payload.latitude ?? payload.lat);
         const longitude = Number(payload.longitude ?? payload.lng ?? payload.lon);
         if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

         setCurrentLocation({
            latitude,
            longitude,
            accuracy: payload.accuracy ?? null,
            recordedAt: payload.recordedAt ?? payload.recorded_at ?? new Date().toISOString(),
         });
      }),

      webSocketService.subscribe('gps.update', (payload) => {
        const latitude = Number(payload.lat ?? payload.latitude);
        const longitude = Number(payload.lng ?? payload.longitude ?? payload.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        setCurrentLocation({
          latitude,
          longitude,
          accuracy: payload.accuracy ?? null,
          recordedAt: payload.recorded_at ?? payload.recordedAt ?? new Date().toISOString(),
        });
      }),

      webSocketService.subscribe('geofence.alert', (payload) => {
         updateDeviceState({ geofenceState: payload.state });
         // Alert handling could be dispatched to a toast/banner
      }),

      webSocketService.subscribe('alert.geofence_breach', () => {
        updateDeviceState({ geofenceState: 'OUTSIDE' });
      })
    ];

    return () => {
      cancelled = true;
      clearInterval(syncInterval);
      clearInterval(gpsSyncInterval);
      unsubs.forEach(unsub => unsub());
      webSocketService.disconnect();
    };
  }, [
    accessToken,
    user?.deviceId,
    setCurrentLocation,
    setDevice,
    setTags,
    setUnknownTags,
    updateDeviceState,
    updateMultipleReadings,
  ]);
};
