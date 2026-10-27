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

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(Mechanic)
    private readonly mechanicRepository: Repository<Mechanic>,
  ) {}

  async create(createMechanicDto: CreateMechanicDto): Promise<Mechanic> {
    const formattedEmail = createMechanicDto.email.toLowerCase().trim();

    const existing = await this.mechanicRepository.findOne({
      where: { email: formattedEmail },
    });

    if (existing) {
      throw new ConflictException(
        `Mechanic with email '${formattedEmail}' already exists`,
      );
    }

    const mechanic = this.mechanicRepository.create({
      ...createMechanicDto,
      email: formattedEmail,
      status: createMechanicDto.status || Status.ACTIVE,
    });

    return this.mechanicRepository.save(mechanic);
  }

  async findAll(status?: Status): Promise<Mechanic[]> {
    const where = status ? { status } : {};
    return this.mechanicRepository.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

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

  async findByUserId(userId: string): Promise<Mechanic | null> {
    return this.mechanicRepository.findOne({
      where: { userId },
      relations: { maintenances: true },
    });
  }

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

  async setStatus(id: string, status: Status): Promise<Mechanic> {
    const mechanic = await this.findById(id);
    mechanic.status = status;
    return this.mechanicRepository.save(mechanic);
  }

  async inactivate(id: string): Promise<Mechanic> {
    return this.setStatus(id, Status.INACTIVE);
  }

  async activate(id: string): Promise<Mechanic> {
    return this.setStatus(id, Status.ACTIVE);
  }
}
