import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { Status } from '../../common/enums/status.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-status.dto.js';
import { Maintenance } from './entities/maintenance.entity.js';

@Injectable()
export class MaintenancesService {
  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenanceRepository: Repository<Maintenance>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Mechanic)
    private readonly mechanicRepository: Repository<Mechanic>,
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new maintenance with atomic transaction and concurrency locking.
   * Enforces all domain invariants:
   * 1. Vehicle exists, is not INACTIVE, and has no active maintenance.
   * 2. Mileage is not less than vehicle's current odometer.
   * 3. Mechanic exists, is ACTIVE, and has no overlapping active maintenance (concurrency lock).
   * 4. Workshop exists and is ACTIVE.
   */
  async create(createDto: CreateMaintenanceDto): Promise<Maintenance> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Validate Vehicle
      const vehicle = await manager.findOne(Vehicle, {
        where: { id: createDto.vehicleId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!vehicle) {
        throw new NotFoundException(
          `Vehicle with ID '${createDto.vehicleId}' not found`,
        );
      }

      if (vehicle.status === VehicleStatus.INACTIVE) {
        throw new BadRequestException(
          `Vehicle '${vehicle.plate}' is INACTIVE and cannot be scheduled for maintenance`,
        );
      }

      if (Number(createDto.mileage) < Number(vehicle.mileage)) {
        throw new BadRequestException(
          `Registered maintenance mileage (${createDto.mileage} km) cannot be lower than current vehicle mileage (${vehicle.mileage} km)`,
        );
      }

      const activeVehicleMaintenance = await manager.findOne(Maintenance, {
        where: {
          vehicleId: vehicle.id,
          status: In([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
        },
      });

      if (activeVehicleMaintenance) {
        throw new ConflictException(
          `Vehicle '${vehicle.plate}' already has an active maintenance (ID: ${activeVehicleMaintenance.id}) with status '${activeVehicleMaintenance.status}'`,
        );
      }

      // 2. Validate Mechanic with Pessimistic Lock to eliminate race conditions
      const mechanic = await manager.findOne(Mechanic, {
        where: { id: createDto.mechanicId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!mechanic) {
        throw new NotFoundException(
          `Mechanic with ID '${createDto.mechanicId}' not found`,
        );
      }

      if (mechanic.status === Status.INACTIVE) {
        throw new BadRequestException(
          `Mechanic '${mechanic.name}' is INACTIVE and cannot be assigned to new maintenances`,
        );
      }

      const activeMechanicMaintenance = await manager.findOne(Maintenance, {
        where: {
          mechanicId: mechanic.id,
          status: In([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
        },
      });

      if (activeMechanicMaintenance) {
        throw new ConflictException(
          `Mechanic '${mechanic.name}' already has an active maintenance (ID: ${activeMechanicMaintenance.id}) in progress or scheduled`,
        );
      }

      // 3. Validate Workshop
      const workshop = await manager.findOne(Workshop, {
        where: { id: createDto.workshopId },
      });

      if (!workshop) {
        throw new NotFoundException(
          `Workshop with ID '${createDto.workshopId}' not found`,
        );
      }

      if (workshop.status === Status.INACTIVE) {
        throw new BadRequestException(
          `Workshop '${workshop.name}' is INACTIVE and cannot host maintenances`,
        );
      }

      // 4. Create Maintenance entity in initial SCHEDULED state
      const maintenance = manager.create(Maintenance, {
        vehicleId: vehicle.id,
        mechanicId: mechanic.id,
        workshopId: workshop.id,
        type: createDto.type,
        status: MaintenanceStatus.SCHEDULED,
        description: createDto.description,
        mileage: createDto.mileage,
        scheduledDate: new Date(createDto.scheduledDate),
      });

      return manager.save(Maintenance, maintenance);
    });
  }

  /**
   * Updates maintenance status within an atomic ACID transaction.
   * Synchronizes Vehicle status and validates closure data.
   */
  async updateStatus(
    id: string,
    dto: UpdateMaintenanceStatusDto,
    currentUser?: { id: string; role: Role; mechanicId?: string },
  ): Promise<Maintenance> {
    return this.dataSource.transaction(async (manager) => {
      const maintenance = await manager.findOne(Maintenance, {
        where: { id },
        relations: { vehicle: true, mechanic: true, workshop: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!maintenance) {
        throw new NotFoundException(`Maintenance with ID '${id}' not found`);
      }

      // Check technician authorization
      if (
        currentUser &&
        currentUser.role === Role.TECHNICIAN &&
        currentUser.mechanicId &&
        maintenance.mechanicId !== currentUser.mechanicId
      ) {
        throw new ForbiddenException(
          'Technicians can only update maintenances assigned to them',
        );
      }

      const currentStatus = maintenance.status;
      const targetStatus = dto.status;

      if (currentStatus === targetStatus) {
        return maintenance;
      }

      // Invariant: Terminal States cannot be mutated
      if (currentStatus === MaintenanceStatus.COMPLETED) {
        throw new BadRequestException(
          'A COMPLETED maintenance cannot return to any previous status; it is terminal',
        );
      }

      if (currentStatus === MaintenanceStatus.CANCELLED) {
        throw new BadRequestException(
          'A CANCELLED maintenance cannot transition to IN_PROGRESS or COMPLETED; it is terminal',
        );
      }

      // State Transition Logic
      if (targetStatus === MaintenanceStatus.IN_PROGRESS) {
        if (currentStatus !== MaintenanceStatus.SCHEDULED) {
          throw new BadRequestException(
            `Invalid state transition: Cannot change from '${currentStatus}' to 'IN_PROGRESS'. Must be 'SCHEDULED'`,
          );
        }

        // Atomic Side Effect: Vehicle transitions to IN_MAINTENANCE
        maintenance.status = MaintenanceStatus.IN_PROGRESS;
        maintenance.vehicle.status = VehicleStatus.IN_MAINTENANCE;
        await manager.save(Vehicle, maintenance.vehicle);
      } else if (targetStatus === MaintenanceStatus.COMPLETED) {
        if (currentStatus !== MaintenanceStatus.IN_PROGRESS) {
          throw new BadRequestException(
            `Invalid state transition: Cannot change from '${currentStatus}' to 'COMPLETED'. Must be 'IN_PROGRESS'`,
          );
        }

        // Validate mandatory closure fields
        if (!dto.workDone || dto.workDone.trim().length === 0) {
          throw new BadRequestException(
            'Missing mandatory closure field: workDone (trabajo realizado)',
          );
        }

        if (dto.finalCost === undefined || Number(dto.finalCost) <= 0) {
          throw new BadRequestException(
            'Missing or invalid mandatory closure field: finalCost must be greater than 0',
          );
        }

        if (!dto.completedAt) {
          throw new BadRequestException(
            'Missing mandatory closure field: completedAt (fecha de finalización)',
          );
        }

        if (
          dto.finalMileage === undefined ||
          Number(dto.finalMileage) < Number(maintenance.mileage)
        ) {
          throw new BadRequestException(
            `Final mileage (${dto.finalMileage ?? 0} km) cannot be lower than the initial maintenance mileage (${maintenance.mileage} km)`,
          );
        }

        maintenance.status = MaintenanceStatus.COMPLETED;
        maintenance.workDone = dto.workDone;
        maintenance.finalCost = dto.finalCost;
        maintenance.completedAt = new Date(dto.completedAt);
        maintenance.finalMileage = dto.finalMileage;

        // Atomic Side Effect: Vehicle transitions to AVAILABLE and updates odometer
        maintenance.vehicle.status = VehicleStatus.AVAILABLE;
        maintenance.vehicle.mileage = dto.finalMileage;
        await manager.save(Vehicle, maintenance.vehicle);
      } else if (targetStatus === MaintenanceStatus.CANCELLED) {
        maintenance.status = MaintenanceStatus.CANCELLED;

        // If vehicle was IN_MAINTENANCE, restore it to AVAILABLE
        if (maintenance.vehicle.status === VehicleStatus.IN_MAINTENANCE) {
          maintenance.vehicle.status = VehicleStatus.AVAILABLE;
          await manager.save(Vehicle, maintenance.vehicle);
        }
      } else {
        throw new BadRequestException(
          `Unsupported target status transition: '${targetStatus}'`,
        );
      }

      return manager.save(Maintenance, maintenance);
    });
  }

  async findAll(options?: {
    status?: MaintenanceStatus;
    type?: string;
  }): Promise<Maintenance[]> {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.type) {
      where.type = options.type;
    }

    return this.maintenanceRepository.find({
      where,
      relations: { vehicle: true, mechanic: true, workshop: true },
      order: { scheduledDate: 'DESC' },
    });
  }

  async findActive(): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: {
        status: In([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
      },
      relations: { vehicle: true, mechanic: true, workshop: true },
      order: { scheduledDate: 'ASC' },
    });
  }

  async findById(id: string): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepository.findOne({
      where: { id },
      relations: { vehicle: true, mechanic: true, workshop: true },
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID '${id}' not found`);
    }

    return maintenance;
  }

  async findByVehicle(vehicleId: string): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: { vehicleId },
      relations: { mechanic: true, workshop: true },
      order: { scheduledDate: 'DESC' },
    });
  }

  async findVehicleHistory(vehicleIdOrPlate: string): Promise<{
    vehicle: Vehicle;
    maintenances: Maintenance[];
  }> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        vehicleIdOrPlate,
      );

    const vehicle = await this.vehicleRepository.findOne({
      where: isUuid
        ? { id: vehicleIdOrPlate }
        : { plate: vehicleIdOrPlate.toUpperCase().trim() },
    });

    if (!vehicle) {
      throw new NotFoundException(
        `Vehicle '${vehicleIdOrPlate}' not found in registry`,
      );
    }

    const maintenances = await this.maintenanceRepository.find({
      where: {
        vehicleId: vehicle.id,
        status: MaintenanceStatus.COMPLETED,
      },
      relations: { mechanic: true, workshop: true },
      order: { completedAt: 'DESC' },
    });

    return {
      vehicle,
      maintenances,
    };
  }

  async findByMechanic(mechanicId: string): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: { mechanicId },
      relations: { vehicle: true, workshop: true },
      order: { scheduledDate: 'DESC' },
    });
  }
}
