import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

/**
 * UsersService Unit Test Suite
 * 
 * In this test suite, I test user persistence and identity lookup workflows:
 * 1. Normalized case-insensitive email queries.
 * 2. Password hash field isolation (excluded by default, included only when requested).
 * 3. User creation and relationship resolution.
 */
describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto: any) => dto),
      save: jest.fn(async (user: any) => ({ id: 'u-1', ...user })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail()', () => {
    it('should query user by lowercase email without password by default', async () => {
      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'u-1', email: 'test@example.com' }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findByEmail('TEST@example.com');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(user.email) = LOWER(:email)',
        { email: 'TEST@example.com' },
      );
      expect(mockQueryBuilder.addSelect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should include password field when includePassword is true', async () => {
      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'u-1',
          email: 'test@example.com',
          password: 'hashed-password',
        }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findByEmail('test@example.com', true);

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.password');
      expect(result?.password).toBe('hashed-password');
    });
  });

  describe('findById()', () => {
    it('should return user when found by primary key ID', async () => {
      const mockUser = { id: 'u-1', email: 'admin@fleetcore.com', role: Role.ADMIN };
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('u-1');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        relations: { mechanic: true },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create()', () => {
    it('should normalize email to lowercase and trim spaces before saving', async () => {
      const result = await service.create({
        email: '  NEWUSER@FleetCore.COM  ',
        role: Role.TECHNICIAN,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@fleetcore.com',
          role: Role.TECHNICIAN,
        }),
      );
      expect(result.id).toBe('u-1');
      expect(result.email).toBe('newuser@fleetcore.com');
    });
  });

  describe('findAll()', () => {
    it('should return an array of users with mechanic relations', async () => {
      mockRepository.find.mockResolvedValue([
        { id: 'u-1', email: 'u1@fleetcore.com' },
        { id: 'u-2', email: 'u2@fleetcore.com' },
      ]);

      const users = await service.findAll();

      expect(users).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: { mechanic: true },
      });
    });
  });
});
