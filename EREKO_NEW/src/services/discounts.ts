import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type DiscountBadge = "SALE" | "HOT_DEAL" | "LIMITED" | "CLEARANCE" | "NEW_PRICE" | "SPECIAL";

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrderValueMinor: number;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  isActive: boolean;
  customerId: string | null;
  customerEmail: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountCodeRequest {
  code: string;
  type: DiscountType;
  value: number;
  minOrderValueMinor?: number;
  maxUses?: number;
  expiresAt?: string;
  customerEmail?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDiscountCodeRequest {
  isActive?: boolean;
  maxUses?: number;
  expiresAt?: string;
  description?: string;
  customerEmail?: string;
}

export interface ValidateDiscountRequest {
  code: string;
  cartTotalMinor: number;
  email?: string;
}

export interface ValidateDiscountResponse {
  valid: boolean;
  code: string;
  type: DiscountType;
  value: number;
  discountAmountMinor: number;
  finalTotalMinor: number;
  message: string;
  codeId: string;
}

export interface SetProductDiscountRequest {
  discountEnabled: boolean;
  discountPercent?: number;
  discountBadge?: DiscountBadge;
}

export interface DiscountUsage {
  id: string;
  codeId: string;
  userId: string | null;
  email: string | null;
  orderId: string;
  usedAt: string;
}

// ─── Admin Hooks ──────────────────────────────────────────────────────────────

export function useAdminDiscountCodes(includeInactive = true) {
  return useQuery({
    queryKey: ["admin", "discounts", includeInactive],
    queryFn: async () => {
      const res = await apiClient.get<DiscountCode[]>(
        `${API_ENDPOINTS.DISCOUNTS.LIST}?all=${includeInactive}`
      );
      return res.data;
    },
  });
}

export function useCreateDiscountCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateDiscountCodeRequest) => {
      const res = await apiClient.post<DiscountCode>(API_ENDPOINTS.DISCOUNTS.CREATE, dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "discounts"] }),
  });
}

export function useUpdateDiscountCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateDiscountCodeRequest & { id: string }) => {
      const res = await apiClient.patch<DiscountCode>(API_ENDPOINTS.DISCOUNTS.UPDATE(id), dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "discounts"] }),
  });
}

export function useDeleteDiscountCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(API_ENDPOINTS.DISCOUNTS.DELETE(id));
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "discounts"] }),
  });
}

export function useDiscountCodeUsages(codeId: string, enabled = false) {
  return useQuery({
    queryKey: ["admin", "discount-usages", codeId],
    queryFn: async () => {
      const res = await apiClient.get<DiscountUsage[]>(API_ENDPOINTS.DISCOUNTS.USAGES(codeId));
      return res.data;
    },
    enabled,
  });
}

export function useSetProductDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, ...dto }: SetProductDiscountRequest & { productId: string }) => {
      const res = await apiClient.patch(API_ENDPOINTS.DISCOUNTS.PRODUCT(productId), dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Public: Validate code ────────────────────────────────────────────────────

export function useValidateDiscount() {
  return useMutation({
    mutationFn: async (dto: ValidateDiscountRequest) => {
      const res = await apiClient.post<ValidateDiscountResponse>(
        API_ENDPOINTS.DISCOUNTS.VALIDATE,
        dto
      );
      return res.data;
    },
  });
}
