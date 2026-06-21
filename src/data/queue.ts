import type { QueueItem, QueueInfo } from '@/types/queue';
import { mockOrders } from './services';
import { getPriorityWeight } from '@/utils/index';

const queueOrders = mockOrders.filter((o) => o.status === 'in_queue' || o.status === 'matched');

export const mockQueueItems: QueueItem[] = queueOrders.map((order, idx) => {
  const priorityWeight = getPriorityWeight(order.priority);
  return {
    id: `queue_${order.id}`,
    orderId: order.id,
    order,
    queueNumber: idx + 1,
    priority: order.priority,
    priorityWeight,
    status: idx === 0 ? 'serving' : 'waiting',
    joinTime: `2026-06-21 ${10 + idx}:00:00`,
    startTime: idx === 0 ? '2026-06-21 11:00:00' : undefined,
    estimatedWaitTime: idx * 15 + 10,
    position: idx + 1,
  };
}).sort((a, b) => {
  if (a.status === 'serving') return -1;
  if (b.status === 'serving') return 1;
  if (b.priorityWeight !== a.priorityWeight) {
    return b.priorityWeight - a.priorityWeight;
  }
  return new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime();
}).map((item, idx) => ({
  ...item,
  position: item.status === 'serving' ? 0 : idx,
}));

export const mockQueueInfo: QueueInfo = {
  id: 'q1',
  name: '朝阳区上门服务队列',
  location: '北京市朝阳区及周边',
  currentNumber: 1,
  totalWaiting: mockQueueItems.filter((i) => i.status === 'waiting').length,
  servingCount: mockQueueItems.filter((i) => i.status === 'serving').length,
  items: mockQueueItems,
  avgWaitTime: 25,
};
