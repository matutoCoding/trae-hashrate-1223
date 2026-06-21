import type { PriorityLevel, ServiceOrder } from './service';

export type QueueStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'left';

export interface QueueItem {
  id: string;
  orderId: string;
  order: ServiceOrder;
  queueNumber: number;
  priority: PriorityLevel;
  priorityWeight: number;
  status: QueueStatus;
  joinTime: string;
  callTime?: string;
  startTime?: string;
  endTime?: string;
  estimatedWaitTime: number;
  position: number;
}

export interface QueueInfo {
  id: string;
  name: string;
  location: string;
  currentNumber: number;
  totalWaiting: number;
  servingCount: number;
  items: QueueItem[];
  avgWaitTime: number;
}
