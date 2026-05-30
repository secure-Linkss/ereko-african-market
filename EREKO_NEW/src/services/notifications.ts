import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  readAt: string | null;
  isRead: boolean; // computed: readAt !== null
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export function useNotifications(opts?: { limit?: number; unreadOnly?: boolean; enabled?: boolean }) {
  return useQuery({
    queryKey: ['notifications', opts],
    queryFn: async () => {
      const res = await apiClient.get<NotificationsResponse>('/api/v1/notifications', {
        params: { limit: opts?.limit ?? 30, unreadOnly: opts?.unreadOnly ? 'true' : undefined },
      });
      return res.data;
    },
    enabled: opts?.enabled !== false,
    refetchInterval: 60_000, // poll every 60s for new notifications
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.patch('/api/v1/notifications/read-all');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
