import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { AuthService } from '../auth.service.js';

/**
 * GithubStrategy
 * 
 * In this Passport strategy, I configure the OAuth 2.0 integration with GitHub.
 * 
 * Architectural Responsibilities:
 * 1. I retrieve client credentials and callback URLs from environment variables via ConfigService.
 * 2. I declare the 'user:email' scope so GitHub provides verified email addresses.
 * 3. In the validate callback, I extract the user's primary email, handle fallback for private
 *    GitHub accounts, and delegate user resolution/provisioning to AuthService.
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      // 1. I load the GitHub application Client ID
      clientID: configService.get<string>('GITHUB_CLIENT_ID', 'dummy-github-client-id'),
      // 2. I load the GitHub application Client Secret
      clientSecret: configService.get<string>(
        'GITHUB_CLIENT_SECRET',
        'dummy-github-client-secret',
      ),
      // 3. I configure the redirect URI where GitHub sends authorization codes
      callbackURL: configService.get<string>(
        'GITHUB_CALLBACK_URL',
        'http://localhost:3000/auth/github/callback',
      ),
      // 4. I request permissions to read the user's verified email
      scope: ['user:email'],
    });
  }

  /**
   * I receive the verified OAuth profile from GitHub after the user authorizes access.
   * I extract their primary email and integrate them into FleetCore with a valid signed JWT.
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    // 1. I extract the primary email from the GitHub profile, or construct a fallback for private profiles
    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : `${profile.username}@users.noreply.github.com`;
    const name = profile.displayName || profile.username || 'GitHub User';

    // 2. I delegate Find-or-Create user resolution to my AuthService
    return this.authService.validateOAuthUser(email, name);
  }
}
