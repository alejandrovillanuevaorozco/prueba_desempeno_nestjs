import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { MaintenanceStatus } from '../common/enums/maintenance-status.enum.js';
import { MaintenanceType } from '../common/enums/maintenance-type.enum.js';
import { Role } from '../common/enums/role.enum.js';
import { Status } from '../common/enums/status.enum.js';
import { VehicleStatus } from '../common/enums/vehicle-status.enum.js';
import { Maintenance } from '../modules/maintenances/entities/maintenance.entity.js';
import { Mechanic } from '../modules/mechanics/entities/mechanic.entity.js';
import { User } from '../modules/users/entities/user.entity.js';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity.js';
import { Workshop } from '../modules/workshops/entities/workshop.entity.js';

async function runSeed() {
  const logger = new Logger('FleetCoreSeeder');
  logger.log('🌱 Starting idempotent database seeding...');

  // Initialize standalone DataSource with environment settings
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'fleetcore',
    entities: [User, Vehicle, Mechanic, Workshop, Maintenance],
    synchronize: true,
  });

  await dataSource.initialize();
  logger.log(' Connected to PostgreSQL database');

  try {
    const userRepository = dataSource.getRepository(User);
    const vehicleRepository = dataSource.getRepository(Vehicle);
    const mechanicRepository = dataSource.getRepository(Mechanic);
    const workshopRepository = dataSource.getRepository(Workshop);
    const maintenanceRepository = dataSource.getRepository(Maintenance);

    // 1. Seed Users (1 ADMIN, 2 TECHNICIAN)
    logger.log('--- 1. Seeding Users ---');
    const defaultPassword = await bcrypt.hash('FleetCore2026!', 10);

    const usersData = [
      {
        email: 'admin@fleetcore.com',
        password: defaultPassword,
        role: Role.ADMIN,
        isActive: true,
      },
      {
        email: 'technician1@fleetcore.com',
        password: defaultPassword,
        role: Role.TECHNICIAN,
        isActive: true,
      },
      {
        email: 'technician2@fleetcore.com',
        password: defaultPassword,
        role: Role.TECHNICIAN,
        isActive: true,
      },
    ];

    const seededUsers: Record<string, User> = {};
    for (const u of usersData) {
      let existing = await userRepository.findOne({ where: { email: u.email } });
      if (!existing) {
        existing = await userRepository.save(userRepository.create(u));
        logger.log(`Created user: ${u.email} (${u.role})`);
      } else {
        existing.password = u.password;
        existing.role = u.role;
        existing = await userRepository.save(existing);
        logger.log(`Updated user password & role: ${u.email}`);
      }
      seededUsers[u.email] = existing;
    }

    // 2. Seed Mechanics (2 active linked to technicians, 1 inactive)
    logger.log('--- 2. Seeding Mechanics ---');
    const mechanicsData = [
      {
        name: 'Carlos Pérez',
        email: 'carlos.perez@fleetcore.com',
        specialty: 'Diesel Engines & Transmission',
        status: Status.ACTIVE,
        userId: seededUsers['technician1@fleetcore.com'].id,
      },
      {
        name: 'Laura Gómez',
        email: 'laura.gomez@fleetcore.com',
        specialty: 'Brakes & Electrical Systems',
        status: Status.ACTIVE,
        userId: seededUsers['technician2@fleetcore.com'].id,
      },
      {
        name: 'Mario Restrepo',
        email: 'mario.restrepo@fleetcore.com',
        specialty: 'Suspension & Steering',
        status: Status.INACTIVE,
        userId: undefined,
      },
    ];

    const seededMechanics: Record<string, Mechanic> = {};
    for (const m of mechanicsData) {
      let existing = await mechanicRepository.findOne({ where: { email: m.email } });
      if (!existing) {
        existing = await mechanicRepository.save(mechanicRepository.create(m));
        logger.log(`Created mechanic: ${m.name} (${m.status})`);
      } else {
        existing.status = m.status;
        existing.userId = m.userId;
        existing = await mechanicRepository.save(existing);
        logger.log(`Updated mechanic: ${m.name}`);
      }
      seededMechanics[m.name] = existing;
    }

    // 3. Seed Workshops (1 active, 1 inactive)
    logger.log('--- 3. Seeding Workshops ---');
    const workshopsData = [
      {
        name: 'Taller Central FleetCore',
        address: 'Av. Industrial #45-12, Bogotá',
        status: Status.ACTIVE,
      },
      {
        name: 'Taller Auxiliar Sur',
        address: 'Calle 68 Sur #10-40, Soacha',
        status: Status.INACTIVE,
      },
    ];

    const seededWorkshops: Record<string, Workshop> = {};
    for (const w of workshopsData) {
      let existing = await workshopRepository.findOne({ where: { name: w.name } });
      if (!existing) {
        existing = await workshopRepository.save(workshopRepository.create(w));
        logger.log(`Created workshop: ${w.name} (${w.status})`);
      } else {
        logger.log(`Workshop already exists: ${w.name}`);
      }
      seededWorkshops[w.name] = existing;
    }

    // 4. Seed Vehicles (2 AVAILABLE, 1 IN_MAINTENANCE, 1 INACTIVE)
    logger.log('--- 4. Seeding Vehicles ---');
    const vehiclesData = [
      {
        plate: 'ABC123',
        brand: 'Chevrolet',
        model: 'NPR',
        year: 2022,
        mileage: 45000,
        status: VehicleStatus.AVAILABLE,
      },
      {
        plate: 'XYZ789',
        brand: 'Hino',
        model: 'Dutro',
        year: 2021,
        mileage: 62000,
        status: VehicleStatus.AVAILABLE,
      },
      {
        plate: 'DEF456',
        brand: 'Kenworth',
        model: 'T680',
        year: 2023,
        mileage: 83000,
        status: VehicleStatus.IN_MAINTENANCE,
      },
      {
        plate: 'OLD001',
        brand: 'Ford',
        model: 'Cargo',
        year: 2010,
        mileage: 310000,
        status: VehicleStatus.INACTIVE,
      },
    ];

    const seededVehicles: Record<string, Vehicle> = {};
    for (const v of vehiclesData) {
      let existing = await vehicleRepository.findOne({ where: { plate: v.plate } });
      if (!existing) {
        existing = await vehicleRepository.save(vehicleRepository.create(v));
        logger.log(`Created vehicle: ${v.plate} (${v.status})`);
      } else {
        existing.status = v.status;
        existing.mileage = v.mileage;
        existing = await vehicleRepository.save(existing);
        logger.log(`Updated vehicle: ${v.plate} (${v.status})`);
      }
      seededVehicles[v.plate] = existing;
    }

    // 5. Seed Maintenances (At least 1 COMPLETED for history, 1 IN_PROGRESS for DEF456)
    logger.log('--- 5. Seeding Maintenances ---');

    // 5a. Completed maintenance for vehicle ABC123
    const compVehicle = seededVehicles['ABC123'];
    const compMechanic = seededMechanics['Carlos Pérez'];
    const activeWorkshop = seededWorkshops['Taller Central FleetCore'];

    let existingCompleted = await maintenanceRepository.findOne({
      where: {
        vehicleId: compVehicle.id,
        status: MaintenanceStatus.COMPLETED,
      },
    });

    if (!existingCompleted) {
      await maintenanceRepository.save(
        maintenanceRepository.create({
          vehicleId: compVehicle.id,
          mechanicId: compMechanic.id,
          workshopId: activeWorkshop.id,
          type: MaintenanceType.PREVENTIVE,
          status: MaintenanceStatus.COMPLETED,
          description: 'Cambio de aceite y filtros de 40.000 km',
          mileage: 40000,
          scheduledDate: new Date('2026-09-15T08:00:00.000Z'),
          workDone:
            'Cambio completo de aceite sintético 15W-40, filtro de aceite y filtro de combustible. Revisión de frenos.',
          finalCost: 350000,
          completedAt: new Date('2026-09-15T16:30:00.000Z'),
          finalMileage: 40050,
        }),
      );
      logger.log('Created COMPLETED historical maintenance for ABC123');
    } else {
      logger.log('Historical COMPLETED maintenance already exists for ABC123');
    }

    // 5b. IN_PROGRESS maintenance for vehicle DEF456 (status IN_MAINTENANCE)
    const inProgVehicle = seededVehicles['DEF456'];
    const inProgMechanic = seededMechanics['Laura Gómez'];

    let existingInProgress = await maintenanceRepository.findOne({
      where: {
        vehicleId: inProgVehicle.id,
        status: MaintenanceStatus.IN_PROGRESS,
      },
    });

    if (!existingInProgress) {
      await maintenanceRepository.save(
        maintenanceRepository.create({
          vehicleId: inProgVehicle.id,
          mechanicId: inProgMechanic.id,
          workshopId: activeWorkshop.id,
          type: MaintenanceType.CORRECTIVE,
          status: MaintenanceStatus.IN_PROGRESS,
          description: 'Reparación del sistema de inyección y calibración electrónica',
          mileage: 83000,
          scheduledDate: new Date('2026-10-25T08:00:00.000Z'),
        }),
      );
      logger.log('Created IN_PROGRESS active maintenance for DEF456');
    } else {
      logger.log('IN_PROGRESS maintenance already exists for DEF456');
    }

    logger.log('🎉 Idempotent seeding completed successfully! All records verified.');
  } catch (error) {
    logger.error('❌ Error during seeding execution:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

runSeed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
