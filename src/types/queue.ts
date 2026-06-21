import type { PriorityLevel, ServiceOrder } from './service';
import type { MasterInfo } from './user';

export type QueueStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'left';

export interface QueueItem {
  id: string;
  orderId: string;
  order: ServiceOrder;
  master: MasterInfo;
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

export interface RoutePlanItem {
  orderId: string;
  orderNo: string;
  customerName: string;
  address: string;
  location: { lat: number; lng: number };
  priority: PriorityLevel;
  priorityWeight: number;
  serviceType: string;
  serviceName: string;
  price: number;
  distanceFromPrev: number;
  cumulativeDistance: number;
  sequence: number;
  estimatedArrival: string;
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
