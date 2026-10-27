import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

/**
 * AuthController
 * 
 * In this controller, I expose the REST endpoints for user registration,
 * credential authentication, and session profile inspection.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * I register a new platform user with validated email, bcrypt-hashed password,
   * and designated role (ADMIN or TECHNICIAN).
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user (ADMIN, TECHNICIAN)' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully with bcrypt hashed password',
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * I authenticate user credentials and return a signed JWT access token.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and obtain JWT token' })
  @ApiResponse({
    status: 200,
    description: 'User authenticated; returns accessToken and profile summary',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * I retrieve the authenticated user profile from the verified JWT session context.
   */
  @Get('profile')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile details of current user' })
  @ApiResponse({ status: 401, description: 'Missing or expired JWT' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}

