import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bedsApi, WardInventory } from '../lib/api/beds.api';
import { isServerlessRealtimeHost, socketManager } from '../lib/socket/socket-client';

/**
 * Live beds with near-zero perceived lag:
 * 1) Socket.IO on always-on hosts
 * 2) SSE push on Vercel (Redis-backed when configured)
 * 3) 300ms ETag poll (304 when unchanged) — works everywhere
 *
 * True 0.000 ms is physically impossible over the network; this stack targets
 * ~sub-second push / ~300ms worst-case poll.
 */
const POLL_MS = 300;

function applyHospitalUpdate(
  prev: WardInventory[] | undefined,
  payload: any
): WardInventory[] | undefined {
  if (!prev) return prev;
  return prev.map((w) => {
    if (w.wardType !== payload.wardType) return w;
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
      updatedAt: new Date().toISOString(),
    };
  });
}

export function useLiveBeds(hospitalId: string | undefined) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulseWard, setPulseWard] = useState<string | null>(null);
  const [transport, setTransport] = useState<'socket' | 'sse' | 'poll' | 'off'>('off');
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = socketManager.onStatusChange((connected) => {
      setIsLive(connected);
      setTransport(socketManager.transport);
    });
    return unsub;
  }, []);

  const query = useQuery({
    queryKey: ['hospital-beds', hospitalId],
    queryFn: async () => {
      const beds = await bedsApi.getHospitalBeds(hospitalId!);
      return beds;
    },
    enabled: Boolean(hospitalId),
    // Live loop below owns refresh cadence (ETag 304 + SSE)
    refetchInterval: false,
    staleTime: 0,
    gcTime: 60_000,
  });

  // Capture ETag from last successful full fetch via sync helper
  useEffect(() => {
    if (!hospitalId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const result = await bedsApi.syncHospitalBeds(hospitalId, etagRef.current);
        if (cancelled) return;
        if (result.notModified) {
          socketManager.markPushConnected(true, etagRef.current ? 'poll' : 'poll');
          setIsLive(true);
          setTransport('poll');
        } else if (result.beds) {
          etagRef.current = result.etag;
          queryClient.setQueryData(['hospital-beds', hospitalId], result.beds);
          setLastUpdated(new Date());
          socketManager.markPushConnected(true, 'poll');
          setIsLive(true);
          setTransport('poll');
        }
      } catch {
        /* keep trying */
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

  // SSE push (works on Vercel when Redis is set)
  useEffect(() => {
    if (!hospitalId) return;

    socketManager.init();
    if (!isServerlessRealtimeHost()) {
      socketManager.joinHospitalRoom(hospitalId);
    }

    const unsubSocket = socketManager.on('hospital:update', (payload: any) => {
      if (payload.hospitalId && payload.hospitalId !== hospitalId) return;
      setLastUpdated(new Date());
      if (payload.wardType) {
        setPulseWard(payload.wardType);
        setTimeout(() => setPulseWard(null), 500);
      }
      queryClient.setQueryData(['hospital-beds', hospitalId], (prev: WardInventory[] | undefined) =>
        applyHospitalUpdate(prev, payload)
      );
    });

    // Also listen beds:update event name from API broadcasts
    const unsubBeds = socketManager.on('beds:update', (payload: any) => {
      if (payload.hospitalId && payload.hospitalId !== hospitalId) return;
      socketManager.emitLocal('hospital:update', payload);
    });

    let es: EventSource | null = null;
    try {
      es = new EventSource(socketManager.eventsUrl(hospitalId));
      es.addEventListener('connected', () => {
        socketManager.markPushConnected(true, 'sse');
        setIsLive(true);
        setTransport('sse');
      });
      const onPush = (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload.hospitalId && payload.hospitalId !== hospitalId) return;
          setLastUpdated(new Date());
          if (payload.wardType) {
            setPulseWard(payload.wardType);
            setTimeout(() => setPulseWard(null), 500);
          }
          queryClient.setQueryData(['hospital-beds', hospitalId], (prev: WardInventory[] | undefined) =>
            applyHospitalUpdate(prev, payload)
          );
          // Force next poll to refetch full snapshot for ETag refresh
          etagRef.current = null;
          socketManager.markPushConnected(true, 'sse');
        } catch {
          /* ignore */
        }
      };
      es.addEventListener('beds:update', onPush);
      es.addEventListener('hospital:update', onPush);
      es.onerror = () => {
        // EventSource auto-reconnects; fall back status to poll
        setTransport((t) => (t === 'socket' ? t : 'poll'));
      };
    } catch {
      /* EventSource unavailable */
    }

    return () => {
      unsubSocket();
      unsubBeds();
      if (!isServerlessRealtimeHost()) socketManager.leaveHospitalRoom(hospitalId);
      es?.close();
    };
  }, [hospitalId, queryClient]);

  return {
    ...query,
    isLive,
    lastUpdated,
    pulseWard,
    transport,
  };
}
