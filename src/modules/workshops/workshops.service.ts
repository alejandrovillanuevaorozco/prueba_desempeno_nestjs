import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status } from '../../common/enums/status.enum.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Workshop } from './entities/workshop.entity.js';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
  ) {}

  async create(createWorkshopDto: CreateWorkshopDto): Promise<Workshop> {
    const workshop = this.workshopRepository.create({
      ...createWorkshopDto,
      status: createWorkshopDto.status || Status.ACTIVE,
    });
    return this.workshopRepository.save(workshop);
  }

  async findAll(status?: Status): Promise<Workshop[]> {
    const where = status ? { status } : {};
    return this.workshopRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<Workshop[]> {
    return this.findAll(Status.ACTIVE);
  }

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

  async update(id: string, updateWorkshopDto: UpdateWorkshopDto): Promise<Workshop> {
    const workshop = await this.findById(id);
    Object.assign(workshop, updateWorkshopDto);
    return this.workshopRepository.save(workshop);
  }

  async setStatus(id: string, status: Status): Promise<Workshop> {
    const workshop = await this.findById(id);
    workshop.status = status;
    return this.workshopRepository.save(workshop);
  }

  async inactivate(id: string): Promise<Workshop> {
    return this.setStatus(id, Status.INACTIVE);
  }

  async activate(id: string): Promise<Workshop> {
    return this.setStatus(id, Status.ACTIVE);
  }
}
