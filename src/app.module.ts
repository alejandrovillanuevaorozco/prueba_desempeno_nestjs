import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { getDatabaseConfig } from './config/database.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ExternalModule } from './modules/external/external.module.js';
import { MaintenancesModule } from './modules/maintenances/maintenances.module.js';
import { MechanicsModule } from './modules/mechanics/mechanics.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { WorkshopsModule } from './modules/workshops/workshops.module.js';

/**
 * AppModule
 * 
 * In this root module, I assemble the modular architecture of the FleetCore system.
 * I register global pipes, database configuration, feature domain modules, and
 * global infrastructure providers:
 * - APP_GUARD (JwtAuthGuard): Protects all endpoints by default unless annotated with @Public().
 * - APP_GUARD (RolesGuard): Validates required user roles against metadata from @Roles().
 * - APP_INTERCEPTOR (TransformInterceptor): Enforces a uniform { success, statusCode, data, timestamp } response envelope.
 * - APP_FILTER (HttpExceptionFilter): Intercepts all application and database exceptions cleanly.
 */
@Module({
  imports: [
    // 1. I configure environment variables globally across all modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 2. I configure asynchronous TypeORM database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    // 3. Domain feature modules
    AuthModule,
    UsersModule,
    VehiclesModule,
    MechanicsModule,
    WorkshopsModule,
    MaintenancesModule,
    ExternalModule,
  ],
  providers: [
    // 4. Global security guards and response lifecycle handlers
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}

