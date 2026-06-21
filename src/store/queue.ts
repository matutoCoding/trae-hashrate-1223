import { create } from 'zustand';
import type {
  QueueItem,
  QueueInfo,
  QueueStatus,
  RoutePackage,
  CustomerRouteProgress,
  RoutePlanItem,
} from '@/types/queue';
import type { PriorityLevel, ServiceType } from '@/types/service';
import type { MasterInfo } from '@/types/user';
import { mockQueueInfo, mockQueueItems } from '@/data/queue';
import { getPriorityWeight, generateRoutePlan } from '@/utils/index';
import { persistStore } from '@/utils/persist';
import { mockMasters } from '@/data/masters';

const DEFAULT_MASTER: MasterInfo = {
  id: 'master_default',
  name: '平台指派师傅',
  avatar: 'https://img.icons8.com/color/96/barber.png',
  rating: 4.8,
  skills: ['knife_sharpening', 'scissors_sharpening'],
  serviceRange: 5,
  location: { lat: 39.9042, lng: 116.4074 },
  orderCount: 120,
  priceRange: { min: 30, max: 150 },
};

const fallbackMaster = (masterId: string): MasterInfo => {
  const existing = mockMasters.find((m) => m.id === masterId);
  if (existing) return existing;
  return { ...DEFAULT_MASTER, id: masterId, name: `师傅${masterId.slice(-4)}` };
};

const sanitizeQueueItem = (item: QueueItem): QueueItem => {
  if (!item.master) {
    const master = fallbackMaster(item.order.masterId || DEFAULT_MASTER.id);
    return {
      ...item,
      master,
      order: {
        ...item.order,
        masterId: master.id,
        masterName: master.name,
        masterAvatar: master.avatar,
      },
    };
  }
  return item;
};

const persist = persistStore<{
  queueItems: QueueItem[];
  queueInfo: QueueInfo;
  routePackages: RoutePackage[];
}>('queue_store_v2', {
  queueItems: mockQueueItems,
  queueInfo: mockQueueInfo,
  routePackages: [],
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

interface MasterDailyOverview {
  pendingOrders: number;
  acceptedRoutes: number;
  inProgress: number;
  completedToday: number;
  totalEarningsToday: number;
}

interface QueueStore {
  queueInfo: QueueInfo;
  queueItems: QueueItem[];
  routePackages: RoutePackage[];
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
  createRoutePackage: (masterId: string, masterLocation: { lat: number; lng: number }, serviceType?: ServiceType) => RoutePackage | null;
  acceptRoutePackage: (packageId: string) => boolean;
  updateRoutePackageStatus: (packageId: string, status: RoutePackage['status'], currentSequence?: number) => void;
  getRoutePackageById: (packageId: string) => RoutePackage | undefined;
  getActiveRoutePackagesByMaster: (masterId: string) => RoutePackage[];
  getCustomerRouteProgress: (orderId: string) => CustomerRouteProgress | null;
  getMasterDailyOverview: (masterId: string) => MasterDailyOverview;
  completeService: (itemId: string) => void;
}

const sortQueueItems = (items: QueueItem[]): QueueItem[] => {
  return [...items]
    .map(sanitizeQueueItem)
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

const isToday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  queueInfo: saved.queueInfo || mockQueueInfo,
  queueItems: sortQueueItems(saved.queueItems || mockQueueItems),
  routePackages: saved.routePackages || [],

  addToQueue: (orderId, priority, order, master) => {
    const existing = get().queueItems.find((i) => i.orderId === orderId);
    if (existing) {
      const cleanItem = sanitizeQueueItem(existing);
      console.log('[QueueStore] addToQueue: already exists, return info', orderId);
      return {
        success: true,
        isNew: false,
        queueNumber: cleanItem.queueNumber,
        position: cleanItem.position,
        masterName: cleanItem.master.name,
        status: getStatusText(cleanItem.status),
      };
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const maxNum = Math.max(...get().queueItems.map((i) => i.queueNumber), 0);
    const cleanMaster = master || DEFAULT_MASTER;
    const newItem: QueueItem = {
      id: `queue_${orderId}`,
      orderId,
      order: {
        ...order,
        status: 'in_queue',
        masterId: cleanMaster.id,
        masterName: cleanMaster.name,
        masterAvatar: cleanMaster.avatar,
      },
      master: cleanMaster,
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
    console.log('[QueueStore] addToQueue: added', orderId, priority, 'master:', cleanMaster.id);
    const updatedItem = get().queueItems.find((i) => i.orderId === orderId)!;
    return {
      success: true,
      isNew: true,
      queueNumber: updatedItem.queueNumber,
      position: updatedItem.position,
      masterName: cleanMaster.name,
      status: '排队中',
    };
  },

  upgradePriority: (itemId, newPriority) => {
    set((state) => {
      const items = sortQueueItems(
        state.queueItems.map((item) =>
          item.id === itemId
            ? {
                ...sanitizeQueueItem(item),
                priority: newPriority,
                priorityWeight: getPriorityWeight(newPriority),
                order: { ...item.order, priority: newPriority },
              }
            : sanitizeQueueItem(item)
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
          const clean = sanitizeQueueItem(item);
          const updates: Partial<QueueItem> = { status };
          if (status === 'called') updates.callTime = now;
          if (status === 'serving') updates.startTime = now;
          if (status === 'completed') updates.endTime = now;
          return { ...clean, ...updates };
        }
        return sanitizeQueueItem(item);
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

  getMyQueueItem: (orderId) => {
    const item = get().queueItems.find((i) => i.orderId === orderId);
    return item ? sanitizeQueueItem(item) : undefined;
  },
  hasQueueItem: (orderId) => get().queueItems.some((i) => i.orderId === orderId),
  getQueueItemByOrder: (orderId) => {
    const item = get().queueItems.find((i) => i.orderId === orderId);
    return item ? sanitizeQueueItem(item) : undefined;
  },

  generateRoutePlanForMaster: (masterId, masterLocation, serviceType) => {
    const masterItems = get()
      .queueItems.filter((item) => item.master.id === masterId)
      .map(sanitizeQueueItem);
    
    const plan = generateRoutePlan(masterItems, masterLocation, serviceType);
    
    plan.items = plan.items.map((planItem) => {
      const queueItem = masterItems.find((q) => q.orderId === planItem.orderId);
      if (queueItem) {
        return {
          ...planItem,
          queueNumber: queueItem.queueNumber,
          queueStatus: queueItem.status,
        };
      }
      return planItem;
    });

    return plan;
  },

  createRoutePackage: (masterId, masterLocation, serviceType) => {
    const plan = get().generateRoutePlanForMaster(masterId, masterLocation, serviceType);
    if (plan.items.length === 0) return null;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const pkg: RoutePackage = {
      id: `route_${Date.now()}_${masterId}`,
      masterId,
      serviceType,
      createdAt: now,
      accepted: false,
      status: 'pending',
      items: plan.items,
      totalDistance: plan.totalDistance,
      totalDuration: plan.totalDuration,
      totalPrice: plan.totalPrice,
    };

    set((state) => {
      const updatedItems = state.queueItems.map((item) => {
        if (plan.items.some((pi) => pi.orderId === item.orderId)) {
          return { ...sanitizeQueueItem(item), routePackageId: pkg.id };
        }
        return sanitizeQueueItem(item);
      });
      return {
        routePackages: [...state.routePackages, pkg],
        queueItems: sortQueueItems(updatedItems),
      };
    });

    console.log('[QueueStore] createRoutePackage:', pkg.id, 'items:', pkg.items.length);
    return pkg;
  },

  acceptRoutePackage: (packageId) => {
    const pkg = get().getRoutePackageById(packageId);
    if (!pkg || pkg.accepted) return false;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    set((state) => ({
      routePackages: state.routePackages.map((p) =>
        p.id === packageId
          ? { ...p, accepted: true, acceptedAt: now, status: 'accepted' as const }
          : p
      ),
    }));
    console.log('[QueueStore] acceptRoutePackage:', packageId);
    return true;
  },

  updateRoutePackageStatus: (packageId, status, currentSequence) => {
    set((state) => ({
      routePackages: state.routePackages.map((p) =>
        p.id === packageId
          ? { ...p, status, currentSequence: currentSequence ?? p.currentSequence }
          : p
      ),
    }));
    console.log('[QueueStore] updateRoutePackageStatus:', packageId, status, currentSequence);
  },

  getRoutePackageById: (packageId) => get().routePackages.find((p) => p.id === packageId),

  getActiveRoutePackagesByMaster: (masterId) =>
    get().routePackages.filter(
      (p) => p.masterId === masterId && (p.status === 'pending' || p.status === 'accepted' || p.status === 'in_progress')
    ),

  getCustomerRouteProgress: (orderId) => {
    const queueItem = get().getQueueItemByOrder(orderId);
    if (!queueItem) return null;

    const cleanItem = sanitizeQueueItem(queueItem);
    const routePkg = cleanItem.routePackageId
      ? get().getRoutePackageById(cleanItem.routePackageId)
      : get().routePackages.find((p) => p.items.some((i) => i.orderId === orderId));

    if (!routePkg) {
      const waitingItems = get().queueItems.filter(
        (i) => i.status === 'waiting' || i.status === 'called' || i.status === 'serving'
      );
      const sorted = sortQueueItems(waitingItems);
      const myIdx = sorted.findIndex((i) => i.orderId === orderId);
      return {
        orderId: cleanItem.orderId,
        orderNo: cleanItem.order.orderNo,
        routePackageId: '',
        master: cleanItem.master,
        totalStops: Math.max(myIdx + 1, 1),
        currentStop: cleanItem.status === 'serving' ? 1 : 0,
        stopsAhead: Math.max(myIdx, 0),
        cumulativeDistanceToMe: 0,
        estimatedArrival: '排队中，请稍候',
        estimatedWaitMinutes: cleanItem.position * 20,
        allStops: [],
      };
    }

    const myStop = routePkg.items.find((i) => i.orderId === orderId);
    if (!myStop) return null;

    const currentStop = routePkg.currentSequence || 0;
    const myIdx = myStop.sequence;
    const stopsAhead = Math.max(myIdx - currentStop, 0);
    const servingItem = get().queueItems.find((i) => i.status === 'serving');
    const effectiveCurrentStop = servingItem
      ? routePkg.items.findIndex((i) => i.orderId === servingItem.orderId) + 1
      : currentStop;

    const stops = routePkg.items.filter((i) => i.sequence <= myIdx);
    const cumulativeDistToMe = stops.length > 0 ? stops[stops.length - 1].cumulativeDistance : 0;
    const remainingDist = cumulativeDistToMe - (routePkg.items[effectiveCurrentStop - 1]?.cumulativeDistance || 0);
    const etaMinutes = Math.max(Math.round(remainingDist * 10 + stopsAhead * 15), 5);
    const eta = new Date(Date.now() + etaMinutes * 60000);

    return {
      orderId: cleanItem.orderId,
      orderNo: cleanItem.order.orderNo,
      routePackageId: routePkg.id,
      master: cleanItem.master,
      totalStops: routePkg.items.length,
      currentStop: effectiveCurrentStop,
      stopsAhead: myIdx > effectiveCurrentStop ? myIdx - effectiveCurrentStop : 0,
      cumulativeDistanceToMe: cumulativeDistToMe,
      estimatedArrival: eta.toTimeString().slice(0, 5),
      estimatedWaitMinutes: etaMinutes,
      allStops: routePkg.items,
    };
  },

  getMasterDailyOverview: (masterId) => {
    const today = new Date().toDateString();
    const masterItems = get().queueItems
      .filter((i) => i.master.id === masterId)
      .map(sanitizeQueueItem);

    const pendingOrders = masterItems.filter((i) => i.status === 'waiting').length;

    const todayItems = masterItems.filter((i) => isToday(i.joinTime));
    const completedToday = todayItems.filter((i) => i.status === 'completed');
    const totalEarningsToday = completedToday.reduce((sum, i) => sum + i.order.price, 0);

    const inProgressItems = masterItems.filter(
      (i) => i.status === 'serving' || i.status === 'called'
    );

    const activePackages = get().getActiveRoutePackagesByMaster(masterId);

    return {
      pendingOrders,
      acceptedRoutes: activePackages.filter((p) => p.accepted).length,
      inProgress: inProgressItems.length,
      completedToday: completedToday.length,
      totalEarningsToday,
    };
  },

  completeService: (itemId) => {
    get().updateQueueStatus(itemId, 'completed');
    const item = get().queueItems.find((i) => i.id === itemId);
    if (item && item.routePackageId) {
      const routePkg = get().getRoutePackageById(item.routePackageId);
      if (routePkg) {
        const doneCount = routePkg.items.filter((i) => {
          const q = get().queueItems.find((qi) => qi.orderId === i.orderId);
          return q?.status === 'completed';
        }).length;
        if (doneCount >= routePkg.items.length) {
          get().updateRoutePackageStatus(routePkg.id, 'completed');
        } else {
          const seq = routePkg.items.find((i) => i.orderId === item.orderId)?.sequence || 0;
          get().updateRoutePackageStatus(routePkg.id, 'in_progress', seq);
        }
      }
    }
  },
}));

useQueueStore.subscribe((state) => {
  persist.save({
    queueItems: state.queueItems,
    queueInfo: state.queueInfo,
    routePackages: state.routePackages,
  });
});
