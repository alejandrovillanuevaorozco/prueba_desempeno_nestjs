import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

/**
 * UsersService
 * 
 * In this service, I manage user account persistence and lookups.
 * I ensure that email comparisons are case-insensitive and that sensitive
 * password hashes are only loaded when explicitly needed for authentication checks.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * I locate a user account by email. By default, I exclude the password hash
   * (select: false) to prevent accidental data leaks, but allow inclusion during login.
   */
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

  /**
   * I find a user by primary key UUID, eager-loading their associated mechanic profile.
   */
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

  /**
   * I persist a new user entity with a normalized lowercase email address.
   */
  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create({
      ...userData,
      email: userData.email?.toLowerCase().trim(),
    });
    return this.userRepository.save(user);
  }

  /**
   * I list all users along with their linked mechanic profiles.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: { mechanic: true },
    });
  }
}

