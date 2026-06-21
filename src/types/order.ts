import type { ServiceOrder } from './service';

export type OrderStatus = 'pending' | 'matched' | 'queued' | 'in_progress' | 'completed' | 'cancelled';

export interface OrderDetail extends ServiceOrder {
  serviceItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  timeline: Array<{
    status: string;
    time: string;
    description: string;
  }>;
}
