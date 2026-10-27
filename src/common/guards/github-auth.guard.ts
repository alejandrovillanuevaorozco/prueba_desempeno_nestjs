import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GithubAuthGuard
 * 
 * In this guard, I trigger Passport's GitHub OAuth 2.0 flow.
 * 
 * Execution Lifecycle:
 * 1. When invoked on GET /auth/github, I redirect the client to GitHub's authorization page.
 * 2. When invoked on GET /auth/github/callback, I intercept the returned authorization code,
 *    delegate token exchange to GithubStrategy, and attach the resolved user session to request.user.
 */
@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {}

