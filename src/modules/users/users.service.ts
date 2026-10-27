import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .leftJoinAndSelect('user.mechanic', 'mechanic');

    if (includePassword) {
      query.addSelect('user.password');
    }

    return query.getOne();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { mechanic: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create({
      ...userData,
      email: userData.email?.toLowerCase().trim(),
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: { mechanic: true },
    });
  }
}
