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

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const formattedPlate = createVehicleDto.plate.toUpperCase().trim();

    const existing = await this.vehicleRepository.findOne({
      where: { plate: formattedPlate },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle with plate '${formattedPlate}' already exists`,
      );
    }

    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      plate: formattedPlate,
      status: createVehicleDto.status || VehicleStatus.AVAILABLE,
    });

    return this.vehicleRepository.save(vehicle);
  }

  async findAll(status?: VehicleStatus): Promise<Vehicle[]> {
    const whereClause = status ? { status } : {};
    return this.vehicleRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdOrPlate(identifier: string): Promise<Vehicle> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    let vehicle: Vehicle | null = null;

    if (isUuid) {
      vehicle = await this.vehicleRepository.findOne({
        where: { id: identifier },
        relations: { maintenances: true },
      });
    }

    if (!vehicle) {
      vehicle = await this.vehicleRepository.findOne({
        where: { plate: identifier.toUpperCase().trim() },
        relations: { maintenances: true },
      });
    }

    if (!vehicle) {
      throw new NotFoundException(
        `Vehicle with identifier or plate '${identifier}' not found`,
      );
    }

    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findByIdOrPlate(id);
    Object.assign(vehicle, updateVehicleDto);
    return this.vehicleRepository.save(vehicle);
  }

  async setStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    const vehicle = await this.findByIdOrPlate(id);
    vehicle.status = status;
    return this.vehicleRepository.save(vehicle);
  }

  async inactivate(id: string): Promise<Vehicle> {
    return this.setStatus(id, VehicleStatus.INACTIVE);
  }
}
