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
  routePackageId?: string;
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
  queueNumber?: number;
  queueStatus?: QueueStatus;
}

export interface RoutePackage {
  id: string;
  masterId: string;
  serviceType?: string;
  createdAt: string;
  accepted: boolean;
  acceptedAt?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  items: RoutePlanItem[];
  totalDistance: number;
  totalDuration: number;
  totalPrice: number;
  currentSequence?: number;
}

export interface CustomerRouteProgress {
  orderId: string;
  orderNo: string;
  routePackageId: string;
  master: MasterInfo;
  totalStops: number;
  currentStop: number;
  stopsAhead: number;
  cumulativeDistanceToMe: number;
  estimatedArrival: string;
  estimatedWaitMinutes: number;
  allStops: RoutePlanItem[];
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
