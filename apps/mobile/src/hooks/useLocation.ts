import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  isDefault: boolean;
}

// Bhubaneswar Central Coordinates fallback
const DEFAULT_LOCATION: UserLocation = {
  latitude: 20.2961,
  longitude: 85.8245,
  city: 'Bhubaneswar',
  isDefault: true,
};

export function useLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  const requestLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setIsLoading(false);
        return;
      }

      setPermissionDenied(false);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        city: 'Current Location',
        isDefault: false,
      });
    } catch {
      // Graceful fallback on simulator or location timeout
      setLocation(DEFAULT_LOCATION);
    } finally {
      setIsLoading(false);
    }
  };

  const setManualLocation = (lat: number, lng: number, city = 'Custom Pin') => {
    setLocation({
      latitude: lat,
      longitude: lng,
      city,
      isDefault: false,
    });
  };

  return {
    location,
    isLoading,
    permissionDenied,
    requestLocation,
    setManualLocation,
  };
}

