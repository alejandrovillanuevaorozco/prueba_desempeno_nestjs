import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface.js';
import { UsersService } from '../../users/users.service.js';

/**
 * JwtStrategy
 * 
 * In this Passport strategy, I configure how JWT tokens are extracted from incoming
 * HTTP requests, cryptographically verified against our JWT secret, and resolved into
 * active user sessions.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // 1. I configure token extraction from the Bearer authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 2. I strictly enforce token expiration
      ignoreExpiration: false,
      // 3. I load the cryptographic secret from environment variables
      secretOrKey: configService.get<string>('JWT_SECRET', 'cambia-este-secreto'),
    });
  }

  /**
   * I validate the decoded token payload against the live database, ensuring
   * that users whose accounts have been deactivated cannot continue making authorized calls.
   */
  async validate(payload: JwtPayload) {
    // 1. I verify that the user still exists in the database
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or no longer exists');
    }

    // 2. I return the user identity object which NestJS attaches to request.user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      mechanicId: user.mechanic?.id,
    };
  }
}

