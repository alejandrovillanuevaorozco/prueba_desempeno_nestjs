import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';

/**
 * VehiclesService
 * 
 * In this service, I manage fleet vehicle inventory, unique license plate normalization,
 * mileage tracking, and logical inactivation (soft deletion) to preserve historical data integrity.
 */
@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  /**
   * I register a new vehicle into the fleet. I normalize the license plate to uppercase
   * and ensure uniqueness before persisting the entity.
   */
  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    // 1. I normalize the license plate to uppercase and trim whitespace
    const formattedPlate = createVehicleDto.plate.toUpperCase().trim();

    // 2. I check whether a vehicle with this plate already exists
    const existing = await this.vehicleRepository.findOne({
      where: { plate: formattedPlate },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle with plate '${formattedPlate}' already exists`,
      );
    }

    // 3. I create and save the entity with default status AVAILABLE
    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      plate: formattedPlate,
      status: createVehicleDto.status || VehicleStatus.AVAILABLE,
    });

    return this.vehicleRepository.save(vehicle);
  }

  /**
   * I retrieve all fleet vehicles, optionally filtered by their operational status.
   */
  async findAll(status?: VehicleStatus): Promise<Vehicle[]> {
    const whereClause = status ? { status } : {};
    return this.vehicleRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * I find a vehicle by either its internal UUID or its license plate.
   * This provides flexibility for both REST APIs and partner integrations.
   */
  async findByIdOrPlate(identifier: string): Promise<Vehicle> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    let vehicle: Vehicle | null = null;

    // 1. If the identifier is a valid UUID, I search by primary key
    if (isUuid) {
      vehicle = await this.vehicleRepository.findOne({
        where: { id: identifier },
        relations: { maintenances: true },
      });
    }

    // 2. If not found or identifier is a license plate string, I search by normalized plate
    if (!vehicle) {
      vehicle = await this.vehicleRepository.findOne({
        where: { plate: identifier.toUpperCase().trim() },
        relations: { maintenances: true },
      });
    }

    // 3. If neither matches, I raise a 404 NotFoundException
    if (!vehicle) {
      throw new NotFoundException(
        `Vehicle with identifier or plate '${identifier}' not found`,
      );
    }

    return vehicle;
  }

  /**
   * I update vehicle attributes (e.g. mileage, model, year).
   */
  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findByIdOrPlate(id);
    Object.assign(vehicle, updateVehicleDto);
    return this.vehicleRepository.save(vehicle);
  }

  /**
   * I update the operational status of a vehicle (e.g. AVAILABLE, IN_MAINTENANCE, INACTIVE).
   */
  async setStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    const vehicle = await this.findByIdOrPlate(id);
    vehicle.status = status;
    return this.vehicleRepository.save(vehicle);
  }

  /**
   * I logically inactivate a vehicle.
   * In accordance with audit requirements, I never execute hard DELETE operations on vehicles,
   * guaranteeing that historical maintenance and cost records remain permanently intact.
   */
  async inactivate(id: string): Promise<Vehicle> {
    return this.setStatus(id, VehicleStatus.INACTIVE);
  }
}

