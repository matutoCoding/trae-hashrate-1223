import type { OrderDetail } from '@/types/order';
import { mockOrders } from './services';

export const mockOrderDetails: OrderDetail[] = mockOrders.map((order) => ({
  ...order,
  serviceItems: [
    { name: order.serviceName, quantity: order.quantity, price: order.price },
  ],
  timeline: [
    { status: 'created', time: order.createTime, description: '订单创建成功' },
    { status: 'matching', time: order.createTime, description: '开始匹配师傅' },
    ...(order.status === 'matched' ? [
      { status: 'matched', time: '2026-06-21 10:30:00', description: '双向匹配成功' },
    ] : []),
    ...(order.status === 'in_queue' ? [
      { status: 'queued', time: '2026-06-21 11:00:00', description: `已进入队列，当前第${order.queueNumber}位` },
    ] : []),
    ...(order.status === 'in_progress' ? [
      { status: 'in_progress', time: '2026-06-21 14:00:00', description: '师傅正在服务中' },
    ] : []),
    ...(order.status === 'completed' ? [
      { status: 'completed', time: '2026-06-21 15:00:00', description: '服务已完成' },
    ] : []),
  ],
}));
