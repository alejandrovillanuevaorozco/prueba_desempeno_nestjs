import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GithubAuthGuard
 * 
 * In this guard, I trigger Passport's GitHub OAuth 2.0 flow.
 * It initiates the redirect to GitHub's authorization page and guards the
 * OAuth callback endpoint to exchange authorization codes for profile data.
 */
@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {}
