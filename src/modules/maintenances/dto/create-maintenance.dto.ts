import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MaintenanceType } from '../../../common/enums/maintenance-type.enum.js';

export class CreateMaintenanceDto {
  @ApiProperty({
    description: 'Vehicle UUID to be serviced',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({
    description: 'Mechanic UUID assigned to perform the maintenance',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  @IsNotEmpty()
  mechanicId: string;

  @ApiProperty({
    description: 'Workshop UUID where the maintenance takes place',
    example: '33333333-3333-3333-3333-333333333333',
  })
  @IsUUID()
  @IsNotEmpty()
  workshopId: string;

  @ApiProperty({
    description: 'Type of maintenance operation',
    enum: MaintenanceType,
    example: MaintenanceType.PREVENTIVE,
  })
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @ApiProperty({
    description: 'Detailed description of scheduled maintenance task',
    example: 'Cambio de aceite y filtros de aire y combustible',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Vehicle odometer mileage at maintenance schedule time (cannot be less than current odometer)',
    example: 45000,
  })
  @IsNumber()
  @Min(0)
  mileage: number;

  @ApiProperty({
    description: 'Scheduled date and time in ISO 8601 format',
    example: '2026-11-01T08:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({
    description: 'Estimated duration in hours for the maintenance task (default: 2.0 hours)',
    example: 1.5,
    required: false,
  })
  @IsNumber()
  @Min(0.25)
  @IsOptional()
  estimatedDurationHours?: number;
}
