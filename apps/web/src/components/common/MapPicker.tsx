import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface MapPickerProps {
  lat: number;
  lng: number;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

// Custom clean SVG pin matching LifeLink design system
const pinIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="width: 32px; height: 32px; border-radius: 50%; background: #2A2523; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2px solid white;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

function LocationMarker({ lat, lng, onSelect }: { lat: number; lng: number; onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4)));
    }
  });

  return <Marker position={[lat, lng]} icon={pinIcon} />;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  lat,
  lng,
  onLocationSelect,
  className = 'h-64 w-full rounded-2xl overflow-hidden border border-hairline shadow-soft'
}) => {
  return (
    <div className={className}>
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={lat} lng={lng} onSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
};

