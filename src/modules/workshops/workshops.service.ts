import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status } from '../../common/enums/status.enum.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Workshop } from './entities/workshop.entity.js';

/**
 * WorkshopsService
 * 
 * In this service, I manage physical and contractor maintenance repair shops.
 * I maintain the workshop catalog, manage operational statuses, and ensure only
 * active workshops can be assigned to new vehicle maintenance orders.
 */
@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
  ) {}

  /**
   * I register a new maintenance workshop in the system with default status ACTIVE.
   */
  async create(createWorkshopDto: CreateWorkshopDto): Promise<Workshop> {
    const workshop = this.workshopRepository.create({
      ...createWorkshopDto,
      status: createWorkshopDto.status || Status.ACTIVE,
    });
    return this.workshopRepository.save(workshop);
  }

  /**
   * I retrieve all registered workshops, optionally filtered by operational status.
   */
  async findAll(status?: Status): Promise<Workshop[]> {
    const where = status ? { status } : {};
    return this.workshopRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * I query only workshops currently marked as ACTIVE, suitable for immediate maintenance assignment.
   */
  async findActive(): Promise<Workshop[]> {
    return this.findAll(Status.ACTIVE);
  }

  /**
   * I find a workshop by its UUID, eager-loading related maintenance orders.
   */
  async findById(id: string): Promise<Workshop> {
    const workshop = await this.workshopRepository.findOne({
      where: { id },
      relations: { maintenances: true },
    });

    if (!workshop) {
      throw new NotFoundException(`Workshop with ID '${id}' not found`);
    }

    return workshop;
  }

  /**
   * I update workshop details (e.g. name, location, contact phone).
   */
  async update(id: string, updateWorkshopDto: UpdateWorkshopDto): Promise<Workshop> {
    const workshop = await this.findById(id);
    Object.assign(workshop, updateWorkshopDto);
    return this.workshopRepository.save(workshop);
  }

  /**
   * I update a workshop's operational status (ACTIVE/INACTIVE).
   */
  async setStatus(id: string, status: Status): Promise<Workshop> {
    const workshop = await this.findById(id);
    workshop.status = status;
    return this.workshopRepository.save(workshop);
  }

  /**
   * I logically inactivate a workshop so no new orders can be dispatched to it,
   * while keeping all historical maintenance invoices and records intact.
   */
  async inactivate(id: string): Promise<Workshop> {
    return this.setStatus(id, Status.INACTIVE);
  }

  /**
   * I reactivate a previously inactivated workshop facility.
   */
  async activate(id: string): Promise<Workshop> {
    return this.setStatus(id, Status.ACTIVE);
  }
}

