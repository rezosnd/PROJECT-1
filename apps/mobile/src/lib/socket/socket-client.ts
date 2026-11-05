import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../storage/secure-store';
import Constants from 'expo-constants';

const SOCKET_URL =
  Constants.expoConfig?.extra?.socketUrl || 'https://project1-api.vercel.app';

export function isServerlessRealtimeHost(url = SOCKET_URL): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.vercel.app') || host.includes('vercel');
  } catch {
    return /vercel\.app/i.test(String(url));
  }
}

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  public isConnected: boolean = false;
  public transport: 'socket' | 'poll' | 'off' = 'off';

  public init(): void {
    if (isServerlessRealtimeHost()) {
      this.transport = 'poll';
      return;
    }
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      auth: async (cb) => {
        const token = await getAccessToken();
        cb({ token });
      },
    });

    this.transport = 'socket';

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

    this.socket.onAny((event, data) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) callbacks.forEach((cb) => cb(data));
    });
  }

  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
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
    if (callbacks) callbacks.forEach((cb) => cb(data));
  }

  public onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected));
  }

  public markLive(connected: boolean) {
    this.isConnected = connected;
    this.transport = 'poll';
    this.notifyStatus(connected);
  }

  public joinHospitalRoom(hospitalId: string): void {
    if (this.socket?.connected) this.socket.emit('join:hospital', hospitalId);
  }

  public leaveHospitalRoom(hospitalId: string): void {
    if (this.socket?.connected) this.socket.emit('leave:hospital', hospitalId);
  }
}

export const socketClient = new SocketClient();
