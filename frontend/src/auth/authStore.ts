import { create } from 'zustand';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'supervisor' | 'planner' | 'admin';
  discipline?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

// IN-MEMORY TOKEN STORAGE (NEVER localStorage per hackathon specification)
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
