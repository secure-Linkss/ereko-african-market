import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS, clearIdempotencyKey } from "@/lib/api/client";
import { Cart, DeliverySlot, Order } from "@/types";

// --- Request/Response Interfaces ---
export interface StartCheckoutRequest {
  postcode: string;
  cartId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface StartCheckoutResponse {
  orderId: string;
  orderNumber: string;
  cart: Cart;
  stockReservedUntil: string; // ISO Timestamp (15 minute hold)
  availableDeliverySlots: DeliverySlot[];
}

export interface PaymentIntentRequest {
  orderId: string;
  paymentMethod: "card" | "apple_pay" | "google_pay" | "klarna" | "clearpay";
}

export interface PaymentIntentResponse {
  clientSecret: string; // Stripe PaymentElement Client Secret
  publishableKey: string;
  amountMinor: number;
}

export interface ConfirmCheckoutRequest {
  orderId: string;
  paymentIntentId: string;
  billingAddressSameAsShipping: boolean;
  shippingAddress: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    countryCode: string;
    phone: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    countryCode: string;
    phone: string;
  };
  deliverySlot?: DeliverySlot;
  deliveryMethod: string;
}

export interface ConfirmCheckoutResponse {
  order: Order;
  success: boolean;
}

// --- Service Implementation ---
export const checkoutService = {
  startCheckout: async (payload: StartCheckoutRequest): Promise<StartCheckoutResponse> => {
    const response = await apiClient.post<StartCheckoutResponse>(
      API_ENDPOINTS.CHECKOUT.START,
      payload
    );
    return response.data;
  },

  createPaymentIntent: async (payload: PaymentIntentRequest): Promise<PaymentIntentResponse> => {
    const response = await apiClient.post<PaymentIntentResponse>(
      API_ENDPOINTS.CHECKOUT.PAYMENT_INTENT,
      payload
    );
    return response.data;
  },

  confirmCheckout: async (payload: ConfirmCheckoutRequest): Promise<ConfirmCheckoutResponse> => {
    const url = API_ENDPOINTS.CHECKOUT.CONFIRM;
    try {
      const response = await apiClient.post<ConfirmCheckoutResponse>(url, payload);
      // Clean up idempotency keys on checkout success
      clearIdempotencyKey(url);
      return response.data;
    } catch (error) {
      // Keep key on network/system fail for secure retries, clear on bad request validation errors
      if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
        clearIdempotencyKey(url);
      }
      throw error;
    }
  },

  getDeliverySlots: async (postcode: string): Promise<DeliverySlot[]> => {
    const response = await apiClient.get<DeliverySlot[]>(
      API_ENDPOINTS.CHECKOUT.SLOTS,
      { params: { postcode } }
    );
    return response.data;
  },
};

// Import axios statically to do axios.isAxiosError checks
import axios from "axios";

// --- TanStack Query Hooks ---

export function useStartCheckout() {
  return useMutation({
    mutationFn: checkoutService.startCheckout,
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: checkoutService.createPaymentIntent,
  });
}

export function useConfirmCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkoutService.confirmCheckout,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDeliverySlots(postcode: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ["delivery-slots", postcode],
    queryFn: () => checkoutService.getDeliverySlots(postcode),
    enabled: enabled && postcode.length >= 3, // Requires valid postcode segment
    staleTime: 1000 * 60 * 15, // Delivery slot pricing caching stable for 15 mins
  });
}
