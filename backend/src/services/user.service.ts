import type { UserRole } from '../models/User';
import { userRepository, type UserFilters } from '../repositories/user.repository';
import type { PaginationParams } from '../utils/pagination';
import { AppError } from '../utils/AppError';

export const userService = {
  async list(filters: UserFilters, pagination: PaginationParams) {
    return userRepository.list(filters, pagination);
  },

  async updateRole(id: string, role: UserRole, requesterId: string) {
    // Prevent admin from changing their own role (could lock themselves out)
    if (id === requesterId) {
      throw new AppError('Cannot change your own role', 400);
    }

    const user = await userRepository.findById(id);
    if (!user) throw new AppError('User not found', 404);

    const updated = await userRepository.updateRole(id, role);
    return updated;
  },

  async toggleActive(id: string, isActive: boolean, requesterId: string) {
    if (id === requesterId) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    const user = await userRepository.findById(id);
    if (!user) throw new AppError('User not found', 404);

    const updated = await userRepository.toggleActive(id, isActive);
    return updated;
  },
};
