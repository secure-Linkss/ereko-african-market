import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ProblemDetails } from "@/types";

// API Endpoints constants matching backend schema
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    SIGNUP: "/api/v1/auth/signup",
    REFRESH: "/api/v1/auth/refresh",
    LOGOUT: "/api/v1/auth/logout",
    RESET_PASSWORD: "/api/v1/auth/reset-password",
    FORGOT_PASSWORD: "/api/v1/auth/forgot-password",
    MFA_VERIFY: "/api/v1/auth/mfa/verify",
  },
  PROFILE: {
    ME: "/api/v1/profiles/me",
    ADDRESSES: "/api/v1/profiles/addresses",
    CARDS: "/api/v1/profiles/cards",
    LOYALTY: "/api/v1/profiles/loyalty",
  },
  PRODUCTS: {
    LIST: "/api/v1/products",
    DETAILS: (slug: string) => `/api/v1/products/${slug}`,
    CATEGORIES: "/api/v1/categories",
    SEARCH: "/api/v1/search",
  },
  CART: {
    GET: "/api/v1/cart",
    SYNC: "/api/v1/cart/sync",
    ITEMS: "/api/v1/cart/items",
    ITEM_DETAIL: (id: string) => `/api/v1/cart/items/${id}`,
    COUPON: "/api/v1/cart/coupon",
    LOYALTY_REDEEM: "/api/v1/cart/loyalty/redeem",
  },
  CHECKOUT: {
    START: "/api/v1/checkout/start",
    PAYMENT_INTENT: "/api/v1/checkout/payment-intent",
    CONFIRM: "/api/v1/checkout/confirm",
    SLOTS: "/api/v1/checkout/delivery-slots",
  },
  ORDERS: {
    LIST: "/api/v1/orders",
    DETAILS: (id: string) => `/api/v1/orders/${id}`,
    RETURNS: (id: string) => `/api/v1/orders/${id}/returns`,
  },
  RECIPES: {
    LIST: "/api/v1/recipes",
    DETAILS: (slug: string) => `/api/v1/recipes/${slug}`,
  },
  CARGO: {
    INQUIRE: "/api/v1/cargo/inquire",
    TRACK: (trackingNumber: string) => `/api/v1/cargo/track/${trackingNumber}`,
  },
  ADMIN: {
    DASHBOARD: "/api/v1/admin/dashboard",
    ORDERS: "/api/v1/admin/orders",
    INVENTORY: "/api/v1/admin/inventory",
    RETURNS: "/api/v1/admin/returns",
    PRODUCTS: "/api/v1/admin/products",
    CARGO_RATES: "/api/v1/admin/cargo-rates",
    REVIEWS: "/api/v1/admin/reviews",
  },
};

// Create Axios Instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Required for secure cookie-based refresh tokens
});

// Cache for generating unique idempotency keys for mutable checkout requests
const activeIdempotencyKeys = new Map<string, string>();

function getOrCreateIdempotencyKey(url: string): string {
  if (!activeIdempotencyKeys.has(url)) {
    const uuid = crypto.randomUUID();
    activeIdempotencyKeys.set(url, uuid);
  }
  return activeIdempotencyKeys.get(url)!;
}

export function clearIdempotencyKey(url: string) {
  activeIdempotencyKeys.delete(url);
}

// Request Interceptor: Attach JWT bearer token & Idempotency keys
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Attach JWT Authorization Header
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 2. Inject Idempotency-Key for mutating actions in Checkout or Admin
    const isMutatingAction = ["post", "put", "patch", "delete"].includes(
      config.method?.toLowerCase() || ""
    );
    const requiresIdempotency = config.url?.includes("/checkout/") || config.url?.includes("/admin/");

    if (isMutatingAction && requiresIdempotency && config.headers) {
      const key = getOrCreateIdempotencyKey(config.url || "default");
      config.headers["Idempotency-Key"] = key;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Queue to hold requests while refreshing token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | PromiseLike<string>) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Standard RFC 7807 Error Interception & Secure Token Refreshing
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 1. Handle token refreshing on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === API_ENDPOINTS.AUTH.REFRESH) {
        // Refresh token failed -> Force logout
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          window.dispatchEvent(new Event("auth-logout"));
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await apiClient.post<{ accessToken: string }>(
          API_ENDPOINTS.AUTH.REFRESH
        );
        const { accessToken } = response.data;

        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", accessToken);
        }

        apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    // 2. Parse and format standard RFC 7807 Problems
    const errorData = error.response?.data as Record<string, unknown> | undefined;
    
    // Check if error matches standard RFC 7807 format
    if (errorData && typeof errorData === "object" && "type" in errorData && "title" in errorData) {
      const problem: ProblemDetails = {
        type: String(errorData.type ?? ''),
        title: String(errorData.title ?? ''),
        status: (errorData.status as number) || error.response?.status || 500,
        detail: String(errorData.detail ?? error.message ?? "An unexpected system error occurred"),
        instance: errorData.instance as string | undefined,
        trace_id: errorData.trace_id as string | undefined,
        errors: errorData.errors as Record<string, string[]> | undefined,
      };
      
      // Attach parsed RFC 7807 problem details to the error object
      (error as AxiosError & { problem?: ProblemDetails }).problem = problem;
    } else {
      // Fallback problem detail structure
      const fallbackProblem: ProblemDetails = {
        type: "https://ereko.market/errors/unexpected-error",
        title: "Unexpected Error",
        status: error.response?.status || 500,
        detail: error.message || "An unexpected error occurred during request transmission.",
        trace_id: "client-generated",
      };
      (error as AxiosError & { problem?: ProblemDetails }).problem = fallbackProblem;
    }

    return Promise.reject(error);
  }
);
