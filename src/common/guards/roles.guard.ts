import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { Role } from '../enums/role.enum.js';

/**
 * RolesGuard
 *
 * I implemented this Guard to enforce Role-Based Access Control (RBAC).
 * It reads the required roles set by my custom @Roles() decorator using
 * NestJS Reflector, and compares them against the role in the user's JWT payload.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. I retrieve the roles required for this endpoint (at method or class level)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific roles are required, I allow access to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. I extract the authenticated user attached to the request by JwtAuthGuard
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException(
        'Access denied: You do not possess the required role permissions',
      );
    }

    // 3. I verify if the user's role is included in the allowed roles list
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required roles [${requiredRoles.join(', ')}] - User role is '${user.role}'`,
      );
    }

    return true;
  }
}
