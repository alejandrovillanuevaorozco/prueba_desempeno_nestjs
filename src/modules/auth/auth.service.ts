import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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
}

