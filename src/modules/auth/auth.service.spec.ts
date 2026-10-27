import { jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn(() => 'mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register()', () => {
    it('should register a new user successfully with bcrypt hashed password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockImplementation(async (data: any) => ({
        id: 'u-1',
        email: data.email,
        role: data.role,
        isActive: true,
        createdAt: new Date(),
      }));

      const result = await service.register({
        email: 'admin@fleetcore.com',
        password: 'Password123!',
        role: Role.ADMIN,
      });

      expect(result.email).toBe('admin@fleetcore.com');
      expect(result.role).toBe(Role.ADMIN);
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'admin@fleetcore.com',
          password: 'Password123!',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login()', () => {
    it('should authenticate user and return access_token when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'admin@fleetcore.com',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
      });

      const result = await service.login({
        email: 'admin@fleetcore.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('admin@fleetcore.com');
      expect(result.user.role).toBe(Role.ADMIN);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPass', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'admin@fleetcore.com',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'admin@fleetcore.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user account is deactivated', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'admin@fleetcore.com',
        role: Role.ADMIN,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'admin@fleetcore.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateOAuthUser() — OAuth 2.0 Integration', () => {
    it('should authenticate existing OAuth user and issue valid JWT token', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u-oauth-1',
        email: 'dev@github.com',
        role: Role.TECHNICIAN,
        isActive: true,
      });

      const result = await service.validateOAuthUser('dev@github.com', 'Dev Coder');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('dev@github.com');
      expect(result.user.role).toBe(Role.TECHNICIAN);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should automatically provision a new user if not found during OAuth login', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockImplementation(async (data: any) => ({
        id: 'u-oauth-new',
        email: data.email,
        role: data.role,
        isActive: true,
      }));

      const result = await service.validateOAuthUser('newdev@github.com', 'New Dev');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('newdev@github.com');
      expect(result.user.role).toBe(Role.TECHNICIAN);
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if OAuth user is deactivated', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u-oauth-inactive',
        email: 'blocked@github.com',
        role: Role.TECHNICIAN,
        isActive: false,
      });

      await expect(
        service.validateOAuthUser('blocked@github.com'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
