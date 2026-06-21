import type { MatchItem } from '@/types/match';
import { mockOrders } from './services';
import { mockMasters } from './masters';
import { calculateMatchScore, checkMutualMatch } from '@/utils/match';

const generateMockMatches = (): MatchItem[] => {
  const matches: MatchItem[] = [];
  const matchingOrders = mockOrders.filter((o) => o.status === 'matching' || o.status === 'matched');

  matchingOrders.forEach((order, orderIdx) => {
    mockMasters.slice(0, 4).forEach((master, masterIdx) => {
      const scores = calculateMatchScore(order, master);
      const id = `match_${order.id}_${master.id}`;
      const customerWilling = orderIdx === 0 && masterIdx < 2;
      const masterWilling = masterIdx === 0 || (orderIdx === 2 && masterIdx === 2);
      const isMatched = checkMutualMatch({
        id,
        order,
        master,
        ...scores,
        customerWilling,
        masterWilling,
        isMatched: false,
        createTime: '',
      });

      matches.push({
        id,
        order,
        master,
        ...scores,
        customerWilling,
        masterWilling,
        isMatched,
        createTime: '2026-06-21 10:00:00',
      });
    });
  });

  return matches.sort((a, b) => {
    if (a.isMatched && !b.isMatched) return -1;
    if (!a.isMatched && b.isMatched) return 1;
    return b.matchScore - a.matchScore;
  });
};

export const mockMatches: MatchItem[] = generateMockMatches();
