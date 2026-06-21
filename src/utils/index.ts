import type { PriorityLevel } from '@/types/service';

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
