import { create } from 'zustand';
import type { MatchItem } from '@/types/match';
import { mockMatches } from '@/data/match';
import { sortByMatchScore, checkMutualMatch } from '@/utils/match';

interface MatchStore {
  matches: MatchItem[];
  setCustomerWilling: (matchId: string, willing: boolean) => void;
  setMasterWilling: (matchId: string, willing: boolean) => void;
  getMatchesByOrder: (orderId: string) => MatchItem[];
  getMatchesByMaster: (masterId: string) => MatchItem[];
  getMutualMatches: () => MatchItem[];
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matches: mockMatches,
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
