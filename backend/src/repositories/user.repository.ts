import type { QueryFilter } from 'mongoose';
import { User, type IUser, type UserRole } from '../models/User';
import type { PaginatedResult, PaginationParams } from '../utils/pagination';

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

function buildQuery(filters: UserFilters): QueryFilter<IUser> {
  const query: QueryFilter<IUser> = {};

  if (filters.search) {
    const regex = new RegExp(filters.search, 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }

  if (filters.role) query.role = filters.role;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  return query;
}

export const userRepository = {
  async list(filters: UserFilters, pagination: PaginationParams): Promise<PaginatedResult<IUser>> {
    const query = buildQuery(filters);

    const [items, totalItems] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean<IUser[]>(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalItems / pagination.limit);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      },
    };
  },

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).lean<IUser>();
  },

  async updateRole(id: string, role: UserRole): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { role }, { new: true }).lean<IUser>();
  },

  async toggleActive(id: string, isActive: boolean): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { isActive }, { new: true }).lean<IUser>();
  },
};
