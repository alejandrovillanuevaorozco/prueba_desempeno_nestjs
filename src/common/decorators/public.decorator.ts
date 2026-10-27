import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public Decorator
 * 
 * I created this decorator to explicitly mark routes that should bypass
 * the global JwtAuthGuard (e.g. /auth/login, /auth/register, /external/*).
 * The JwtAuthGuard inspects this metadata flag and allows unauthenticated
 * or custom-guarded traffic through without requiring a Bearer JWT.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

