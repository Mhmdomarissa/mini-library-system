import { api } from '@/lib/api';
import type { User, UserRole, PaginatedResponse } from '@/types';

export interface AdminUserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

function buildQS(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const userService = {
  getAll: (query: AdminUserQuery = {}): Promise<PaginatedResponse<User>> => {
    const { page = 1, limit = 20, ...filters } = query;
    return api.get(`/api/admin/users${buildQS({ page, limit, ...filters })}`);
  },

  updateRole: (id: string, role: UserRole): Promise<{ user: User }> =>
    api.patch(`/api/admin/users/${id}/role`, { role }),

  toggleActive: (id: string, isActive: boolean): Promise<{ user: User }> =>
    api.patch(`/api/admin/users/${id}/status`, { isActive }),
};
