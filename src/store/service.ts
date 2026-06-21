import { create } from 'zustand';
import type { ServiceOrder, ServiceItem, PriorityLevel } from '@/types/service';
import { mockOrders, serviceItems } from '@/data/services';
import { generateOrderNo } from '@/utils/index';
import { persistStore } from '@/utils/persist';

const persist = persistStore<{ orders: ServiceOrder[] }>('service_store', { orders: mockOrders });
const saved = persist.load();

interface ServiceStore {
  orders: ServiceOrder[];
  serviceItems: ServiceItem[];
  addOrder: (order: Omit<ServiceOrder, 'id' | 'orderNo' | 'createTime' | 'status'>) => ServiceOrder;
  updateOrder: (id: string, updates: Partial<ServiceOrder>) => void;
  getOrderById: (id: string) => ServiceOrder | undefined;
}

export const useServiceStore = create<ServiceStore>((set, get) => ({
  orders: saved.orders || mockOrders,
  serviceItems,
  addOrder: (orderData) => {
    const newOrder: ServiceOrder = {
      ...orderData,
      id: `o_${Date.now()}`,
      orderNo: generateOrderNo(),
      createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: 'matching',
    };
    set((state) => ({ orders: [newOrder, ...state.orders] }));
    console.log('[ServiceStore] addOrder:', newOrder.orderNo);
    return newOrder;
  },
  updateOrder: (id, updates) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    }));
    console.log('[ServiceStore] updateOrder:', id, updates);
  },
  getOrderById: (id) => get().orders.find((o) => o.id === id),
}));

useServiceStore.subscribe((state) => {
  persist.save({ orders: state.orders });
});