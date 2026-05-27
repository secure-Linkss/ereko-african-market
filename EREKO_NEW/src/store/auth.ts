import { create } from "zustand";
import { UserProfile } from "@/types";

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMfaPending: boolean;
  setSession: (accessToken: string, user: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  setMfaPending: (pending: boolean) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: typeof window !== "undefined" ? localStorage.getItem("accessToken") : null,
  isAuthenticated: false,
  isLoading: true,
  isMfaPending: false,

  setSession: (accessToken, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
    }
    set({ accessToken, user, isAuthenticated: true, isMfaPending: false, isLoading: false });
  },

  setUser: (user) => set({ user, isAuthenticated: true }),

  setMfaPending: (pending) => set({ isMfaPending: pending, isLoading: false }),

  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    set({ user: null, accessToken: null, isAuthenticated: false, isMfaPending: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));

// Listen to interceptor events to clear authentication if refresh token fails
if (typeof window !== "undefined") {
  window.addEventListener("auth-logout", () => {
    useAuthStore.getState().clearSession();
  });
}
