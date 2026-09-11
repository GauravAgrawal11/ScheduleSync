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

const TOKEN_KEY = 'schedulesync_token';
const USER_KEY = 'schedulesync_user';

// Restore auth state from localStorage so refreshing PWA does not kick user to login page
const getInitialAuth = (): { user: User | null; token: string | null; isAuthenticated: boolean } => {
  if (typeof window === 'undefined') {
    return { user: null, token: null, isAuthenticated: false };
  }
  try {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
    const userStr = localStorage.getItem(USER_KEY);
    if (token && userStr) {
      const user = JSON.parse(userStr);
      if (user && user.role) {
        return { user, token, isAuthenticated: true };
      }
    }
  } catch (e) {
    console.error('Failed to restore auth from localStorage', e);
  }
  return { user: null, token: null, isAuthenticated: false };
};

const initialAuth = getInitialAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  isAuthenticated: initialAuth.isAuthenticated,
  setAuth: (user, token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('token', token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save auth to localStorage', e);
    }
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to remove auth from localStorage', e);
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
