export type UserRole = 'customer' | 'master';

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  role: UserRole;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface MasterInfo extends UserInfo {
  role: 'master';
  skills: string[];
  rating: number;
  orderCount: number;
  yearsOfExperience: number;
  priceRange: {
    min: number;
    max: number;
  };
  description: string;
  certificates: string[];
  isOnline: boolean;
}
