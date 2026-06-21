import type { ServiceOrder } from './service';
import type { MasterInfo } from './user';

export interface MatchItem {
  id: string;
  order: ServiceOrder;
  master: MasterInfo;
  matchScore: number;
  distance: number;
  priceMatch: number;
  skillMatch: number;
  ratingScore: number;
  scheduleMatch: number;
  customerWilling: boolean;
  masterWilling: boolean;
  isMatched: boolean;
  createTime: string;
}

export interface MatchResult {
  items: MatchItem[];
  totalCount: number;
}
