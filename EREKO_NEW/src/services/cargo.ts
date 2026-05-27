import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/lib/api/client";
import { CargoInquiry } from "@/types";

// --- Request/Response Interfaces ---
export interface CargoInquiryRequest {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientCountry: string; // e.g. "Nigeria", "Ghana", "Cameroon"
  weightEstKg: number;
  volumeEstCbm?: number;
  itemDescription: string;
  urgency: "standard" | "express" | "super-express";
}

export interface CargoEstimateRequest {
  weightKg: number;
  volumeCbm?: number;
  destinationCountry: string;
  urgency: "standard" | "express" | "super-express";
}

export interface CargoEstimateResponse {
  estimatedQuoteMinor: number;
  estimatedDeliveryDays: number;
}

// --- Service Implementation ---
export const cargoService = {
  createInquiry: async (payload: CargoInquiryRequest): Promise<CargoInquiry> => {
    const response = await apiClient.post<CargoInquiry>(
      API_ENDPOINTS.CARGO.INQUIRE,
      payload
    );
    return response.data;
  },

  getEstimate: async (payload: CargoEstimateRequest): Promise<CargoEstimateResponse> => {
    const response = await apiClient.post<CargoEstimateResponse>(
      "/api/v1/cargo/estimate",
      payload
    );
    return response.data;
  },

  trackConsignment: async (trackingNumber: string): Promise<CargoInquiry> => {
    const response = await apiClient.get<CargoInquiry>(
      API_ENDPOINTS.CARGO.TRACK(trackingNumber)
    );
    return response.data;
  },
};

// --- TanStack Query Hooks ---

export function useCreateCargoInquiry() {
  return useMutation({
    mutationFn: cargoService.createInquiry,
  });
}

export function useCargoEstimate() {
  return useMutation({
    mutationFn: cargoService.getEstimate,
  });
}

export function useTrackConsignment(trackingNumber: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ["cargo-tracking", trackingNumber],
    queryFn: () => cargoService.trackConsignment(trackingNumber),
    enabled: enabled && !!trackingNumber,
    retry: false,
    staleTime: 1000 * 60 * 5, // Tracking data stable for 5 minutes
  });
}
