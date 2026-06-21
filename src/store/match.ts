import { create } from 'zustand';
import type { MatchItem } from '@/types/match';
import type { ServiceOrder } from '@/types/service';
import type { MasterInfo } from '@/types/user';
import { mockMatches } from '@/data/match';
import { sortByMatchScore, checkMutualMatch, calculateMatchScore } from '@/utils/match';
import { mockMasters } from '@/data/masters';
import { persistStore } from '@/utils/persist';

const persist = persistStore<{ matches: MatchItem[] }>('match_store', { matches: mockMatches });
const saved = persist.load();

interface MatchStore {
  matches: MatchItem[];
  generateMatchesForOrder: (order: ServiceOrder, masters?: MasterInfo[]) => void;
  setCustomerWilling: (matchId: string, willing: boolean) => void;
  setMasterWilling: (matchId: string, willing: boolean) => void;
  getMatchesByOrder: (orderId: string) => MatchItem[];
  getMatchesByMaster: (masterId: string) => MatchItem[];
  getMutualMatches: () => MatchItem[];
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matches: saved.matches || mockMatches,
  generateMatchesForOrder: (order, masters = mockMasters) => {
    const existing = get().matches.filter((m) => m.order.id === order.id);
    if (existing.length > 0) {
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newMatches: MatchItem[] = masters.map((master) => {
      const scores = calculateMatchScore(order, master);
      return {
        id: `match_${order.id}_${master.id}`,
        order,
        master,
        ...scores,
        customerWilling: false,
        masterWilling: false,
        isMatched: false,
        createTime: now,
      };
    });

    set((state) => ({
      matches: sortByMatchScore([...state.matches, ...newMatches]),
    }));
    console.log('[MatchStore] generateMatchesForOrder:', order.id, newMatches.length, 'matches');
  },
  setCustomerWilling: (matchId, willing) => {
    set((state) => {
      const updated = state.matches.map((m) => {
        if (m.id === matchId) {
          const updatedMatch = { ...m, customerWilling: willing };
          updatedMatch.isMatched = checkMutualMatch(updatedMatch);
          return updatedMatch;
        }
        return m;
      });
      return { matches: sortByMatchScore(updated) };
    });
    console.log('[MatchStore] setCustomerWilling:', matchId, willing);
  },
  setMasterWilling: (matchId, willing) => {
    set((state) => {
      const updated = state.matches.map((m) => {
        if (m.id === matchId) {
          const updatedMatch = { ...m, masterWilling: willing };
          updatedMatch.isMatched = checkMutualMatch(updatedMatch);
          return updatedMatch;
        }
        return m;
      });
      return { matches: sortByMatchScore(updated) };
    });
    console.log('[MatchStore] setMasterWilling:', matchId, willing);
  },
  getMatchesByOrder: (orderId) => get().matches.filter((m) => m.order.id === orderId),
  getMatchesByMaster: (masterId) => get().matches.filter((m) => m.master.id === masterId),
  getMutualMatches: () => get().matches.filter((m) => m.isMatched),
}));

useMatchStore.subscribe((state) => {
  persist.save({ matches: state.matches });
});
