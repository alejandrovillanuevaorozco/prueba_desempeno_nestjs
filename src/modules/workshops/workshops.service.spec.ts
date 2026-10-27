import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Status } from '../../common/enums/status.enum.js';
import { Workshop } from './entities/workshop.entity.js';
import { WorkshopsService } from './workshops.service.js';

/**
 * WorkshopsService Unit Test Suite
 * 
 * In this test suite, I verify workshop operational management:
 * 1. Default ACTIVE status initialization on facility creation.
 * 2. Active workshop filtering for maintenance scheduling.
 * 3. Logical inactivation safeguarding maintenance logs.
 */
describe('WorkshopsService', () => {
  let service: WorkshopsService;
  let mockWorkshopRepo: any;

  beforeEach(async () => {
    mockWorkshopRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'w-1', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkshopsService,
        {
          provide: getRepositoryToken(Workshop),
          useValue: mockWorkshopRepo,
        },
      ],
    }).compile();

    service = module.get<WorkshopsService>(WorkshopsService);
  });

  it('should create an active workshop', async () => {
    const result = await service.create({
      name: 'Taller Norte',
      address: 'Calle 100',
    });

    expect(result.name).toBe('Taller Norte');
    expect(result.status).toBe(Status.ACTIVE);
  });

  it('should find active workshops', async () => {
    mockWorkshopRepo.find.mockResolvedValue([
      { id: 'w-1', name: 'Taller Central', status: Status.ACTIVE },
    ]);

    const result = await service.findActive();

    expect(result.length).toBe(1);
    expect(mockWorkshopRepo.find).toHaveBeenCalledWith({
      where: { status: Status.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  });

  it('should find a workshop by id', async () => {
    const workshop = { id: 'w-1', name: 'Taller Central', status: Status.ACTIVE };
    mockWorkshopRepo.findOne.mockResolvedValue(workshop);

    const result = await service.findById('w-1');
    expect(result.id).toBe('w-1');
  });

  it('should throw NotFoundException if workshop does not exist', async () => {
    mockWorkshopRepo.findOne.mockResolvedValue(null);

    await expect(service.findById('w-404')).rejects.toThrow(NotFoundException);
  });

  it('should update workshop fields', async () => {
    const workshop = { id: 'w-1', name: 'Taller Central', status: Status.ACTIVE };
    mockWorkshopRepo.findOne.mockResolvedValue(workshop);

    const result = await service.update('w-1', { name: 'Taller Central Modificado' });
    expect(mockWorkshopRepo.save).toHaveBeenCalled();
  });

  it('should inactivate a workshop without deleting records', async () => {
    const workshop = { id: 'w-1', name: 'Taller Norte', status: Status.ACTIVE };
    mockWorkshopRepo.findOne.mockResolvedValue(workshop);

    const result = await service.inactivate('w-1');

    expect(result.status).toBe(Status.INACTIVE);
  });

  it('should reactivate an inactive workshop', async () => {
    const workshop = { id: 'w-1', name: 'Taller Norte', status: Status.INACTIVE };
    mockWorkshopRepo.findOne.mockResolvedValue(workshop);

    const result = await service.activate('w-1');

    expect(result.status).toBe(Status.ACTIVE);
  });
});
