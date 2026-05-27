import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth";
import { UserProfile } from "@/types";

// --- Request/Response Interfaces ---
export interface LoginRequest {
  email: string;
  password?: string;
  magicLink?: boolean;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: UserProfile;
  mfaRequired?: boolean;
  mfaToken?: string; // temporary token to verify MFA
}

export interface SignupRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface MfaVerifyRequest {
  mfaToken: string;
  code: string;
}

export interface MfaVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface ResetPasswordRequest {
  email: string;
}

// --- Service Implementation ---
export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      payload
    );
    return response.data;
  },

  signup: async (payload: SignupRequest): Promise<UserProfile> => {
    const response = await apiClient.post<UserProfile>(
      API_ENDPOINTS.AUTH.SIGNUP,
      payload
    );
    return response.data;
  },

  verifyMfa: async (payload: MfaVerifyRequest): Promise<MfaVerifyResponse> => {
    const response = await apiClient.post<MfaVerifyResponse>(
      API_ENDPOINTS.AUTH.MFA_VERIFY,
      payload
    );
    return response.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },

  resetPassword: async (password: string, token: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { password, token });
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>(API_ENDPOINTS.PROFILE.ME);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },
};

// --- TanStack Query React Hooks ---

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const setMfaPending = useAuthStore((state) => state.setMfaPending);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      if (data.mfaRequired) {
        setMfaPending(true);
      } else if (data.accessToken && data.user) {
        setSession(data.accessToken, data.user);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: authService.signup,
  });
}

export function useMfaVerify() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.verifyMfa,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authService.forgotPassword,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ password, token }: { password: string; token: string }) =>
      authService.resetPassword(password, token),
  });
}

export function useProfile(enabled: boolean = true) {
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["profile"],
    queryFn: authService.getProfile,
    enabled: enabled && isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 10, // Profile cache stable for 10 mins
  });
}

export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearSession();
      queryClient.clear(); // Clear all cached user queries
    },
  });
}
