import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Status } from '../../common/enums/status.enum.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicsService } from './mechanics.service.js';

describe('MechanicsService', () => {
  let service: MechanicsService;
  let mockMechanicRepo: any;

  beforeEach(async () => {
    mockMechanicRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'm-1', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MechanicsService,
        {
          provide: getRepositoryToken(Mechanic),
          useValue: mockMechanicRepo,
        },
      ],
    }).compile();

    service = module.get<MechanicsService>(MechanicsService);
  });

  it('should create a mechanic successfully', async () => {
    mockMechanicRepo.findOne.mockResolvedValue(null);

    const result = await service.create({
      name: 'Carlos Pérez',
      email: 'carlos@fleetcore.com',
      specialty: 'Diesel',
    });

    expect(result.name).toBe('Carlos Pérez');
    expect(result.status).toBe(Status.ACTIVE);
  });

  it('should throw ConflictException if mechanic email already exists', async () => {
    mockMechanicRepo.findOne.mockResolvedValue({ id: 'existing', email: 'carlos@fleetcore.com' });

    await expect(
      service.create({
        name: 'Carlos Pérez',
        email: 'carlos@fleetcore.com',
        specialty: 'Diesel',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should inactivate a mechanic without deleting historical records', async () => {
    const mechanic = { id: 'm-1', name: 'Carlos', status: Status.ACTIVE };
    mockMechanicRepo.findOne.mockResolvedValue(mechanic);

    const result = await service.inactivate('m-1');

    expect(result.status).toBe(Status.INACTIVE);
  });
});
