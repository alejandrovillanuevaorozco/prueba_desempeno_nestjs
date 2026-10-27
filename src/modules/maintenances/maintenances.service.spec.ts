import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';
import { MaintenanceType } from '../../common/enums/maintenance-type.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { Status } from '../../common/enums/status.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-status.dto.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { MaintenancesService } from './maintenances.service.js';

describe('MaintenancesService — Domain Rules & State Machine', () => {
  let service: MaintenancesService;
  let mockMaintenanceRepo: any;
  let mockVehicleRepo: any;
  let mockMechanicRepo: any;
  let mockWorkshopRepo: any;
  let mockDataSource: any;
  let mockEntityManager: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entityClass, data) => ({ ...data, id: 'm-uuid-1' })),
      save: jest.fn(async (entityClass, data) => data),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb) => cb(mockEntityManager)),
    };

    mockMaintenanceRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };

    mockVehicleRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (data) => data),
    };

    mockMechanicRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (data) => data),
    };

    mockWorkshopRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenancesService,
        {
          provide: getRepositoryToken(Maintenance),
          useValue: mockMaintenanceRepo,
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepo,
        },
        {
          provide: getRepositoryToken(Mechanic),
          useValue: mockMechanicRepo,
        },
        {
          provide: getRepositoryToken(Workshop),
          useValue: mockWorkshopRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<MaintenancesService>(MaintenancesService);
  });

  describe('create() — Scheduling and Domain Invariants', () => {
    const validDto: CreateMaintenanceDto = {
      vehicleId: 'v-1',
      mechanicId: 'm-1',
      workshopId: 'w-1',
      type: MaintenanceType.PREVENTIVE,
      description: 'Oil and filters change',
      mileage: 50000,
      scheduledDate: '2026-11-01T08:00:00.000Z',
    };

    it('should successfully schedule a maintenance when all conditions are valid', async () => {
      // Mock vehicle
      mockEntityManager.findOne.mockImplementation(async (entityClass, options) => {
        if (entityClass === Vehicle) {
          return {
            id: 'v-1',
            plate: 'ABC123',
            mileage: 45000,
            status: VehicleStatus.AVAILABLE,
          };
        }
        if (entityClass === Mechanic) {
          return {
            id: 'm-1',
            name: 'Carlos Pérez',
            status: Status.ACTIVE,
          };
        }
        if (entityClass === Workshop) {
          return {
            id: 'w-1',
            name: 'Taller Central',
            status: Status.ACTIVE,
          };
        }
        if (entityClass === Maintenance) {
          return null; // No active maintenance for vehicle or mechanic
        }
        return null;
      });

      const result = await service.create(validDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(MaintenanceStatus.SCHEDULED);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should reject maintenance creation if registered mileage is lower than current vehicle odometer', async () => {
      mockEntityManager.findOne.mockImplementation(async (entityClass) => {
        if (entityClass === Vehicle) {
          return {
            id: 'v-1',
            plate: 'ABC123',
            mileage: 60000, // higher than dto.mileage (50000)
            status: VehicleStatus.AVAILABLE,
          };
        }
        return null;
      });

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject maintenance creation if vehicle is INACTIVE', async () => {
      mockEntityManager.findOne.mockImplementation(async (entityClass) => {
        if (entityClass === Vehicle) {
          return {
            id: 'v-1',
            plate: 'ABC123',
            mileage: 45000,
            status: VehicleStatus.INACTIVE,
          };
        }
        return null;
      });

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject maintenance creation if vehicle already has an active maintenance', async () => {
      mockEntityManager.findOne.mockImplementation(async (entityClass) => {
        if (entityClass === Vehicle) {
          return {
            id: 'v-1',
            plate: 'ABC123',
            mileage: 45000,
            status: VehicleStatus.AVAILABLE,
          };
        }
        if (entityClass === Maintenance) {
          return {
            id: 'm-active-1',
            status: MaintenanceStatus.IN_PROGRESS,
          };
        }
        return null;
      });

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it('should reject maintenance creation if mechanic is INACTIVE', async () => {
      mockEntityManager.findOne.mockImplementation(async (entityClass) => {
        if (entityClass === Vehicle) {
          return { id: 'v-1', plate: 'ABC123', mileage: 45000, status: VehicleStatus.AVAILABLE };
        }
        if (entityClass === Mechanic) {
          return { id: 'm-1', name: 'Mario', status: Status.INACTIVE };
        }
        return null;
      });

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject maintenance creation if mechanic already has an active maintenance (concurrency check)', async () => {
      let callCount = 0;
      mockEntityManager.findOne.mockImplementation(async (entityClass) => {
        if (entityClass === Vehicle) {
          return { id: 'v-1', plate: 'ABC123', mileage: 45000, status: VehicleStatus.AVAILABLE };
        }
        if (entityClass === Mechanic) {
          return { id: 'm-1', name: 'Carlos', status: Status.ACTIVE };
        }
        if (entityClass === Maintenance) {
          callCount++;
          // First call is vehicle check (null), second call is mechanic check (active maintenance exists!)
          if (callCount === 1) return null;
          return { id: 'm-existing', status: MaintenanceStatus.SCHEDULED };
        }
        return null;
      });

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it('should allow scheduling when mechanic has an existing job that does not overlap in time (Section 3.10.d)', async () => {
      // Existing job: 7:30 to 9:00 (1.5 hours)
      // New job starts at 9:00 (09:00:00) -> non-overlapping!
      const nonOverlappingDto: CreateMaintenanceDto = {
        ...validDto,
        scheduledDate: '2026-11-01T09:00:00.000Z',
        estimatedDurationHours: 1.5,
      };

      mockEntityManager.findOne.mockImplementation(async (entityClass) => {
        if (entityClass === Vehicle) {
          return { id: 'v-1', plate: 'ABC123', mileage: 45000, status: VehicleStatus.AVAILABLE };
        }
        if (entityClass === Mechanic) {
          return { id: 'm-1', name: 'Carlos', status: Status.ACTIVE };
        }
        if (entityClass === Workshop) {
          return { id: 'w-1', name: 'Taller Central', status: Status.ACTIVE };
        }
        return null; // vehicle has no active maintenance
      });

      // Mechanic has existing maintenance from 7:30 to 9:00
      mockEntityManager.find.mockImplementation(async (entityClass) => {
        if (entityClass === Maintenance) {
          return [
            {
              id: 'm-prior',
              scheduledDate: new Date('2026-11-01T07:30:00.000Z'),
              estimatedDurationHours: 1.5, // ends at 9:00
              status: MaintenanceStatus.SCHEDULED,
            },
          ];
        }
        return [];
      });

      const result = await service.create(nonOverlappingDto);
      expect(result).toBeDefined();
      expect(result.status).toBe(MaintenanceStatus.SCHEDULED);
    });

    it('should reject scheduling when mechanic schedule overlaps in time (Section 3.10.c: 7:30-9:00, new at 8:00)', async () => {
      const overlappingDto: CreateMaintenanceDto = {
        ...validDto,
        scheduledDate: '2026-11-01T08:00:00.000Z',
        estimatedDurationHours: 1.5,
      };

      mockEntityManager.findOne.mockImplementation(async (entityClass) => {
        if (entityClass === Vehicle) {
          return { id: 'v-1', plate: 'ABC123', mileage: 45000, status: VehicleStatus.AVAILABLE };
        }
        if (entityClass === Mechanic) {
          return { id: 'm-1', name: 'Carlos', status: Status.ACTIVE };
        }
        if (entityClass === Workshop) {
          return { id: 'w-1', name: 'Taller Central', status: Status.ACTIVE };
        }
        return null;
      });

      mockEntityManager.find.mockImplementation(async (entityClass) => {
        if (entityClass === Maintenance) {
          return [
            {
              id: 'm-prior',
              scheduledDate: new Date('2026-11-01T07:30:00.000Z'),
              estimatedDurationHours: 1.5, // ends at 9:00
              status: MaintenanceStatus.SCHEDULED,
            },
          ];
        }
        return [];
      });

      await expect(service.create(overlappingDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus() — State Machine Transitions & ACID Synchronization', () => {
    it('should transition SCHEDULED -> IN_PROGRESS and atomically set vehicle to IN_MAINTENANCE', async () => {
      const mockVehicle = {
        id: 'v-1',
        status: VehicleStatus.AVAILABLE,
        mileage: 45000,
      };

      const mockMaintenance = {
        id: 'm-1',
        status: MaintenanceStatus.SCHEDULED,
        mileage: 45000,
        vehicle: mockVehicle,
        mechanicId: 'mech-1',
      };

      mockEntityManager.findOne.mockResolvedValue(mockMaintenance);

      const dto: UpdateMaintenanceStatusDto = {
        status: MaintenanceStatus.IN_PROGRESS,
      };

      const result = await service.updateStatus('m-1', dto);

      expect(result.status).toBe(MaintenanceStatus.IN_PROGRESS);
      expect(mockVehicle.status).toBe(VehicleStatus.IN_MAINTENANCE);
      expect(mockEntityManager.save).toHaveBeenCalledWith(Vehicle, mockVehicle);
    });

    it('should transition IN_PROGRESS -> COMPLETED, updating vehicle to AVAILABLE and syncing mileage', async () => {
      const mockVehicle = {
        id: 'v-1',
        status: VehicleStatus.IN_MAINTENANCE,
        mileage: 45000,
      };

      const mockMaintenance = {
        id: 'm-1',
        status: MaintenanceStatus.IN_PROGRESS,
        mileage: 45000,
        vehicle: mockVehicle,
        mechanicId: 'mech-1',
      };

      mockEntityManager.findOne.mockResolvedValue(mockMaintenance);

      const dto: UpdateMaintenanceStatusDto = {
        status: MaintenanceStatus.COMPLETED,
        workDone: 'Reemplazo completo de frenos y purgado',
        finalCost: 480000,
        completedAt: '2026-11-01T15:00:00.000Z',
        finalMileage: 45060,
      };

      const result = await service.updateStatus('m-1', dto);

      expect(result.status).toBe(MaintenanceStatus.COMPLETED);
      expect(result.workDone).toBe(dto.workDone);
      expect(result.finalCost).toBe(dto.finalCost);
      expect(result.finalMileage).toBe(45060);
      expect(mockVehicle.status).toBe(VehicleStatus.AVAILABLE);
      expect(mockVehicle.mileage).toBe(45060);
    });

    it('should reject COMPLETED transition if mandatory closure fields are missing', async () => {
      const mockMaintenance = {
        id: 'm-1',
        status: MaintenanceStatus.IN_PROGRESS,
        mileage: 45000,
        vehicle: { id: 'v-1', status: VehicleStatus.IN_MAINTENANCE, mileage: 45000 },
      };

      mockEntityManager.findOne.mockResolvedValue(mockMaintenance);

      // Missing workDone
      const dto: UpdateMaintenanceStatusDto = {
        status: MaintenanceStatus.COMPLETED,
        finalCost: 480000,
        completedAt: '2026-11-01T15:00:00.000Z',
        finalMileage: 45060,
      };

      await expect(service.updateStatus('m-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject transition from COMPLETED to any previous state (terminal state constraint)', async () => {
      const mockMaintenance = {
        id: 'm-1',
        status: MaintenanceStatus.COMPLETED,
        vehicle: { id: 'v-1', status: VehicleStatus.AVAILABLE },
      };

      mockEntityManager.findOne.mockResolvedValue(mockMaintenance);

      const dto: UpdateMaintenanceStatusDto = {
        status: MaintenanceStatus.IN_PROGRESS,
      };

      await expect(service.updateStatus('m-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject transition from CANCELLED to IN_PROGRESS or COMPLETED', async () => {
      const mockMaintenance = {
        id: 'm-1',
        status: MaintenanceStatus.CANCELLED,
        vehicle: { id: 'v-1', status: VehicleStatus.AVAILABLE },
      };

      mockEntityManager.findOne.mockResolvedValue(mockMaintenance);

      const dto: UpdateMaintenanceStatusDto = {
        status: MaintenanceStatus.IN_PROGRESS,
      };

      await expect(service.updateStatus('m-1', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
