import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Maintenance } from '../modules/maintenances/entities/maintenance.entity.js';
import { Mechanic } from '../modules/mechanics/entities/mechanic.entity.js';
import { User } from '../modules/users/entities/user.entity.js';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity.js';
import { Workshop } from '../modules/workshops/entities/workshop.entity.js';

/**
 * Database Configuration Factory
 * 
 * In this factory function, I load PostgreSQL database connection parameters from
 * environment variables, register the TypeORM domain entities, and configure logging.
 */
export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_NAME', 'fleetcore'),
  entities: [User, Vehicle, Mechanic, Workshop, Maintenance],
  synchronize: true, // Automatically synchronize schema in evaluation environment
  logging: configService.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
});

