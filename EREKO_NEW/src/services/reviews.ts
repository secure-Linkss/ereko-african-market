import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface StoreReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  source: 'site' | 'google';
  created_at: string;
}

export interface AdminReview extends StoreReview {
  author_email: string | null;
  status: 'pending' | 'approved' | 'rejected';
  moderated_at: string | null;
  moderated_by: string | null;
  updated_at: string;
}

export interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  averageRating: number;
}

export interface CreateReviewPayload {
  authorName: string;
  authorEmail?: string;
  rating: number;
  comment: string;
}

const BASE = '/api/v1/reviews';
const ADMIN_BASE = '/api/v1/admin/reviews';

export const reviewsService = {
  getApproved: async (limit = 20): Promise<StoreReview[]> => {
    const res = await apiClient.get<StoreReview[]>(BASE, { params: { limit } });
    return res.data;
  },

  getStats: async (): Promise<ReviewStats> => {
    const res = await apiClient.get<ReviewStats>(`${BASE}/stats`);
    return res.data;
  },

  create: async (payload: CreateReviewPayload): Promise<{ ok: boolean; message: string }> => {
    const res = await apiClient.post<{ ok: boolean; message: string }>(BASE, payload);
    return res.data;
  },

  adminList: async (status?: string, limit = 50): Promise<AdminReview[]> => {
    const res = await apiClient.get<AdminReview[]>(ADMIN_BASE, { params: { status, limit } });
    return res.data;
  },

  moderate: async (id: string, action: 'approve' | 'reject'): Promise<AdminReview> => {
    const res = await apiClient.patch<AdminReview>(`${ADMIN_BASE}/${id}/moderate`, { action });
    return res.data;
  },

  delete: async (id: string): Promise<{ ok: boolean }> => {
    const res = await apiClient.delete<{ ok: boolean }>(`${ADMIN_BASE}/${id}`);
    return res.data;
  },
};

export function useReviews(limit = 20) {
  return useQuery({
    queryKey: ['reviews', limit],
    queryFn: () => reviewsService.getApproved(limit),
    staleTime: 1000 * 60 * 5,
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: ['review-stats'],
    queryFn: reviewsService.getStats,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
    },
  });
}

export function useAdminReviews(status?: string, limit = 50) {
  return useQuery({
    queryKey: ['admin-reviews', status, limit],
    queryFn: () => reviewsService.adminList(status, limit),
    staleTime: 1000 * 30,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      reviewsService.moderate(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
    },
  });
}
