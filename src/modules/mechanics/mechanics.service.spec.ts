import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Status } from '../../common/enums/status.enum.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicsService } from './mechanics.service.js';

/**
 * MechanicsService Unit Test Suite
 * 
 * In this test suite, I test technician operational lifecycle rules:
 * 1. Email uniqueness validation on mechanic creation and modification.
 * 2. Logical inactivation preserving maintenance audit trails.
 * 3. Status filtering and user association lookups.
 */
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

  it('should list all mechanics with optional status filtering', async () => {
    mockMechanicRepo.find.mockResolvedValue([{ id: 'm-1', name: 'Carlos' }]);

    const result = await service.findAll(Status.ACTIVE);

    expect(result).toHaveLength(1);
    expect(mockMechanicRepo.find).toHaveBeenCalledWith({
      where: { status: Status.ACTIVE },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  });

  it('should find mechanic by id', async () => {
    const mockMechanic = { id: 'm-1', name: 'Carlos', status: Status.ACTIVE };
    mockMechanicRepo.findOne.mockResolvedValue(mockMechanic);

    const result = await service.findById('m-1');
    expect(result.id).toBe('m-1');
  });

  it('should throw NotFoundException if mechanic not found by id', async () => {
    mockMechanicRepo.findOne.mockResolvedValue(null);

    await expect(service.findById('m-404')).rejects.toThrow(NotFoundException);
  });

  it('should find mechanic by linked user id', async () => {
    mockMechanicRepo.findOne.mockResolvedValue({ id: 'm-1', userId: 'u-1' });

    const result = await service.findByUserId('u-1');
    expect(result?.userId).toBe('u-1');
  });

  it('should update mechanic details', async () => {
    const existing = { id: 'm-1', name: 'Carlos', email: 'carlos@fleetcore.com', status: Status.ACTIVE };
    mockMechanicRepo.findOne.mockResolvedValue(existing);

    const updated = await service.update('m-1', { name: 'Carlos Updated' });
    expect(mockMechanicRepo.save).toHaveBeenCalled();
  });

  it('should throw ConflictException if updating to an email already in use', async () => {
    const existing = { id: 'm-1', name: 'Carlos', email: 'carlos@fleetcore.com' };
    mockMechanicRepo.findOne
      .mockResolvedValueOnce(existing) // findById
      .mockResolvedValueOnce({ id: 'other-m', email: 'taken@fleetcore.com' }); // uniqueness check

    await expect(
      service.update('m-1', { email: 'taken@fleetcore.com' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should inactivate a mechanic without deleting historical records', async () => {
    const mechanic = { id: 'm-1', name: 'Carlos', status: Status.ACTIVE };
    mockMechanicRepo.findOne.mockResolvedValue(mechanic);

    const result = await service.inactivate('m-1');

    expect(result.status).toBe(Status.INACTIVE);
  });

  it('should reactivate a mechanic', async () => {
    const mechanic = { id: 'm-1', name: 'Carlos', status: Status.INACTIVE };
    mockMechanicRepo.findOne.mockResolvedValue(mechanic);

    const result = await service.activate('m-1');

    expect(result.status).toBe(Status.ACTIVE);
  });
});
