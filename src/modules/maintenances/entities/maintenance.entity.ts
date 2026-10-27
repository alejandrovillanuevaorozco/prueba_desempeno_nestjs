import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaintenanceStatus } from '../../../common/enums/maintenance-status.enum.js';
import { MaintenanceType } from '../../../common/enums/maintenance-type.enum.js';
import type { Mechanic } from '../../mechanics/entities/mechanic.entity.js';
import type { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import type { Workshop } from '../../workshops/entities/workshop.entity.js';

@Entity('maintenances')
@Index(['vehicleId', 'status'])
@Index(['mechanicId', 'status'])
@Index(['scheduledDate'])
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MaintenanceType,
  })
  type: MaintenanceType;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  mileage: number;

  @Column({ type: 'timestamp with time zone' })
  scheduledDate: Date;

  // Completion fields (required when status transitions to COMPLETED)
  @Column({ type: 'text', nullable: true })
  workDone?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  finalCost?: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalMileage?: number;

  // Relations with ON DELETE RESTRICT to protect audit & historical data
  @ManyToOne('Vehicle', 'maintenances', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId: string;

  @ManyToOne('Mechanic', 'maintenances', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: Mechanic;

  @Column({ name: 'mechanic_id' })
  mechanicId: string;

  @ManyToOne('Workshop', 'maintenances', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop;

  @Column({ name: 'workshop_id' })
  workshopId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
