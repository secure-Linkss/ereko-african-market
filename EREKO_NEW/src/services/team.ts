import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type StaffRole = "owner" | "admin" | "fulfillment" | "support" | "marketing" | "viewer";
export type TeamMemberStatus = "active" | "invited" | "suspended";

export interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  teamRole: StaffRole;
  status: TeamMemberStatus;
  lastLoginAt?: string;
  createdAt: string;
  inviteToken?: string;
}

export interface InviteTeamMemberRequest {
  email: string;
  teamRole: StaffRole;
  firstName?: string;
  lastName?: string;
}

export interface UpdateTeamMemberRequest {
  teamRole?: StaffRole;
  firstName?: string;
  lastName?: string;
}

export function useAdminTeamMembers() {
  return useQuery({
    queryKey: ["admin", "team"],
    queryFn: async () => {
      const res = await apiClient.get<{ members: TeamMember[] }>("/api/v1/admin/team");
      // Backend may return array or {members:[]}
      const data = res.data as any;
      return Array.isArray(data) ? data : (data.members ?? data);
    },
  });
}

export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: InviteTeamMemberRequest) => {
      const res = await apiClient.post("/api/v1/admin/team/invite", dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "team"] }),
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ...dto }: UpdateTeamMemberRequest & { memberId: string }) => {
      const res = await apiClient.patch(`/api/v1/admin/team/${memberId}`, dto);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "team"] }),
  });
}

export function useSuspendTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiClient.post(`/api/v1/admin/team/${memberId}/suspend`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "team"] }),
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiClient.delete(`/api/v1/admin/team/${memberId}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "team"] }),
  });
}
