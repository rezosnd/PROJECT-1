import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bedsApi, WardInventory } from '../lib/api/beds.api';
import { socketManager } from '../lib/socket/socket-client';

/**
 * Distributed Systems Live Bed Hook with Degraded Mode Resiliency.
 * 
 * 1. Subscribes to realtime WebSocket hospital room updates.
 * 2. Directly updates the TanStack Query normalized cache via setQueryData.
 * 3. Fault-tolerant fallback: If the socket disconnects or network partitions,
 *    it automatically switches to a 10-second polling cadence until reconnection.
 */
export function useLiveBeds(hospitalId: string | undefined) {
  const queryClient = useQueryClient();
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(socketManager.isConnected);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulseWard, setPulseWard] = useState<string | null>(null);

  // Connection status listener
  useEffect(() => {
    const unsub = socketManager.onStatusChange((connected) => {
      setIsSocketConnected(connected);
    });
    return unsub;
  }, []);

  // TanStack Query with degraded 10s polling when socket is down
  const query = useQuery({
    queryKey: ['hospital-beds', hospitalId],
    queryFn: () => bedsApi.getHospitalBeds(hospitalId!),
    enabled: Boolean(hospitalId),
    refetchInterval: isSocketConnected ? false : 10000,
    staleTime: 5000
  });

  // Socket room join & live listener
  useEffect(() => {
    if (!hospitalId) return;

    socketManager.init();
    socketManager.joinHospitalRoom(hospitalId);

    const unsub = socketManager.on('hospital:update', (payload: any) => {
      if (payload.hospitalId !== hospitalId) return;

      setLastUpdated(new Date());
      if (payload.wardType) {
        setPulseWard(payload.wardType);
        setTimeout(() => setPulseWard(null), 600);
      }

      // Optimistic cache reconciliation
      queryClient.setQueryData<WardInventory[]>(['hospital-beds', hospitalId], (prev) => {
        if (!prev) return prev;
        return prev.map((w) => {
          if (w.wardType === payload.wardType) {
            const total = payload.total !== undefined ? payload.total : w.total;
            const occupied = payload.occupied !== undefined ? payload.occupied : w.occupied;
            const reserved = payload.reserved !== undefined ? payload.reserved : w.reserved;
            const cleaning = payload.cleaning !== undefined ? payload.cleaning : w.cleaning;
            const maintenance = payload.maintenance !== undefined ? payload.maintenance : w.maintenance;
            const free = Math.max(0, total - occupied - reserved - cleaning - maintenance);

            return {
              ...w,
              ...payload,
              total,
              occupied,
              reserved,
              cleaning,
              maintenance,
              free,
              version: (w.version || 0) + 1,
              updatedAt: new Date().toISOString()
            };
          }
          return w;
        });
      });
    });

    return () => {
      socketManager.leaveHospitalRoom(hospitalId);
      unsub();
    };
  }, [hospitalId, queryClient]);

  return {
    ...query,
    isLive: isSocketConnected,
    lastUpdated,
    pulseWard
  };
}

