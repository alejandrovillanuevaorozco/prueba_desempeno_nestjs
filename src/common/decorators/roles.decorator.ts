import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum.js';

export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 * 
 * I created this custom metadata decorator to declare which user roles
 * (e.g., ADMIN, TECHNICIAN) are permitted to invoke a given controller endpoint.
 * The RolesGuard subsequently reads this metadata via the Reflector API.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

