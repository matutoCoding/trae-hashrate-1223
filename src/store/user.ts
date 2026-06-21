import { create } from 'zustand';
import type { UserInfo, UserRole, MasterInfo } from '@/types/user';
import { mockMasters } from '@/data/masters';

interface UserStore {
  currentUser: UserInfo | MasterInfo | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  setCurrentUser: (user: UserInfo | MasterInfo) => void;
  masters: MasterInfo[];
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: {
    id: 'c1',
    name: '当前用户',
    avatar: 'https://picsum.photos/id/64/200/200',
    phone: '138****0000',
    role: 'customer',
    address: '北京市朝阳区建国路88号',
    location: { lat: 39.9042, lng: 116.4074 },
  },
  role: 'customer',
  setRole: (role) => set({ role }),
  setCurrentUser: (user) => set({ currentUser: user }),
  masters: mockMasters,
}));
