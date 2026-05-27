import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/lib/api/client";
import { Order } from "@/types";

// --- Request/Response Interfaces ---
export interface ReturnRequest {
  orderId: string;
  items: {
    orderItemId: string;
    quantity: number;
    reasonCode: "damaged" | "wrong_item" | "quality_issue" | "missing_item" | "changed_mind";
    customerNote?: string;
  }[];
  photoEvidenceUrls?: string[];
  refundType: "original_card" | "store_credit" | "loyalty_points";
}

export interface ReturnResponse {
  rmaNumber: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  refundAmountMinor: number;
}

// --- Service Implementation ---
export const orderService = {
  getOrders: async (limit: number = 20, cursor?: string): Promise<{ orders: Order[]; nextCursor: string | null }> => {
    const response = await apiClient.get<{ orders: Order[]; nextCursor: string | null }>(
      API_ENDPOINTS.ORDERS.LIST,
      { params: { limit, cursor } }
    );
    return response.data;
  },

  getOrderDetails: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(
      API_ENDPOINTS.ORDERS.DETAILS(id)
    );
    return response.data;
  },

  initiateReturn: async (payload: ReturnRequest): Promise<ReturnResponse> => {
    const response = await apiClient.post<ReturnResponse>(
      API_ENDPOINTS.ORDERS.RETURNS(payload.orderId),
      payload
    );
    return response.data;
  },
};

// --- TanStack Query Hooks ---

export function useOrders(limit: number = 20, cursor?: string) {
  return useQuery({
    queryKey: ["orders", { limit, cursor }],
    queryFn: () => orderService.getOrders(limit, cursor),
    staleTime: 1000 * 60 * 2, // Orders caching stable for 2 minutes
  });
}

export function useOrderDetails(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => orderService.getOrderDetails(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInitiateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.initiateReturn,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
