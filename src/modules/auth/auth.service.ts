import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum.js';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

/**
 * AuthService
 * 
 * In this service, I encapsulate core identity and authentication workflows:
 * secure user onboarding with bcrypt password hashing, credential validation,
 * account status verification, and signed JWT issuance.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * I register a new platform user with a secure bcrypt password hash.
   * I restrict roles to valid domain permissions (ADMIN, TECHNICIAN).
   */
  async register(registerDto: RegisterDto) {
    // 1. I verify that the email is not already registered in the system
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException(
        `User with email '${registerDto.email}' is already registered`,
      );
    }

    // 2. I hash the raw password using bcrypt with a salt factor of 10 rounds
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 3. I delegate user creation to the UsersService
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      role: registerDto.role,
    });

    // 4. I return the sanitized user profile, omitting the password hash
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /**
   * I authenticate user credentials and issue a signed JSON Web Token (JWT).
   */
  async login(loginDto: LoginDto) {
    // 1. I query the user by email including the password hash (which has select: false by default)
    const user = await this.usersService.findByEmail(loginDto.email, true);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials: User not found');
    }

    // 2. I ensure that deactivated accounts cannot log in
    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    // 3. I securely verify the supplied password against the stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials: Incorrect password');
    }

    // 4. I prepare the JWT payload with subject ID, email, and security role
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // 5. I generate a cryptographically signed token
    const accessToken = this.jwtService.sign(payload);

    // 6. I return the signed token along with essential user identity details
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mechanicId: user.mechanic?.id,
      },
    };
  }

  /**
   * I handle OAuth 2.0 user integration following the Find-or-Register design pattern.
   * 
   * Architectural Flow:
   * 1. I query the database to determine if a user with the OAuth email already exists.
   * 2. If the user does not exist, I automatically provision a new account in PostgreSQL,
   *    assigning a secure bcrypt-hashed random password and the default TECHNICIAN role.
   * 3. I ensure the account is active; if an administrator deactivated it, I abort with 401.
   * 4. I assemble the JWT claims payload with the user's primary key, email, and role.
   * 5. I sign and deliver an official FleetCore JWT access token identical to standard login.
   */
  async validateOAuthUser(email: string, name?: string) {
    // 1. I check whether the user already exists in our database
    let user = await this.usersService.findByEmail(email);

    // 2. If not found, I auto-provision their account with a secure temporary password and TECHNICIAN role
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10) + '!A1b';
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await this.usersService.create({
        email,
        password: hashedPassword,
        role: Role.TECHNICIAN,
      });
    }

    // 3. I verify that the account has not been deactivated by an administrator
    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    // 4. I prepare the JWT payload with subject ID, verified email, and assigned role
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // 5. I cryptographically sign the JWT access token using our secret key
    const accessToken = this.jwtService.sign(payload);

    // 6. I return the signed token and the sanitized user session profile
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mechanicId: user.mechanic?.id,
      },
    };
  }
}

