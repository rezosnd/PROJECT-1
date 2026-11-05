import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bedsApi, WardInventory } from '../lib/api/beds.api';
import { socketClient } from '../lib/socket/socket-client';

export function useLiveBeds(hospitalId: string | undefined) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState<boolean>(socketClient.isConnected);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulsingWard, setPulsingWard] = useState<string | null>(null);

  // Monitor connection status
  useEffect(() => {
    const unsub = socketClient.onStatusChange((connected) => {
      setIsLive(connected);
    });
    return unsub;
  }, []);

  // TanStack Query with degraded 10s polling when disconnected
  const query = useQuery({
    queryKey: ['hospital-beds', hospitalId],
    queryFn: () => bedsApi.getHospitalBeds(hospitalId!),
    enabled: Boolean(hospitalId),
    refetchInterval: isLive ? false : 10000,
    staleTime: 5000,
  });

  // Socket room join & live listener
  useEffect(() => {
    if (!hospitalId) return;

    socketClient.init();
    socketClient.joinHospitalRoom(hospitalId);

    const unsub = socketClient.on('hospital:update', (payload: any) => {
      if (payload.hospitalId !== hospitalId) return;

      setLastUpdated(new Date());
      if (payload.wardType) {
        setPulsingWard(payload.wardType);
        setTimeout(() => setPulsingWard(null), 700);
      }

      // Reconcile TanStack Query cache directly
      queryClient.setQueryData<WardInventory[]>(['hospital-beds', hospitalId], (prev?: WardInventory[]) => {
        if (!prev) return prev;
        return prev.map((w: WardInventory) => {
          if (w.wardType === payload.wardType) {
            const total = payload.total !== undefined ? payload.total : w.total;
            const occupied = payload.occupied !== undefined ? payload.occupied : w.occupied;
            const reserved = payload.reserved !== undefined ? payload.reserved : w.reserved;
            const cleaning = payload.cleaning !== undefined ? payload.cleaning : w.cleaning;
            const maintenance = payload.maintenance !== undefined ? payload.maintenance : w.maintenance;
            const free = Math.max(0, total - (occupied + reserved + cleaning + maintenance));

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
              updatedAt: new Date().toISOString(),
            };
          }
          return w;
        });
      });
    });

    return () => {
      socketClient.leaveHospitalRoom(hospitalId);
      unsub();
    };
  }, [hospitalId, queryClient]);

  // Handle AppState resume: resubscribe and refetch upon foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && hospitalId) {
        socketClient.init();
        socketClient.joinHospitalRoom(hospitalId);
        query.refetch();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hospitalId, query]);

  return {
    ...query,
    isLive,
    lastUpdated,
    pulsingWard,
  };
}

