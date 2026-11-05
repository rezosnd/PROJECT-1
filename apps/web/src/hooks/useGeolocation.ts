import { useState, useCallback } from 'react';

export interface LocationState {
  lat: number;
  lng: number;
  addressLabel: string;
  isDetecting: boolean;
  error: string | null;
}

// Bhubaneswar Central coordinates as default prototype baseline
const DEFAULT_COORDS = {
  lat: 20.2961,
  lng: 85.8245,
  addressLabel: 'Bhubaneswar Central, Odisha'
};

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>({
    lat: DEFAULT_COORDS.lat,
    lng: DEFAULT_COORDS.lng,
    addressLabel: DEFAULT_COORDS.addressLabel,
    isDetecting: false,
    error: null
  });

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    setLocation(prev => ({ ...prev, isDetecting: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
          addressLabel: `Current Location (${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E)`,
          isDetecting: false,
          error: null
        });
      },
      (err) => {
        setLocation(prev => ({
          ...prev,
          isDetecting: false,
          error: `Location detection failed (${err.message}). Using Bhubaneswar Central.`
        }));
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lng: number, label?: string) => {
    setLocation({
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      addressLabel: label || `Pinned Location (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      isDetecting: false,
      error: null
    });
  }, []);

  return {
    ...location,
    detectLocation,
    setManualLocation
  };
}

