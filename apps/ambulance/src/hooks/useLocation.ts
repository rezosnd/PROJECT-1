import { useState } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

const DEFAULT_LOCATION: UserLocation = {
  latitude: 20.2961,
  longitude: 85.8245,
  isDefault: true,
};

export function useLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = async (): Promise<UserLocation> => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return DEFAULT_LOCATION;
      }
      setPermissionDenied(false);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: UserLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        isDefault: false,
      };
      setLocation(next);
      return next;
    } catch {
      setLocation(DEFAULT_LOCATION);
      return DEFAULT_LOCATION;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    location,
    isLoading,
    permissionDenied,
    requestLocation,
  };
}
