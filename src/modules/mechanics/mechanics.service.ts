import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status } from '../../common/enums/status.enum.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { Mechanic } from './entities/mechanic.entity.js';

/**
 * MechanicsService
 * 
 * In this service, I manage the technician and mechanic personnel catalog.
 * I maintain associations between mechanics and their login user accounts,
 * enforce unique contact emails, and provide soft-inactivation capabilities.
 */
@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(Mechanic)
    private readonly mechanicRepository: Repository<Mechanic>,
  ) {}

  /**
   * I register a new mechanic in the catalog, verifying email uniqueness.
   */
  async create(createMechanicDto: CreateMechanicDto): Promise<Mechanic> {
    // 1. I normalize the email to lowercase and trim whitespace
    const formattedEmail = createMechanicDto.email.toLowerCase().trim();

    // 2. I verify that this email is not already assigned to another mechanic
    const existing = await this.mechanicRepository.findOne({
      where: { email: formattedEmail },
    });

    if (existing) {
      throw new ConflictException(
        `Mechanic with email '${formattedEmail}' already exists`,
      );
    }

    // 3. I create and save the entity with default status ACTIVE
    const mechanic = this.mechanicRepository.create({
      ...createMechanicDto,
      email: formattedEmail,
      status: createMechanicDto.status || Status.ACTIVE,
    });

    return this.mechanicRepository.save(mechanic);
  }

  /**
   * I retrieve all mechanics, optionally filtered by status (ACTIVE/INACTIVE).
   */
  async findAll(status?: Status): Promise<Mechanic[]> {
    const where = status ? { status } : {};
    return this.mechanicRepository.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * I find a mechanic by UUID, eager-loading related user account and maintenance records.
   */
  async findById(id: string): Promise<Mechanic> {
    const mechanic = await this.mechanicRepository.findOne({
      where: { id },
      relations: { user: true, maintenances: true },
    });

    if (!mechanic) {
      throw new NotFoundException(`Mechanic with ID '${id}' not found`);
    }

    return mechanic;
  }

  /**
   * I retrieve the mechanic profile linked to a specific user authentication ID.
   */
  async findByUserId(userId: string): Promise<Mechanic | null> {
    return this.mechanicRepository.findOne({
      where: { userId },
      relations: { maintenances: true },
    });
  }

  /**
   * I update mechanic details, ensuring email uniqueness if an email change is requested.
   */
  async update(id: string, updateMechanicDto: UpdateMechanicDto): Promise<Mechanic> {
    const mechanic = await this.findById(id);

    if (updateMechanicDto.email && updateMechanicDto.email !== mechanic.email) {
      const formattedEmail = updateMechanicDto.email.toLowerCase().trim();
      const existing = await this.mechanicRepository.findOne({
        where: { email: formattedEmail },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Mechanic with email '${formattedEmail}' already exists`,
        );
      }
      mechanic.email = formattedEmail;
    }

    Object.assign(mechanic, updateMechanicDto);
    return this.mechanicRepository.save(mechanic);
  }

  /**
   * I update a mechanic's operational status (ACTIVE/INACTIVE).
   */
  async setStatus(id: string, status: Status): Promise<Mechanic> {
    const mechanic = await this.findById(id);
    mechanic.status = status;
    return this.mechanicRepository.save(mechanic);
  }

  /**
   * I logically inactivate a mechanic to ensure past assigned maintenance history remains intact.
   */
  async inactivate(id: string): Promise<Mechanic> {
    return this.setStatus(id, Status.INACTIVE);
  }

  /**
   * I reactivate a previously inactivated mechanic.
   */
  async activate(id: string): Promise<Mechanic> {
    return this.setStatus(id, Status.ACTIVE);
  }
}

