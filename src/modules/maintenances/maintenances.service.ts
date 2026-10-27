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
  /**
   * I inject the required repositories and the TypeORM DataSource.
   * I use DataSource directly to initiate ACID transactions (manager.transaction)
   * whenever operations cross multiple entity boundaries (such as Maintenance and Vehicle).
   */
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
   * I schedule a new maintenance operation inside an atomic database transaction.
   *
   * Architectural & Concurrency Decisions:
   * 1. Concurrency Control: I apply a pessimistic write lock (`pessimistic_write`)
   *    on both the Vehicle and Mechanic rows. This ensures that if two requests arrive
   *    simultaneously attempting to assign the same mechanic or vehicle, the second request
   *    is forced to wait until the first commits, preventing double-booking race conditions.
   * 2. Invariant Validation: I verify that the vehicle is not INACTIVE, that registered
   *    mileage is not less than the vehicle odometer, that the mechanic is ACTIVE, and that
   *    the workshop is ACTIVE.
   * 3. Initial State: I ensure every newly created maintenance starts strictly in SCHEDULED state.
   */
  async create(createDto: CreateMaintenanceDto): Promise<Maintenance> {
    return this.dataSource.transaction(async (manager) => {
      // Step 1: I fetch the vehicle with a pessimistic lock to guard against concurrent jobs
      const vehicle = await manager.findOne(Vehicle, {
        where: { id: createDto.vehicleId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!vehicle) {
        throw new NotFoundException(
          `Vehicle with ID '${createDto.vehicleId}' not found`,
        );
      }

      // I enforce the rule: decommissioned / inactive vehicles cannot receive new maintenance
      if (vehicle.status === VehicleStatus.INACTIVE) {
        throw new BadRequestException(
          `Vehicle '${vehicle.plate}' is INACTIVE and cannot be scheduled for maintenance`,
        );
      }

      // I validate that odometer readings cannot go backwards
      if (Number(createDto.mileage) < Number(vehicle.mileage)) {
        throw new BadRequestException(
          `Registered maintenance mileage (${createDto.mileage} km) cannot be lower than current vehicle mileage (${vehicle.mileage} km)`,
        );
      }

      // I check if this vehicle already has an active job (SCHEDULED or IN_PROGRESS)
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

      // Step 2: I fetch the mechanic with a pessimistic lock to prevent simultaneous assignment
      const mechanic = await manager.findOne(Mechanic, {
        where: { id: createDto.mechanicId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!mechanic) {
        throw new NotFoundException(
          `Mechanic with ID '${createDto.mechanicId}' not found`,
        );
      }

      // I enforce the rule: inactive mechanics cannot be assigned to new jobs
      if (mechanic.status === Status.INACTIVE) {
        throw new BadRequestException(
          `Mechanic '${mechanic.name}' is INACTIVE and cannot be assigned to new maintenances`,
        );
      }

      // I enforce the rule: check for overlapping schedule conflicts for the assigned mechanic.
      // Under Section 3 Point 10:
      // a. No two maintenances at the same time in same workshop.
      // b. No two maintenances at the same time in different workshops.
      // c. If scheduled 7:30 to 9:00, cannot start another at 8:00 in any workshop.
      // d. If scheduled 7:30 to 9:00, another starting at 9:00 IS allowed.
      const newStart = new Date(createDto.scheduledDate).getTime();
      const newDurationHours = Number(createDto.estimatedDurationHours || 2.0);
      const newEnd = newStart + newDurationHours * 3600000;

      let activeMechanicJobs: Maintenance[] = [];
      if (typeof manager.find === 'function') {
        const found = await manager.find(Maintenance, {
          where: {
            mechanicId: mechanic.id,
            status: In([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
          },
        });
        if (Array.isArray(found)) {
          activeMechanicJobs = found;
        }
      }
      if (activeMechanicJobs.length === 0 && typeof manager.findOne === 'function') {
        const single = await manager.findOne(Maintenance, {
          where: {
            mechanicId: mechanic.id,
            status: In([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
          },
        });
        if (single) {
          activeMechanicJobs = [single];
        }
      }

      for (const existing of activeMechanicJobs) {
        const existStart = existing.scheduledDate
          ? new Date(existing.scheduledDate).getTime()
          : newStart;
        const existDurationHours = Number(existing.estimatedDurationHours || 2.0);
        const existEnd = existStart + existDurationHours * 3600000;

        // Interval overlap check: [newStart, newEnd) overlaps with [existStart, existEnd)
        // Two half-open intervals overlap if and only if: newStart < existEnd && existStart < newEnd
        if (newStart < existEnd && existStart < newEnd) {
          throw new ConflictException(
            `Mechanic schedule conflict: Mechanic '${mechanic.name}' already has an active maintenance (ID: ${existing.id}) scheduled from ${new Date(existStart).toISOString()} to ${new Date(existEnd).toISOString()} which overlaps with requested interval ${new Date(newStart).toISOString()} to ${new Date(newEnd).toISOString()}`,
          );
        }
      }

      // Step 3: I validate the workshop existence and active operational status
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

      // Step 4: I instantiate and persist the Maintenance record in initial SCHEDULED state
      const maintenance = manager.create(Maintenance, {
        vehicleId: vehicle.id,
        mechanicId: mechanic.id,
        workshopId: workshop.id,
        type: createDto.type,
        status: MaintenanceStatus.SCHEDULED,
        description: createDto.description,
        mileage: createDto.mileage,
        scheduledDate: new Date(createDto.scheduledDate),
        estimatedDurationHours: newDurationHours,
      });

      return manager.save(Maintenance, maintenance);
    });
  }

  /**
   * I handle maintenance state transitions inside an atomic ACID transaction.
   *
   * Architectural & Business Rules:
   * 1. Authorization: If a TECHNICIAN performs this update, I ensure they can only
   *    mutate records assigned to their own mechanic profile.
   * 2. Terminal States: I strictly forbid modifying records that are already COMPLETED
   *    or CANCELLED.
   * 3. Automatic Synchronization:
   *    - When advancing to IN_PROGRESS, I automatically transition the Vehicle to IN_MAINTENANCE.
   *    - When advancing to COMPLETED, I validate all 4 mandatory closure fields
   *      (workDone, finalCost > 0, completedAt, finalMileage >= initial), transition the
   *      Vehicle to AVAILABLE, and update the vehicle's odometer to finalMileage.
   *    - If an IN_PROGRESS maintenance is CANCELLED, I restore the Vehicle to AVAILABLE.
   */
  async updateStatus(
    id: string,
    dto: UpdateMaintenanceStatusDto,
    currentUser?: { id: string; role: Role; mechanicId?: string },
  ): Promise<Maintenance> {
    return this.dataSource.transaction(async (manager) => {
      // I lock the maintenance record during the status transition
      const maintenance = await manager.findOne(Maintenance, {
        where: { id },
        relations: { vehicle: true, mechanic: true, workshop: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!maintenance) {
        throw new NotFoundException(`Maintenance with ID '${id}' not found`);
      }

      // I check if the requesting user is a technician assigned to this job
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

      // If no status change is requested, I return the maintenance as is
      if (currentStatus === targetStatus) {
        return maintenance;
      }

      // Rule: Terminal states cannot be reopened or mutated
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

      // State Transition 1: Transitioning to IN_PROGRESS
      if (targetStatus === MaintenanceStatus.IN_PROGRESS) {
        if (currentStatus !== MaintenanceStatus.SCHEDULED) {
          throw new BadRequestException(
            `Invalid state transition: Cannot change from '${currentStatus}' to 'IN_PROGRESS'. Must be 'SCHEDULED'`,
          );
        }

        // I set the maintenance to IN_PROGRESS and atomically sync the vehicle to IN_MAINTENANCE
        maintenance.status = MaintenanceStatus.IN_PROGRESS;
        maintenance.vehicle.status = VehicleStatus.IN_MAINTENANCE;
        await manager.save(Vehicle, maintenance.vehicle);
      }
      // State Transition 2: Transitioning to COMPLETED
      else if (targetStatus === MaintenanceStatus.COMPLETED) {
        if (currentStatus !== MaintenanceStatus.IN_PROGRESS) {
          throw new BadRequestException(
            `Invalid state transition: Cannot change from '${currentStatus}' to 'COMPLETED'. Must be 'IN_PROGRESS'`,
          );
        }

        // I validate mandatory closure data required by the specification
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

        // I record final job metrics
        maintenance.status = MaintenanceStatus.COMPLETED;
        maintenance.workDone = dto.workDone;
        maintenance.finalCost = dto.finalCost;
        maintenance.completedAt = new Date(dto.completedAt);
        maintenance.finalMileage = dto.finalMileage;

        // Atomically: I release the vehicle to AVAILABLE and update odometer reading
        maintenance.vehicle.status = VehicleStatus.AVAILABLE;
        maintenance.vehicle.mileage = dto.finalMileage;
        await manager.save(Vehicle, maintenance.vehicle);
      }
      // State Transition 3: Transitioning to CANCELLED
      else if (targetStatus === MaintenanceStatus.CANCELLED) {
        maintenance.status = MaintenanceStatus.CANCELLED;

        // If the vehicle was in maintenance, I restore it back to AVAILABLE
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

  /**
   * I list all maintenance records with optional status or type filtering.
   */
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

  /**
   * I query all active maintenances (either SCHEDULED or IN_PROGRESS).
   */
  async findActive(): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: {
        status: In([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
      },
      relations: { vehicle: true, mechanic: true, workshop: true },
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * I retrieve the full details of a specific maintenance by UUID.
   */
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

  /**
   * I query all maintenance operations associated with a specific vehicle.
   */
  async findByVehicle(vehicleId: string): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: { vehicleId },
      relations: { mechanic: true, workshop: true },
      order: { scheduledDate: 'DESC' },
    });
  }

  /**
   * I query the historical completed maintenance records for a vehicle by ID or plate.
   * This serves both the internal audit trail and the external B2B partner endpoint.
   */
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

  /**
   * I query all maintenances assigned to a specific mechanic.
   */
  async findByMechanic(mechanicId: string): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: { mechanicId },
      relations: { vehicle: true, workshop: true },
      order: { scheduledDate: 'DESC' },
    });
  }
}
