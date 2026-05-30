import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  createdAt: string;
  _type: "customer" | "staff";
  loyaltyTier?: string;
  loyaltyPoints?: number;
  totalOrders?: number;
}

export interface AdminUserDetail extends AdminUser {
  orders: { id: string; orderNumber: string; status: string; totalMinor: number; placedAt: string }[];
  addresses: any[];
  loyalty: { pointsBalance: number; tier: string };
}

export interface AdminUsersResponse {
  users: AdminUser[];
  nextCursor: string | null;
}

export function useAdminUsers(opts?: { limit?: number; q?: string; role?: string }) {
  return useQuery({
    queryKey: ["admin", "users", opts],
    queryFn: async () => {
      const res = await apiClient.get<AdminUsersResponse>("/api/v1/admin/users", {
        params: { limit: opts?.limit ?? 30, q: opts?.q || undefined, role: opts?.role || undefined },
      });
      return res.data;
    },
  });
}

export function useAdminUserDetail(userId: string, enabled = false) {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: async () => {
      const res = await apiClient.get<AdminUserDetail>(`/api/v1/admin/users/${userId}`);
      return res.data;
    },
    enabled: enabled && !!userId,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isActive, reason }: { userId: string; isActive: boolean; reason?: string }) => {
      const res = await apiClient.patch(`/api/v1/admin/users/${userId}/status`, { isActive, reason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminAuditLog(staffId?: string, enabled = false) {
  return useQuery({
    queryKey: ["admin", "audit-log", staffId],
    queryFn: async () => {
      const res = await apiClient.get<{ entries: any[] }>("/api/v1/admin/audit-log", {
        params: { staffId: staffId || undefined, limit: 50 },
      });
      return res.data.entries;
    },
    enabled,
  });
}
