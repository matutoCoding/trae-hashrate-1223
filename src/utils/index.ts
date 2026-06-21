import type { PriorityLevel, ServiceType } from '@/types/service';
import type { QueueItem, RoutePlanItem } from '@/types/queue';
import type { MasterInfo } from '@/types/user';

export const formatPrice = (price: number): string => {
  return `¥${price.toFixed(2)}`;
};

export const getPriorityWeight = (priority: PriorityLevel): number => {
  const weights: Record<PriorityLevel, number> = {
    normal: 1,
    urgent: 5,
    vip: 10,
  };
  return weights[priority];
};

export const getPriorityLabel = (priority: PriorityLevel): string => {
  const labels: Record<PriorityLevel, string> = {
    normal: '普通',
    urgent: '加急',
    vip: 'VIP',
  };
  return labels[priority];
};

export const getPriorityColor = (priority: PriorityLevel): string => {
  const colors: Record<PriorityLevel, string> = {
    normal: '#4E5969',
    urgent: '#F53F3F',
    vip: '#FF9800',
  };
  return colors[priority];
};

export const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
};

export const generateOrderNo = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `MD${year}${month}${day}${random}`;
};

export const calculateDistance = (
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number => {
  const R = 6371;
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const getServiceTypeLabel = (type: ServiceType): string => {
  const map: Record<ServiceType, string> = {
    knife_sharpening: '磨刀',
    scissors_sharpening: '剪刀打磨',
    garden_pruning: '园艺修剪',
    tree_pruning: '树木修剪',
  };
  return map[type] || type;
};

export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export const generateRoutePlan = (
  queueItems: QueueItem[],
  masterLocation: { lat: number; lng: number },
  serviceType?: ServiceType
): {
  items: RoutePlanItem[];
  totalDistance: number;
  totalDuration: number;
  totalPrice: number;
} => {
  let filtered = queueItems.filter((item) => item.status === 'waiting' || item.status === 'called');
  
  if (serviceType) {
    filtered = filtered.filter((item) => item.order.serviceType === serviceType);
  }

  const sorted = [...filtered].sort((a, b) => {
    if (b.priorityWeight !== a.priorityWeight) {
      return b.priorityWeight - a.priorityWeight;
    }
    return new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime();
  });

  let currentLoc = masterLocation;
  let cumulativeDist = 0;
  const now = new Date();

  const routeItems: RoutePlanItem[] = sorted.map((item, idx) => {
    const dist = calculateDistance(currentLoc, item.order.location);
    cumulativeDist += dist;
    const travelMinutes = Math.round(dist * 10);
    const arrival = new Date(now.getTime() + cumulativeDist * 10 * 60000);
    
    const routeItem: RoutePlanItem = {
      orderId: item.orderId,
      orderNo: item.order.orderNo,
      customerName: item.order.customerName,
      address: item.order.address,
      location: item.order.location,
      priority: item.priority,
      priorityWeight: item.priorityWeight,
      serviceType: item.order.serviceType,
      serviceName: item.order.serviceName,
      price: item.order.price,
      distanceFromPrev: dist,
      cumulativeDistance: Math.round(cumulativeDist * 10) / 10,
      sequence: idx + 1,
      estimatedArrival: arrival.toTimeString().slice(0, 5),
    };
    
    currentLoc = item.order.location;
    return routeItem;
  });

  const totalDistance = Math.round(cumulativeDist * 10) / 10;
  const totalDuration = Math.round(cumulativeDist * 10) + routeItems.length * 20;
  const totalPrice = routeItems.reduce((sum, item) => sum + item.price, 0);

  return {
    items: routeItems,
    totalDistance,
    totalDuration,
    totalPrice,
  };
};
