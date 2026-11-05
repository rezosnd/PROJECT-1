import { socketManager } from '../lib/socket/socket-client';
import { mockWards } from './data';

let emitterInterval: any = null;

export function startMockSocketEmitter(intervalMs = 4000) {
  if (emitterInterval) return;

  const wards = [...mockWards];

  emitterInterval = setInterval(() => {
    // Pick random ward from inventory
    const randomIndex = Math.floor(Math.random() * wards.length);
    const ward = wards[randomIndex];
    if (!ward) return;

    // Simulate bed fluctuation (+1 or -1 occupied)
    const delta = Math.random() > 0.5 ? 1 : -1;
    const newOccupied = Math.max(0, Math.min(ward.total - ward.reserved - ward.cleaning, ward.occupied + delta));
    ward.occupied = newOccupied;
    ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
    ward.version = (ward.version || 1) + 1;
    ward.updatedAt = new Date().toISOString();

    // Emit live socket event
    socketManager.emitMockEvent('hospital:update', {
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
  if (emitterInterval) {
    clearInterval(emitterInterval);
    emitterInterval = null;
  }
}

