import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * JwtAuthGuard
 *
 * I implemented this Guard as a global application guard (APP_GUARD).
 * By default, it protects ALL endpoints in the API requiring a valid Bearer JWT.
 * If an endpoint is decorated with @Public(), I bypass authentication.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // I check if the endpoint has been tagged as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Bypass JWT check for public endpoints (e.g. login, external API)
    }

    // Otherwise, I delegate to Passport's JWT strategy validation
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // If token is missing, expired, or signature is invalid, I throw a descriptive 401 error
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          info?.message || 'Unauthorized access: Valid JWT token is required',
        )
      );
    }
    return user;
  }
}
