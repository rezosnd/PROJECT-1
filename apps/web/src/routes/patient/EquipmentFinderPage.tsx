import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { equipmentApi, EquipmentType } from '../../lib/api/equipment.api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Activity, Clock, MapPin, Building2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const EQUIPMENT_TYPES: Array<{ type: EquipmentType; label: string }> = [
  { type: 'VENTILATOR', label: 'Ventilators' },
  { type: 'CT', label: 'CT Scanners' },
  { type: 'MRI', label: 'MRI Machines' },
  { type: 'DIALYSIS', label: 'Dialysis Units' },
  { type: 'INCUBATOR', label: 'Neonatal Incubators' },
  { type: 'OPERATION_THEATRE', label: 'Operation Theatres (OT)' },
  { type: 'CATH_LAB', label: 'Cath Labs' },
  { type: 'X_RAY', label: 'Digital X-Ray' }
];

export const EquipmentFinderPage: React.FC = () => {
  const { t } = useTranslation();
  const { lat, lng } = useGeolocation();
  const [selectedType, setSelectedType] = useState<EquipmentType>('VENTILATOR');

  const { data, isLoading } = useQuery({
    queryKey: ['equipment-search', selectedType, lat, lng],
    queryFn: () =>
      equipmentApi.searchEquipment({
        type: selectedType,
        lat,
        lng,
        radiusKm: 30
      }),
    staleTime: 15000
  });

  const items = data?.items || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-navy tracking-tight">
          {t('equipmentFinder.title')}
        </h1>
        <p className="text-xs text-muted mt-0.5">
          {t('equipmentFinder.subtitle')}
        </p>
      </div>

      {/* Equipment Type Pill Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {EQUIPMENT_TYPES.map((eq) => {
          const isSelected = selectedType === eq.type;
          return (
            <button
              key={eq.type}
              type="button"
              onClick={() => setSelectedType(eq.type)}
              className={`px-4 py-2 rounded-pill text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                isSelected
                  ? 'bg-ink text-white shadow-soft'
                  : 'bg-white text-muted hover:text-ink border border-hairline/80'
              }`}
            >
              {eq.label}
            </button>
          );
        })}
      </div>

      {/* Equipment Units List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-8 h-8 text-teal" />}
          title="No Operational Units Found"
          description={`No operational ${selectedType} units currently registered in city perimeter.`}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              variant="surface"
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-hairline/80 shadow-soft"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-display font-bold text-base text-ink">
                    {item.name}
                  </h3>
                  <Chip
                    variant={
                      item.status === 'AVAILABLE'
                        ? 'green'
                        : item.status === 'IN_USE'
                        ? 'blue'
                        : item.status === 'MAINTENANCE'
                        ? 'orange'
                        : 'red'
                    }
                    dot
                  >
                    {item.status}
                  </Chip>
                </div>

                <p className="text-xs text-muted flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-navy shrink-0" />
                  <span className="font-semibold text-ink">{item.hospitalName || 'AIIMS Bhubaneswar'}</span>
                  <span>•</span>
                  <MapPin className="w-3.5 h-3.5 text-red shrink-0" />
                  <span>{item.hospitalAddress || 'Bhubaneswar'}</span>
                </p>

                {item.availableAt && (
                  <p className="text-xs text-orange flex items-center gap-1.5 mt-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Est. Next Availability: {new Date(item.availableAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                )}
              </div>

              <Link
                to={`/hospital/${item.hospitalId}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue hover:underline self-start sm:self-center shrink-0"
              >
                <span>Hospital Ward & Beds</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

