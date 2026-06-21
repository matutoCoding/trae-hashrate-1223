import { create } from 'zustand';
import type { UserInfo, UserRole, MasterInfo } from '@/types/user';
import { mockMasters } from '@/data/masters';
import { persistStore } from '@/utils/persist';

const defaultUser = {
  id: 'c1',
  name: '当前用户',
  avatar: 'https://picsum.photos/id/64/200/200',
  phone: '138****0000',
  role: 'customer' as UserRole,
  address: '北京市朝阳区建国路88号',
  location: { lat: 39.9042, lng: 116.4074 },
};

const persist = persistStore<{ currentUser: UserInfo | MasterInfo | null; role: UserRole }>('user_store', {
  currentUser: defaultUser,
  role: 'customer',
});
const saved = persist.load();

interface UserStore {
  currentUser: UserInfo | MasterInfo | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  setCurrentUser: (user: UserInfo | MasterInfo) => void;
  masters: MasterInfo[];
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: (saved.currentUser || defaultUser) as UserInfo | MasterInfo,
  role: saved.role || 'customer',
  setRole: (role) => set({ role }),
  setCurrentUser: (user) => set({ currentUser: user }),
  masters: mockMasters,
}));

useUserStore.subscribe((state) => {
  persist.save({ currentUser: state.currentUser, role: state.role });
});
