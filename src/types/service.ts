export type ServiceType = 'knife_sharpening' | 'scissors_sharpening' | 'garden_pruning' | 'tree_pruning';

export type ServiceStatus = 'pending' | 'matching' | 'matched' | 'in_queue' | 'in_progress' | 'completed' | 'cancelled';

export type PriorityLevel = 'normal' | 'urgent' | 'vip';

export interface ServiceItem {
  id: string;
  type: ServiceType;
  name: string;
  description: string;
  basePrice: number;
  unit: string;
  icon: string;
}

export interface ServiceOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  masterId?: string;
  masterName?: string;
  masterAvatar?: string;
  serviceType: ServiceType;
  serviceName: string;
  description: string;
  quantity: number;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  appointmentTime: string;
  priority: PriorityLevel;
  status: ServiceStatus;
  price: number;
  createTime: string;
  matchScore?: number;
  customerWilling?: boolean;
  masterWilling?: boolean;
  isMatched?: boolean;
  queueNumber?: number;
  estimatedWaitTime?: number;
  notes?: string;
}
