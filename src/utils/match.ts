import type { MasterInfo } from '@/types/user';
import type { ServiceOrder } from '@/types/service';
import type { MatchItem } from '@/types/match';

export const calculateMatchScore = (
  order: ServiceOrder,
  master: MasterInfo
): {
  matchScore: number;
  distance: number;
  priceMatch: number;
  skillMatch: number;
  ratingScore: number;
  scheduleMatch: number;
} => {
  const distance = Math.random() * 10 + 1;
  const distanceScore = Math.max(0, 100 - distance * 5);

  const priceRange = master.priceRange;
  const orderPrice = order.price;
  const midPrice = (priceRange.min + priceRange.max) / 2;
  const priceDiff = Math.abs(orderPrice - midPrice) / midPrice;
  const priceMatch = Math.max(0, 100 - priceDiff * 100);

  const serviceTypeMap: Record<string, string> = {
    knife_sharpening: '磨刀',
    scissors_sharpening: '剪刀打磨',
    garden_pruning: '园艺修剪',
    tree_pruning: '树木修剪',
  };
  const targetSkill = serviceTypeMap[order.serviceType];
  const skillMatch = master.skills.includes(targetSkill) ? 90 + Math.random() * 10 : 30 + Math.random() * 40;

  const ratingScore = (master.rating / 5) * 100;

  const scheduleMatch = master.isOnline ? 85 + Math.random() * 15 : 50 + Math.random() * 30;

  const matchScore = distanceScore * 0.3 + priceMatch * 0.2 + skillMatch * 0.25 + ratingScore * 0.15 + scheduleMatch * 0.1;

  return {
    matchScore: Math.round(matchScore * 10) / 10,
    distance: Math.round(distance * 10) / 10,
    priceMatch: Math.round(priceMatch * 10) / 10,
    skillMatch: Math.round(skillMatch * 10) / 10,
    ratingScore: Math.round(ratingScore * 10) / 10,
    scheduleMatch: Math.round(scheduleMatch * 10) / 10,
  };
};

export const sortByMatchScore = (items: MatchItem[]): MatchItem[] => {
  return [...items].sort((a, b) => {
    if (a.isMatched && !b.isMatched) return -1;
    if (!a.isMatched && b.isMatched) return 1;
    return b.matchScore - a.matchScore;
  });
};

export const checkMutualMatch = (item: MatchItem): boolean => {
  return item.customerWilling && item.masterWilling;
};
