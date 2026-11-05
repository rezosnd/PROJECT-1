import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Hospital } from '../../lib/api/hospitals.api';

interface CityOccupancyMapProps {
  hospitals: Hospital[];
  className?: string;
}

export const CityOccupancyMap: React.FC<CityOccupancyMapProps> = ({
  hospitals,
  className = 'h-96 w-full rounded-card overflow-hidden border border-hairline/80 shadow-soft'
}) => {
  const centerLat = 20.2961;
  const centerLng = 85.8245;

  return (
    <div className={className}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hospitals.map((h) => {
          const lat = Number(h.latitude) || 20.2961;
          const lng = Number(h.longitude) || 85.8245;
          // Derived/simulated ICU occupancy index for city map visualization
          const total = h.totalBeds || 30;
          const free = h.freeBeds !== undefined ? h.freeBeds : 6;
          const occupancyPct = Math.round(((total - free) / total) * 100);

          const color = occupancyPct > 90 ? '#DC2646' : occupancyPct > 70 ? '#F59E0B' : '#14B84F';

          return (
            <CircleMarker
              key={h.id}
              center={[lat, lng]}
              radius={18}
              pathOptions={{
                color: '#FFFFFF',
                fillColor: color,
                fillOpacity: 0.85,
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1 min-w-[170px] text-left">
                  <p className="font-bold text-sm text-ink">{h.name}</p>
                  <p className="text-xs text-muted mt-0.5">{h.city}</p>
                  <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between">
                    <span className="text-xs text-muted">ICU Pressure:</span>
                    <span className="text-xs font-bold font-mono" style={{ color }}>
                      {occupancyPct}% Occupied
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

