import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let mockVehicleRepo: any;

  beforeEach(async () => {
    mockVehicleRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'v-1', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepo,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  it('should create a vehicle with uppercase plate formatting', async () => {
    mockVehicleRepo.findOne.mockResolvedValue(null);

    const result = await service.create({
      plate: 'abc123',
      brand: 'Chevrolet',
      model: 'NPR',
      year: 2022,
      mileage: 45000,
    });

    expect(result.plate).toBe('ABC123');
    expect(result.status).toBe(VehicleStatus.AVAILABLE);
  });

  it('should throw ConflictException if plate already exists', async () => {
    mockVehicleRepo.findOne.mockResolvedValue({ id: 'existing', plate: 'ABC123' });

    await expect(
      service.create({
        plate: 'ABC123',
        brand: 'Chevrolet',
        model: 'NPR',
        year: 2022,
        mileage: 45000,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should logically inactivate a vehicle without deleting data', async () => {
    const vehicle = { id: 'v-1', plate: 'ABC123', status: VehicleStatus.AVAILABLE };
    mockVehicleRepo.findOne.mockResolvedValue(vehicle);

    const result = await service.inactivate('v-1');

    expect(result.status).toBe(VehicleStatus.INACTIVE);
    expect(mockVehicleRepo.save).toHaveBeenCalled();
  });
});
