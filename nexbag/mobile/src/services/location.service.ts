import * as Location from 'expo-location';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  label: string;
  sublabel: string;
}

const buildLocationLabel = (place: Location.LocationGeocodedAddress | undefined): { label: string; sublabel: string } => {
  if (!place) {
    return {
      label: 'Current location',
      sublabel: 'Exact address unavailable',
    };
  }

  const street = [place.name, place.street].filter(Boolean).join(' ').trim();
  const cityState = [place.city, place.region].filter(Boolean).join(', ').trim();
  const country = place.country ?? '';

  const label = street || cityState || country || 'Current location';
  const sublabel = [cityState, country].filter(Boolean).join(' • ') || 'Exact address unavailable';

  return { label, sublabel };
};

export const locationService = {
  async getDeviceLocation(): Promise<Location.LocationObjectCoords> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Location permission denied.');
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return position.coords;
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<{ label: string; sublabel: string }> {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    return buildLocationLabel(places[0]);
  },

  async resolveReadableLocation(latitude: number, longitude: number): Promise<ResolvedLocation> {
    const place = await this.reverseGeocode(latitude, longitude);
    return {
      latitude,
      longitude,
      label: place.label,
      sublabel: place.sublabel,
    };
  },
};