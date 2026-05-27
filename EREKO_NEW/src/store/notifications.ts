import { create } from "zustand";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  durationMs?: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  type: "order" | "promo" | "account" | "system";
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  toasts: ToastMessage[];
  notifications: SystemNotification[];
  bannerText: string | null;

  // Actions
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
  setBanner: (text: string | null) => void;
  setNotifications: (notifications: SystemNotification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  notifications: [],
  bannerText: "🌍 Earthy, Rich & Authentic African Market — Free UK Delivery on orders over £55! 🚚",

  addToast: (toast) => {
    const id = crypto.randomUUID();
    const duration = toast.durationMs || 4000;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove toast after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setBanner: (bannerText) => set({ bannerText }),

  setNotifications: (notifications) => set({ notifications }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
}));
