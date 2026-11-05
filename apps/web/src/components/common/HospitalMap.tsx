import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MatchedHospital } from '../../lib/api/matching.api';
import { Link } from 'react-router-dom';

interface HospitalMapProps {
  userLat: number;
  userLng: number;
  hospitals: MatchedHospital[];
  selectedHospitalId?: string | null;
  onSelectHospital?: (hospitalId: string) => void;
  className?: string;
}

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="width: 24px; height: 24px; border-radius: 50%; background: #1E6FD9; border: 3px solid white; box-shadow: 0 4px 12px rgba(30,111,217,0.4);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function createHospitalIcon(freeBeds: number, isSelected: boolean) {
  const color = freeBeds > 2 ? '#14B84F' : freeBeds > 0 ? '#F59E0B' : '#DC2646';
  const scale = isSelected ? 'scale(1.2)' : 'scale(1)';
  const border = isSelected ? '3px solid #2A2523' : '2px solid white';

  return L.divIcon({
    className: 'hospital-marker',
    html: `<div style="transform: ${scale}; transition: transform 0.2s; width: 34px; height: 34px; border-radius: 50%; background: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 4px 14px rgba(0,0,0,0.2); border: ${border};">
      ${freeBeds}
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function BoundsController({ userLat, userLng, hospitals }: { userLat: number; userLng: number; hospitals: MatchedHospital[] }) {
  const map = useMap();

  useEffect(() => {
    if (!hospitals.length) {
      map.setView([userLat, userLng], 13);
      return;
    }

    const bounds = L.latLngBounds([[userLat, userLng]]);
    hospitals.forEach(h => {
      bounds.extend([h.hospital.latitude, h.hospital.longitude]);
    });
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, userLat, userLng, hospitals]);

  return null;
}

export const HospitalMap: React.FC<HospitalMapProps> = ({
  userLat,
  userLng,
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  className = 'w-full h-full rounded-card overflow-hidden border border-hairline/80 shadow-soft'
}) => {
  return (
    <div className={className}>
      <MapContainer
        center={[userLat, userLng]}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Current Location Marker */}
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>
            <div className="text-xs p-1">
              <p className="font-bold text-ink">Your Current Location</p>
            </div>
          </Popup>
        </Marker>

        {/* Hospital Candidates */}
        {hospitals.map((item) => {
          const h = item.hospital;
          const isSelected = h.id === selectedHospitalId;
          const icon = createHospitalIcon(item.matchedWard.freeBeds, isSelected);

          return (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectHospital && onSelectHospital(h.id)
              }}
            >
              <Popup>
                <div className="p-1 min-w-[190px]">
                  <p className="font-bold text-ink text-sm leading-tight">{h.name}</p>
                  <p className="text-[11px] text-muted mt-0.5">{item.etaMinutes} mins ({item.distanceKm} km)</p>
                  <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between">
                    <span className="text-xs font-semibold text-green">
                      {item.matchedWard.freeBeds} {item.matchedWard.wardType} free
                    </span>
                    <Link
                      to={`/hospital/${h.id}`}
                      className="text-xs font-bold text-blue hover:underline"
                    >
                      Details &rarr;
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <BoundsController userLat={userLat} userLng={userLng} hospitals={hospitals} />
      </MapContainer>
    </div>
  );
};

