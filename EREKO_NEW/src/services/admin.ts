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

export interface AdminProduct {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  storageType: string;
  isPublished: boolean;
  originCountry: string;
  descriptionShort: string;
  createdAt: string;
  variants: { id: string; sku: string; name: string; priceAmountMinor: number; stockOnHand: number; stockReserved: number; isActive: boolean }[];
  images: { id: string; url: string; alt: string; position: number }[];
  categories: { category: { id: string; slug: string; name: string } }[];
}

export interface CreateProductRequest {
  title: string;
  brand?: string;
  originCountry?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  storageType?: string;
  isPublished?: boolean;
  priceAmountMinor?: number;
  stockOnHand?: number;
  categoryId?: string;
  sku?: string;
  weightGrams?: number;
}

export interface UpdateProductRequest {
  title?: string;
  brand?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  storageType?: string;
  isPublished?: boolean;
  originCountry?: string;
  priceAmountMinor?: number;
  stockOnHand?: number;
}

export interface CargoRate {
  id: number;
  mode: 'sea' | 'air';
  price_per_kg_minor: number;
  min_weight_kg: number;
  transit_days_min: number;
  transit_days_max: number;
  notes: string | null;
  updated_at: string;
}

export interface UpdateCargoRateRequest {
  pricePerKgMinor?: number;
  minWeightKg?: number;
  transitDaysMin?: number;
  transitDaysMax?: number;
  notes?: string;
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

  // Products
  getProducts: async (limit = 50, cursor?: string): Promise<{ products: AdminProduct[] }> => {
    const res = await apiClient.get<{ products: AdminProduct[] }>(API_ENDPOINTS.ADMIN.PRODUCTS, { params: { limit, cursor } });
    return res.data;
  },
  createProduct: async (body: CreateProductRequest): Promise<AdminProduct> => {
    const res = await apiClient.post<AdminProduct>(API_ENDPOINTS.ADMIN.PRODUCTS, body);
    return res.data;
  },
  updateProduct: async (productId: string, body: UpdateProductRequest): Promise<AdminProduct> => {
    const res = await apiClient.patch<AdminProduct>(`${API_ENDPOINTS.ADMIN.PRODUCTS}/${productId}`, body);
    return res.data;
  },
  deleteProduct: async (productId: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.ADMIN.PRODUCTS}/${productId}`);
  },
  uploadProductImage: async (productId: string, file: File): Promise<{ url: string; imageId: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiClient.post<{ url: string; imageId: string }>(
      `${API_ENDPOINTS.ADMIN.PRODUCTS}/${productId}/images`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  // Cargo Rates
  getCargoRates: async (): Promise<CargoRate[]> => {
    const res = await apiClient.get<CargoRate[]>(API_ENDPOINTS.ADMIN.CARGO_RATES);
    return res.data;
  },
  updateCargoRate: async (mode: string, body: UpdateCargoRateRequest): Promise<CargoRate> => {
    const res = await apiClient.patch<CargoRate>(`${API_ENDPOINTS.ADMIN.CARGO_RATES}/${mode}`, body);
    return res.data;
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

// Products
export function useAdminProducts(limit = 50) {
  return useQuery({
    queryKey: ['admin-products', limit],
    queryFn: () => adminService.getProducts(limit),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductRequest }) => adminService.updateProduct(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => adminService.uploadProductImage(productId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

// ─── Delivery Settings ─────────────────────────────────────────────────────

export interface DeliveryTier {
  id?: string;
  label?: string;
  fromKm: number;
  toKm: number;
  priceMinor: number;
  position?: number;
}

export interface DeliverySettings {
  id?: string;
  storePostcode: string;
  maxRadiusKm: number;
  pricingMode: 'tiers' | 'per_km';
  perKmPriceMinor?: number;
  baseFeePriceMinor?: number;
}

export interface UpdateDeliverySettingsRequest {
  storePostcode?: string;
  maxRadiusKm?: number;
  pricingMode?: 'tiers' | 'per_km';
  perKmPriceMinor?: number;
  baseFeePriceMinor?: number;
  tiers?: DeliveryTier[];
}

// ─── Stripe Webhook Log ────────────────────────────────────────────────────

export interface StripeWebhookLog {
  id: string;
  stripeEventId: string;
  eventType: string;
  status: 'received' | 'processed' | 'failed' | 'ignored';
  processingError?: string;
  receivedAt: string;
  processedAt?: string;
}

export interface StripeWebhookLogsResponse {
  events: StripeWebhookLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Refunds ───────────────────────────────────────────────────────────────

export interface RefundLineItem {
  orderItemId: string;
  quantity: number;
}

export interface ProcessRefundRequest {
  items?: RefundLineItem[];
  refundDelivery?: boolean;
  customAmountMinor?: number;
  reason: string;
  notes?: string;
}

export interface OrderRefund {
  id: string;
  orderId: string;
  stripeRefundId?: string;
  amountMinor: number;
  reason: string;
  notes?: string;
  processedBy: string;
  refundEmailSent: boolean;
  createdAt: string;
}

// ─── Service methods ───────────────────────────────────────────────────────

const deliveryService = {
  getSettings: () => apiClient.get('/api/v1/delivery/settings').then(r => r.data),
  updateSettings: (body: UpdateDeliverySettingsRequest) => apiClient.put('/api/v1/delivery/settings', body).then(r => r.data),
  calculateFee: (customerPostcode: string) => apiClient.post('/api/v1/delivery/calculate', { customerPostcode }).then(r => r.data),
  seedDefaults: () => apiClient.post('/api/v1/delivery/seed-defaults').then(r => r.data),
};

const webhookService = {
  list: (params?: { eventType?: string; status?: string; fromDate?: string; toDate?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/api/v1/admin/webhooks/stripe', { params }).then(r => r.data as StripeWebhookLogsResponse),
  getPayload: (logId: string) => apiClient.get(`/api/v1/admin/webhooks/stripe/${logId}`).then(r => r.data),
  retry: (logId: string) => apiClient.post(`/api/v1/admin/webhooks/stripe/${logId}/retry`).then(r => r.data),
  resolve: (logId: string) => apiClient.post(`/api/v1/admin/webhooks/stripe/${logId}/resolve`).then(r => r.data),
};

const refundService = {
  getSummary: (orderId: string) => apiClient.get(`/api/v1/admin/refunds/${orderId}/summary`).then(r => r.data),
  process: (orderId: string, body: ProcessRefundRequest) => apiClient.post(`/api/v1/admin/refunds/${orderId}/process`, body).then(r => r.data),
  getHistory: (orderId: string) => apiClient.get(`/api/v1/admin/refunds/${orderId}/history`).then(r => r.data as OrderRefund[]),
};

// Delivery Settings
export function useDeliverySettings() {
  return useQuery({ queryKey: ['delivery-settings'], queryFn: deliveryService.getSettings, staleTime: 60_000 });
}

export function useUpdateDeliverySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDeliverySettingsRequest) => deliveryService.updateSettings(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-settings'] }),
  });
}

// Stripe Webhook Logs
export function useStripeWebhookLogs(params?: Parameters<typeof webhookService.list>[0]) {
  return useQuery({
    queryKey: ['stripe-webhooks', params],
    queryFn: () => webhookService.list(params),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useStripeWebhookPayload(logId: string | null) {
  return useQuery({
    queryKey: ['stripe-webhook-payload', logId],
    queryFn: () => webhookService.getPayload(logId!),
    enabled: !!logId,
  });
}

export function useRetryStripeWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => webhookService.retry(logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stripe-webhooks'] }),
  });
}

export function useResolveStripeWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => webhookService.resolve(logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stripe-webhooks'] }),
  });
}

// Refunds
export function useRefundSummary(orderId: string | null) {
  return useQuery({
    queryKey: ['refund-summary', orderId],
    queryFn: () => refundService.getSummary(orderId!),
    enabled: !!orderId,
  });
}

export function useProcessRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: ProcessRefundRequest }) => refundService.process(orderId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
}

export function useRefundHistory(orderId: string | null) {
  return useQuery({
    queryKey: ['refund-history', orderId],
    queryFn: () => refundService.getHistory(orderId!),
    enabled: !!orderId,
  });
}

// Cargo Rates
export function useAdminCargoRates() {
  return useQuery({
    queryKey: ['admin-cargo-rates'],
    queryFn: adminService.getCargoRates,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateCargoRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, body }: { mode: string; body: UpdateCargoRateRequest }) => adminService.updateCargoRate(mode, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-cargo-rates'] }),
  });
}
