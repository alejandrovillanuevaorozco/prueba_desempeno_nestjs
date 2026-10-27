import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { AuthService } from '../auth.service.js';

/**
 * GithubStrategy
 * 
 * In this Passport strategy, I configure the OAuth 2.0 integration with GitHub.
 * I extract credentials from environment variables, configure the callback URL,
 * request the 'user:email' OAuth scope, and map authenticated GitHub profiles
 * into our FleetCore database session tokens.
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID', 'dummy-github-client-id'),
      clientSecret: configService.get<string>(
        'GITHUB_CLIENT_SECRET',
        'dummy-github-client-secret',
      ),
      callbackURL: configService.get<string>(
        'GITHUB_CALLBACK_URL',
        'http://localhost:3000/auth/github/callback',
      ),
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
    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : `${profile.username}@users.noreply.github.com`;
    const name = profile.displayName || profile.username || 'GitHub User';

    return this.authService.validateOAuthUser(email, name);
  }
}
