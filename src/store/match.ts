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
  setCustomerWilling: (matchId: string, willing: boolean) => boolean;
  setMasterWilling: (orderIdOrMatchId: string, masterIdOrWilling: string | boolean, willingParam?: boolean) => boolean;
  lockOrderForMaster: (orderId: string, master: MasterInfo) => void;
  isOrderLocked: (orderId: string) => { locked: boolean; master?: MasterInfo };
  getMatchesByOrder: (orderId: string) => MatchItem[];
  getMatchesByMaster: (masterId: string) => MatchItem[];
  getMutualMatches: () => MatchItem[];
  findMatchByOrderAndMaster: (orderId: string, masterId: string) => MatchItem | undefined;
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
        isLocked: false,
      };
    });

    set((state) => ({
      matches: sortByMatchScore([...state.matches, ...newMatches]),
    }));
    console.log('[MatchStore] generateMatchesForOrder:', order.id, newMatches.length, 'matches');
  },
  setCustomerWilling: (matchId, willing) => {
    const match = get().matches.find((m) => m.id === matchId);
    if (!match) return false;
    
    const lockInfo = get().isOrderLocked(match.order.id);
    if (lockInfo.locked && lockInfo.master?.id !== match.master.id) {
      console.log('[MatchStore] setCustomerWilling: order locked by other master', match.order.id);
      return false;
    }

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
    return true;
  },
  setMasterWilling: (orderIdOrMatchId, masterIdOrWilling, willingParam) => {
    let matchId: string | undefined;
    let willing: boolean;

    if (typeof masterIdOrWilling === 'boolean') {
      matchId = orderIdOrMatchId;
      willing = masterIdOrWilling;
    } else {
      const match = get().findMatchByOrderAndMaster(orderIdOrMatchId, masterIdOrWilling);
      if (!match) {
        console.log('[MatchStore] setMasterWilling: match not found', orderIdOrMatchId, masterIdOrWilling);
        return false;
      }
      matchId = match.id;
      willing = willingParam ?? true;
    }

    const match = get().matches.find((m) => m.id === matchId);
    if (!match) return false;
    
    const lockInfo = get().isOrderLocked(match.order.id);
    if (lockInfo.locked && lockInfo.master?.id !== match.master.id) {
      console.log('[MatchStore] setMasterWilling: order locked by other master', match.order.id);
      return false;
    }

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
    console.log('[MatchStore] setMasterWilling:', matchId, willing, 'order:', match.order.id, 'master:', match.master.id);
    return true;
  },
  lockOrderForMaster: (orderId, master) => {
    set((state) => {
      const updated = state.matches.map((m) => {
        if (m.order.id === orderId) {
          return {
            ...m,
            isLocked: true,
            lockedByMaster: master,
          };
        }
        return m;
      });
      return { matches: sortByMatchScore(updated) };
    });
    console.log('[MatchStore] lockOrderForMaster:', orderId, 'locked by', master.id);
  },
  isOrderLocked: (orderId) => {
    const lockedMatch = get().matches.find((m) => m.order.id === orderId && m.isLocked);
    if (lockedMatch && lockedMatch.lockedByMaster) {
      return { locked: true, master: lockedMatch.lockedByMaster };
    }
    return { locked: false };
  },
  getMatchesByOrder: (orderId) => get().matches.filter((m) => m.order.id === orderId),
  getMatchesByMaster: (masterId) => get().matches.filter((m) => m.master.id === masterId),
  getMutualMatches: () => get().matches.filter((m) => m.isMatched),
  findMatchByOrderAndMaster: (orderId, masterId) =>
    get().matches.find((m) => m.order.id === orderId && m.master.id === masterId),
}));

useMatchStore.subscribe((state) => {
  persist.save({ matches: state.matches });
});
