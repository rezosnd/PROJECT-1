import React, { useState } from 'react';
import { EquipmentItem, equipmentApi, EquipmentStatus } from '../../lib/api/equipment.api';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useToast } from '../../components/ui/Toast';
import { Activity, Clock, Plus, AlertTriangle } from 'lucide-react';

interface EquipmentManagerTableProps {
  hospitalId: string;
  equipment: EquipmentItem[];
  onUpdated?: () => void;
  className?: string;
}

export const EquipmentManagerTable: React.FC<EquipmentManagerTableProps> = ({
  hospitalId,
  equipment,
  onUpdated,
  className = ''
}) => {
  const { addToast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (item: EquipmentItem, newStatus: EquipmentStatus) => {
    setUpdatingId(item.id);
    try {
      await equipmentApi.updateEquipmentStatus(item.id, {
        status: newStatus,
        availableAt: newStatus === 'AVAILABLE' ? null : item.availableAt
      });
      addToast({
        type: newStatus === 'OFFLINE' ? 'warning' : 'success',
        title: 'Equipment Telemetry Updated',
        message: `${item.name} transition to ${newStatus} logged in immutable telemetry audit.`
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: err.response?.data?.error?.message || 'Could not update equipment'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const statusVariantMap = {
    AVAILABLE: 'green' as const,
    IN_USE: 'blue' as const,
    MAINTENANCE: 'orange' as const,
    OFFLINE: 'red' as const
  };

  return (
    <div className={`bg-white rounded-card border border-hairline/80 shadow-soft overflow-hidden text-left ${className}`}>
      <div className="p-4 border-b border-hairline/60 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            Equipment Telemetry Management ({equipment.length})
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Operational status changes broadcast across citywide matching engine within 2 seconds.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-card-soft text-muted font-semibold uppercase tracking-wider text-[10px] border-b border-hairline/60">
            <tr>
              <th className="py-3 px-4">Equipment Unit</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Criticality</th>
              <th className="py-3 px-4">Status & Telemetry</th>
              <th className="py-3 px-4">Available At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/60 text-ink">
            {equipment.map((eq) => {
              const isUpdating = updatingId === eq.id;
              return (
                <tr key={eq.id} className="hover:bg-card-soft/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-ink block">{eq.name}</span>
                    <span className="text-[11px] text-muted block font-mono">
                      SN: {eq.serialNo} {eq.model ? `• ${eq.model}` : ''}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-ink">{eq.type}</td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-pill text-[10px] ${
                        eq.criticality === 'CRITICAL'
                          ? 'bg-red-light text-red'
                          : eq.criticality === 'HIGH'
                          ? 'bg-orange-light text-orange'
                          : 'bg-card-soft text-muted'
                      }`}
                    >
                      {eq.criticality}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <select
                      value={eq.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(eq, e.target.value as EquipmentStatus)}
                      className={`h-8 px-2.5 rounded-pill text-xs font-bold border focus:outline-none transition-all ${
                        eq.status === 'AVAILABLE'
                          ? 'bg-green-light text-green border-green/30'
                          : eq.status === 'IN_USE'
                          ? 'bg-blue-light text-blue border-blue/30'
                          : eq.status === 'MAINTENANCE'
                          ? 'bg-orange-light text-orange border-orange/30'
                          : 'bg-red-light text-red border-red/30'
                      }`}
                    >
                      <option value="AVAILABLE">AVAILABLE (Operational)</option>
                      <option value="IN_USE">IN_USE (Occupied)</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="OFFLINE">OFFLINE (Defective)</option>
                    </select>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-muted">
                    {eq.availableAt ? (
                      <span className="flex items-center gap-1 font-semibold text-ink">
                        <Clock className="w-3.5 h-3.5 text-muted" />
                        {new Date(eq.availableAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span>Now</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

