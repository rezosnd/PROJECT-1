import { socketClient } from '../lib/socket/socket-client';
import { mockWards } from './mockData';

let timer: any = null;

export function startMockSocketEmitter(intervalMs = 4000) {
  if (timer) return;

  const wards = [...mockWards];

  timer = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * wards.length);
    const ward = wards[randomIndex];
    if (!ward) return;

    // Simulate bed fluctuation (+1 or -1 occupied)
    const delta = Math.random() > 0.5 ? 1 : -1;
    ward.occupied = Math.max(0, Math.min(ward.total - ward.reserved - ward.cleaning, ward.occupied + delta));
    ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
    ward.version = (ward.version || 1) + 1;
    ward.updatedAt = new Date().toISOString();

    socketClient.emitMockEvent('hospital:update', {
      hospitalId: ward.hospitalId,
      wardType: ward.wardType,
      total: ward.total,
      occupied: ward.occupied,
      reserved: ward.reserved,
      cleaning: ward.cleaning,
      maintenance: ward.maintenance,
      free: ward.free,
      version: ward.version,
      updatedAt: ward.updatedAt,
    });
  }, intervalMs);
}

export function stopMockSocketEmitter() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

