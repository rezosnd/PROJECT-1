import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../auth/token-store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://project1-api.vercel.app';

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  public isConnected: boolean = false;

  public init(): void {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: (cb) => {
        cb({ token: getAccessToken() });
      }
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.notifyStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.notifyStatus(false);
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
      this.notifyStatus(false);
    });

    // Forward socket events to internal listeners
    this.socket.onAny((event, data) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach(cb => cb(data));
      }
    });
  }

  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(event);
      }
    };
  }

  public emitMockEvent(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  public onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach(cb => cb(connected));
  }

  public joinHospitalRoom(hospitalId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join:hospital', hospitalId);
    }
  }

  public leaveHospitalRoom(hospitalId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave:hospital', hospitalId);
    }
  }

  public joinCityRoom(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join:city');
    }
  }
}

export const socketManager = new SocketManager();

