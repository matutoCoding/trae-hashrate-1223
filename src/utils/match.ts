import type { MasterInfo } from '@/types/user';
import type { ServiceOrder } from '@/types/service';
import type { MatchItem } from '@/types/match';

const hashString = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const getPairRandom = (key1: string, key2: string, salt = ''): number => {
  const combined = `${key1}_${key2}_${salt}`;
  return seededRandom(hashString(combined));
};

const calculateDistance = (
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number => {
  const R = 6371;
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

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
  const distance = order.location && master.location
    ? calculateDistance(order.location, master.location)
    : 3 + getPairRandom(order.id, master.id, 'dist') * 8;

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
  const skillBase = master.skills.includes(targetSkill) ? 90 : 35;
  const skillVariation = getPairRandom(order.id, master.id, 'skill') * 10;
  const skillMatch = skillBase + skillVariation;

  const ratingScore = (master.rating / 5) * 100;

  const scheduleBase = master.isOnline ? 85 : 55;
  const scheduleVariation = getPairRandom(order.id, master.id, 'schedule') * (master.isOnline ? 15 : 25);
  const scheduleMatch = scheduleBase + scheduleVariation;

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
