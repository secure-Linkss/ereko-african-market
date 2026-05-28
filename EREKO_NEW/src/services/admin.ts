import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/lib/api/client";
import { Order, OrderStatus } from "@/types";

// --- Request/Response Interfaces ---
export interface AdminDashboardMetrics {
  todayOrdersCount: number;
  todayRevenueMinor: number;
  lowStockItemsCount: number;
  pendingRefundsCount: number;
  activeDisputesCount: number;
  webhookFailuresCount: number;
  unreadContactsCount: number;
}

export interface AdminOrdersRequest {
  status?: string;
  limit?: number;
  cursor?: string;
  searchQuery?: string;
}

export interface AdminOrdersResponse {
  orders: Order[];
  nextCursor: string | null;
}

export interface UpdateOrderStatusRequest {
  orderId: string;
  status: OrderStatus;
  notes?: string;
  carrierName?: string;
  trackingNumber?: string;
  privilegedOverrideReason?: string; // required if packed/shipped already
}

export interface AdminInventoryItem {
  id: string;
  sku: string;
  title: string;
  variantName: string;
  warehouseName: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  damaged: number;
  safetyStock: number;
}

export interface UpdateStockRequest {
  warehouseId: string;
  variantId: string;
  adjustmentQty: number; // positive or negative
  reasonCode: "receipt" | "sale" | "return" | "transfer_in" | "transfer_out" | "adjustment";
  notes?: string;
}

export interface AdminRmaItem {
  id: string;
  orderNumber: string;
  customerEmail: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reasonCode: string;
  refundAmountMinor: number;
  createdAt: string;
}

export interface ApproveRefundRequest {
  rmaId: string;
  action: "approve" | "reject";
  reason?: string;
  customRefundAmountMinor?: number;
}

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  isRead: boolean;
  createdAt: string;
}

// --- Service Implementation ---
export const adminService = {
  getMetrics: async (): Promise<AdminDashboardMetrics> => {
    const response = await apiClient.get<AdminDashboardMetrics>(
      API_ENDPOINTS.ADMIN.DASHBOARD
    );
    return response.data;
  },

  getOrders: async (params: AdminOrdersRequest): Promise<AdminOrdersResponse> => {
    const response = await apiClient.get<AdminOrdersResponse>(
      API_ENDPOINTS.ADMIN.ORDERS,
      {
        params: {
          status: params.status,
          limit: params.limit || 20,
          cursor: params.cursor,
          q: params.searchQuery,
        },
      }
    );
    return response.data;
  },

  updateOrderStatus: async (payload: UpdateOrderStatusRequest): Promise<Order> => {
    const response = await apiClient.patch<Order>(
      `${API_ENDPOINTS.ADMIN.ORDERS}/${payload.orderId}/status`,
      payload
    );
    return response.data;
  },

  getInventory: async (limit: number = 20, cursor?: string): Promise<{ items: AdminInventoryItem[]; nextCursor: string | null }> => {
    const response = await apiClient.get<{ items: AdminInventoryItem[]; nextCursor: string | null }>(
      API_ENDPOINTS.ADMIN.INVENTORY,
      { params: { limit, cursor } }
    );
    return response.data;
  },

  updateStock: async (payload: UpdateStockRequest): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.ADMIN.INVENTORY, payload);
  },

  getReturns: async (): Promise<AdminRmaItem[]> => {
    const response = await apiClient.get<AdminRmaItem[]>(
      API_ENDPOINTS.ADMIN.RETURNS
    );
    return response.data;
  },

  approveRefund: async (payload: ApproveRefundRequest): Promise<void> => {
    await apiClient.post(
      `${API_ENDPOINTS.ADMIN.RETURNS}/${payload.rmaId}/resolve`,
      payload
    );
  },

  getContacts: async (limit = 50): Promise<AdminContactMessage[]> => {
    const response = await apiClient.get<AdminContactMessage[]>('/api/v1/contact/admin', { params: { limit } });
    return response.data;
  },

  markContactRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/api/v1/contact/admin/${id}/read`);
  },
};

// --- TanStack Query Hooks ---

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: adminService.getMetrics,
    staleTime: 1000 * 60 * 1, // Metrics refresh every minute
  });
}

export function useAdminOrders(params: AdminOrdersRequest) {
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: () => adminService.getOrders(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminService.updateOrderStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", data.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
  });
}

export function useAdminInventory(limit: number = 20, cursor?: string) {
  return useQuery({
    queryKey: ["admin-inventory", { limit, cursor }],
    queryFn: () => adminService.getInventory(limit, cursor),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminService.updateStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
  });
}

export function useAdminReturns() {
  return useQuery({
    queryKey: ["admin-returns"],
    queryFn: adminService.getReturns,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAdminContacts(limit = 50) {
  return useQuery({
    queryKey: ['admin-contacts', limit],
    queryFn: () => adminService.getContacts(limit),
    staleTime: 1000 * 30,
  });
}

export function useMarkContactRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.markContactRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });
}

export function useResolveRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminService.approveRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
  });
}
