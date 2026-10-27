import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MaintenanceStatus } from '../../../common/enums/maintenance-status.enum.js';

export class UpdateMaintenanceStatusDto {
  @ApiProperty({
    description: 'Target maintenance status',
    enum: MaintenanceStatus,
    example: MaintenanceStatus.IN_PROGRESS,
  })
  @IsEnum(MaintenanceStatus)
  @IsNotEmpty()
  status: MaintenanceStatus;

  @ApiPropertyOptional({
    description: 'Work done summary (mandatory when transitioning to COMPLETED)',
    example: 'Reemplazo de pastillas de freno delanteras y purgado de líquido',
  })
  @IsOptional()
  @IsString()
  workDone?: string;

  @ApiPropertyOptional({
    description: 'Total final invoice cost (mandatory when transitioning to COMPLETED)',
    example: 480000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalCost?: number;

  @ApiPropertyOptional({
    description: 'Date and time of completion in ISO format (mandatory when COMPLETED)',
    example: '2026-11-01T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Final odometer mileage reading upon completion (must be >= initial mileage)',
    example: 45050,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalMileage?: number;
}
