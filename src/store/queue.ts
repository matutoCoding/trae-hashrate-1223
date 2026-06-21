import { create } from 'zustand';
import type { QueueItem, QueueInfo, QueueStatus } from '@/types/queue';
import type { PriorityLevel } from '@/types/service';
import type { MasterInfo } from '@/types/user';
import { mockQueueInfo, mockQueueItems } from '@/data/queue';
import { getPriorityWeight, generateRoutePlan } from '@/utils/index';
import { persistStore } from '@/utils/persist';
import type { ServiceType } from '@/types/service';
import type { RoutePlanItem } from '@/types/queue';

const persist = persistStore<{ queueItems: QueueItem[]; queueInfo: QueueInfo }>('queue_store', {
  queueItems: mockQueueItems,
  queueInfo: mockQueueInfo,
});
const saved = persist.load();

interface AddToQueueResult {
  success: boolean;
  isNew: boolean;
  queueNumber: number;
  position: number;
  masterName: string;
  status: string;
}

interface QueueStore {
  queueInfo: QueueInfo;
  queueItems: QueueItem[];
  addToQueue: (orderId: string, priority: PriorityLevel, order: QueueItem['order'], master: MasterInfo) => AddToQueueResult;
  upgradePriority: (itemId: string, newPriority: PriorityLevel) => void;
  updateQueueStatus: (itemId: string, status: QueueStatus) => void;
  callNext: () => void;
  sortQueue: () => void;
  getMyQueueItem: (orderId: string) => QueueItem | undefined;
  hasQueueItem: (orderId: string) => boolean;
  getQueueItemByOrder: (orderId: string) => QueueItem | undefined;
  generateRoutePlanForMaster: (masterId: string, masterLocation: { lat: number; lng: number }, serviceType?: ServiceType) => {
    items: RoutePlanItem[];
    totalDistance: number;
    totalDuration: number;
    totalPrice: number;
  };
}

const sortQueueItems = (items: QueueItem[]): QueueItem[] => {
  return [...items]
    .sort((a, b) => {
      if (a.status === 'serving') return -1;
      if (b.status === 'serving') return 1;
      if (a.status === 'called' && b.status !== 'called') return -1;
      if (b.status === 'called' && a.status !== 'called') return 1;
      if (a.status !== 'waiting') return 1;
      if (b.status !== 'waiting') return -1;
      if (b.priorityWeight !== a.priorityWeight) {
        return b.priorityWeight - a.priorityWeight;
      }
      return new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime();
    })
    .map((item, idx) => ({
      ...item,
      position: item.status === 'serving' ? 0 : item.status === 'called' ? 1 : idx,
    }));
};

const getStatusText = (status: QueueStatus): string => {
  const map: Record<QueueStatus, string> = {
    waiting: '排队中',
    called: '已叫号',
    serving: '服务中',
    completed: '已完成',
    left: '已离开',
  };
  return map[status];
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  queueInfo: saved.queueInfo || mockQueueInfo,
  queueItems: sortQueueItems(saved.queueItems || mockQueueItems),

  addToQueue: (orderId, priority, order, master) => {
    const existing = get().queueItems.find((i) => i.orderId === orderId);
    if (existing) {
      console.log('[QueueStore] addToQueue: already exists, return info', orderId);
      return {
        success: true,
        isNew: false,
        queueNumber: existing.queueNumber,
        position: existing.position,
        masterName: existing.master.name,
        status: getStatusText(existing.status),
      };
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const maxNum = Math.max(...get().queueItems.map((i) => i.queueNumber), 0);
    const newItem: QueueItem = {
      id: `queue_${orderId}`,
      orderId,
      order: { 
        ...order, 
        status: 'in_queue',
        masterId: master.id,
        masterName: master.name,
        masterAvatar: master.avatar,
      },
      master,
      queueNumber: maxNum + 1,
      priority,
      priorityWeight: getPriorityWeight(priority),
      status: 'waiting',
      joinTime: now,
      estimatedWaitTime: 30,
      position: 999,
    };
    set((state) => {
      const items = sortQueueItems([...state.queueItems, newItem]);
      return {
        queueItems: items,
        queueInfo: {
          ...state.queueInfo,
          totalWaiting: items.filter((i) => i.status === 'waiting').length,
        },
      };
    });
    console.log('[QueueStore] addToQueue: added', orderId, priority, 'master:', master.id);
    const updatedItem = get().queueItems.find((i) => i.orderId === orderId)!;
    return {
      success: true,
      isNew: true,
      queueNumber: updatedItem.queueNumber,
      position: updatedItem.position,
      masterName: master.name,
      status: '排队中',
    };
  },

  upgradePriority: (itemId, newPriority) => {
    set((state) => {
      const items = sortQueueItems(
        state.queueItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                priority: newPriority,
                priorityWeight: getPriorityWeight(newPriority),
                order: { ...item.order, priority: newPriority },
              }
            : item
        )
      );
      return { queueItems: items };
    });
    console.log('[QueueStore] upgradePriority:', itemId, newPriority);
  },

  updateQueueStatus: (itemId, status) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    set((state) => {
      const items = state.queueItems.map((item) => {
        if (item.id === itemId) {
          const updates: Partial<QueueItem> = { status };
          if (status === 'called') updates.callTime = now;
          if (status === 'serving') updates.startTime = now;
          if (status === 'completed') updates.endTime = now;
          return { ...item, ...updates };
        }
        return item;
      });
      return { queueItems: sortQueueItems(items) };
    });
    console.log('[QueueStore] updateQueueStatus:', itemId, status);
  },

  callNext: () => {
    const state = get();
    const nextItem = state.queueItems.find((i) => i.status === 'waiting');
    if (nextItem) {
      get().updateQueueStatus(nextItem.id, 'called');
      console.log('[QueueStore] callNext:', nextItem.id);
    }
  },

  sortQueue: () => {
    set((state) => ({ queueItems: sortQueueItems(state.queueItems) }));
  },

  getMyQueueItem: (orderId) => get().queueItems.find((i) => i.orderId === orderId),
  hasQueueItem: (orderId) => get().queueItems.some((i) => i.orderId === orderId),
  getQueueItemByOrder: (orderId) => get().queueItems.find((i) => i.orderId === orderId),

  generateRoutePlanForMaster: (masterId, masterLocation, serviceType) => {
    const masterItems = get().queueItems.filter((item) => item.master.id === masterId);
    return generateRoutePlan(masterItems, masterLocation, serviceType);
  },
}));

useQueueStore.subscribe((state) => {
  persist.save({ queueItems: state.queueItems, queueInfo: state.queueInfo });
});
