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

  it('should list all vehicles with optional status filter', async () => {
    mockVehicleRepo.find.mockResolvedValue([{ id: 'v-1', plate: 'ABC123' }]);

    const result = await service.findAll(VehicleStatus.AVAILABLE);
    expect(result).toHaveLength(1);
    expect(mockVehicleRepo.find).toHaveBeenCalledWith({
      where: { status: VehicleStatus.AVAILABLE },
      order: { createdAt: 'DESC' },
    });
  });

  it('should find vehicle by valid UUID', async () => {
    const validUuid = '12345678-1234-4234-8234-123456789abc';
    const vehicle = { id: validUuid, plate: 'ABC123' };
    mockVehicleRepo.findOne.mockResolvedValue(vehicle);

    const result = await service.findByIdOrPlate(validUuid);
    expect(result.id).toBe(validUuid);
  });

  it('should find vehicle by plate string', async () => {
    const vehicle = { id: 'v-1', plate: 'ABC123' };
    mockVehicleRepo.findOne.mockResolvedValue(vehicle);

    const result = await service.findByIdOrPlate('abc123');
    expect(result.plate).toBe('ABC123');
  });

  it('should throw NotFoundException if vehicle does not exist', async () => {
    mockVehicleRepo.findOne.mockResolvedValue(null);

    await expect(service.findByIdOrPlate('UNKNOWN')).rejects.toThrow(NotFoundException);
  });

  it('should update vehicle attributes', async () => {
    const vehicle = { id: 'v-1', plate: 'ABC123', mileage: 45000 };
    mockVehicleRepo.findOne.mockResolvedValue(vehicle);

    const result = await service.update('v-1', { mileage: 50000 });
    expect(mockVehicleRepo.save).toHaveBeenCalled();
  });

  it('should logically inactivate a vehicle without deleting data', async () => {
    const vehicle = { id: 'v-1', plate: 'ABC123', status: VehicleStatus.AVAILABLE };
    mockVehicleRepo.findOne.mockResolvedValue(vehicle);

    const result = await service.inactivate('v-1');

    expect(result.status).toBe(VehicleStatus.INACTIVE);
    expect(mockVehicleRepo.save).toHaveBeenCalled();
  });
});
