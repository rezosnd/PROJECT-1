import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bedsApi, WardInventory } from '../lib/api/beds.api';
import { isServerlessRealtimeHost, socketClient } from '../lib/socket/socket-client';

const POLL_MS = 300;

function applyHospitalUpdate(prev: WardInventory[] | undefined, payload: any) {
  if (!prev) return prev;
  return prev.map((w) => {
    if (w.wardType !== payload.wardType) return w;
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
  });
}

export function useLiveBeds(hospitalId: string | undefined) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulsingWard, setPulsingWard] = useState<string | null>(null);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = socketClient.onStatusChange((connected) => setIsLive(connected));
    return unsub;
  }, []);

  const query = useQuery({
    queryKey: ['hospital-beds', hospitalId],
    queryFn: () => bedsApi.getHospitalBeds(hospitalId!),
    enabled: Boolean(hospitalId),
    refetchInterval: false,
    staleTime: 0,
  });

  // 300ms ETag poll — 304 when unchanged (near-instant on change)
  useEffect(() => {
    if (!hospitalId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const result = await bedsApi.syncHospitalBeds(hospitalId, etagRef.current);
        if (cancelled) return;
        if (!result.notModified && result.beds) {
          etagRef.current = result.etag;
          queryClient.setQueryData(['hospital-beds', hospitalId], result.beds);
          setLastUpdated(new Date());
        }
        socketClient.markLive(true);
        setIsLive(true);
      } catch {
        /* retry */
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };

    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [hospitalId, queryClient]);

  useEffect(() => {
    if (!hospitalId) return;
    socketClient.init();
    if (!isServerlessRealtimeHost()) {
      socketClient.joinHospitalRoom(hospitalId);
    }

    const unsub = socketClient.on('beds:update', (payload: any) => {
      if (payload.hospitalId && payload.hospitalId !== hospitalId) return;
      setLastUpdated(new Date());
      if (payload.wardType) {
        setPulsingWard(payload.wardType);
        setTimeout(() => setPulsingWard(null), 500);
      }
      queryClient.setQueryData(['hospital-beds', hospitalId], (prev?: WardInventory[]) =>
        applyHospitalUpdate(prev, payload)
      );
      etagRef.current = null;
    });

    const unsub2 = socketClient.on('hospital:update', (payload: any) => {
      if (payload.hospitalId && payload.hospitalId !== hospitalId) return;
      queryClient.setQueryData(['hospital-beds', hospitalId], (prev?: WardInventory[]) =>
        applyHospitalUpdate(prev, payload)
      );
    });

    return () => {
      if (!isServerlessRealtimeHost()) socketClient.leaveHospitalRoom(hospitalId);
      unsub();
      unsub2();
    };
  }, [hospitalId, queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && hospitalId) {
        etagRef.current = null;
        query.refetch();
      }
    });
    return () => subscription.remove();
  }, [hospitalId, query]);

  return {
    ...query,
    isLive,
    lastUpdated,
    pulsingWard,
  };
}
