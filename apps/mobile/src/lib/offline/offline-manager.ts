import { generateUUID } from '../utils/uuid';

export interface QueuedBedRequest {
  idempotencyKey: string;
  hospitalId: string;
  wardType: string;
  urgency: string;
  note?: string;
  shareAbha: boolean;
  queuedAt: string;
}

class OfflineManager {
  private isOnline: boolean = true;
  private queuedRequests: QueuedBedRequest[] = [];
  private listeners: Set<(online: boolean) => void> = new Set();

  public setOnline(status: boolean): void {
    if (this.isOnline !== status) {
      this.isOnline = status;
      this.listeners.forEach((cb) => cb(status));
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnline);
    return () => this.listeners.delete(callback);
  }

  /**
   * Generates a single, durable Idempotency-Key per reservation attempt.
   * Ensures multiple network retries do NOT double-allocate beds in PostgreSQL.
   */
  public createIdempotencyKey(): string {
    return generateUUID();
  }

  public queueRequest(request: Omit<QueuedBedRequest, 'idempotencyKey' | 'queuedAt'>): QueuedBedRequest {
    const item: QueuedBedRequest = {
      ...request,
      idempotencyKey: this.createIdempotencyKey(),
      queuedAt: new Date().toISOString(),
    };
    this.queuedRequests.push(item);
    return item;
  }

  public getQueuedRequests(): QueuedBedRequest[] {
    return [...this.queuedRequests];
  }

  public removeQueuedRequest(idempotencyKey: string): void {
    this.queuedRequests = this.queuedRequests.filter((r) => r.idempotencyKey !== idempotencyKey);
  }
}

export const offlineManager = new OfflineManager();

