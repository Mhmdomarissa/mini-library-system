import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, type AdminUserQuery } from '../userService';
import type { UserRole } from '@/types';

export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: (query: AdminUserQuery) => [...adminUserKeys.all, 'list', query] as const,
};

export function useAdminUsers(query: AdminUserQuery = {}) {
  return useQuery({
    queryKey: adminUserKeys.list(query),
    queryFn: () => userService.getAll(query),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      userService.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      userService.toggleActive(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}
