import { create } from 'zustand';
import type { QueueItem, QueueInfo, QueueStatus } from '@/types/queue';
import type { PriorityLevel } from '@/types/service';
import { mockQueueInfo, mockQueueItems } from '@/data/queue';
import { getPriorityWeight } from '@/utils/index';
import { persistStore } from '@/utils/persist';

const persist = persistStore<{ queueItems: QueueItem[]; queueInfo: QueueInfo }>('queue_store', {
  queueItems: mockQueueItems,
  queueInfo: mockQueueInfo,
});
const saved = persist.load();

interface QueueStore {
  queueInfo: QueueInfo;
  queueItems: QueueItem[];
  addToQueue: (orderId: string, priority: PriorityLevel, order: QueueItem['order']) => boolean;
  upgradePriority: (itemId: string, newPriority: PriorityLevel) => void;
  updateQueueStatus: (itemId: string, status: QueueStatus) => void;
  callNext: () => void;
  sortQueue: () => void;
  getMyQueueItem: (orderId: string) => QueueItem | undefined;
  hasQueueItem: (orderId: string) => boolean;
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

export const useQueueStore = create<QueueStore>((set, get) => ({
  queueInfo: saved.queueInfo || mockQueueInfo,
  queueItems: sortQueueItems(saved.queueItems || mockQueueItems),

  addToQueue: (orderId, priority, order) => {
    const existing = get().queueItems.find((i) => i.orderId === orderId);
    if (existing) {
      console.log('[QueueStore] addToQueue: already exists, skip', orderId);
      return false;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const maxNum = Math.max(...get().queueItems.map((i) => i.queueNumber), 0);
    const newItem: QueueItem = {
      id: `queue_${orderId}`,
      orderId,
      order: { ...order, status: 'in_queue' },
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
    console.log('[QueueStore] addToQueue: added', orderId, priority);
    return true;
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
}));

useQueueStore.subscribe((state) => {
  persist.save({ queueItems: state.queueItems, queueInfo: state.queueInfo });
});
