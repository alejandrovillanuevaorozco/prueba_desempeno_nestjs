import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator
 * 
 * I created this custom parameter decorator to cleanly inject the authenticated
 * user payload (attached to the Express request by JwtStrategy) into controller method handlers.
 * Passing an optional property key extracts a specific property directly (e.g. @CurrentUser('id')).
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    // 1. I retrieve the request object populated by Passport's JwtStrategy
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 2. I return either the requested property or the entire user entity
    return data ? user?.[data] : user;
  },
);

