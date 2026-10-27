import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../../../common/enums/vehicle-status.enum.js';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Unique vehicle license plate (letters and numbers, will be stored uppercase)',
    example: 'ABC123',
  })
  @IsString()
  @IsNotEmpty()
  plate: string;

  @ApiProperty({ description: 'Vehicle manufacturer brand', example: 'Chevrolet' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ description: 'Vehicle model', example: 'NPR' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ description: 'Manufacturing year', example: 2022 })
  @IsInt()
  @Min(1900)
  year: number;

  @ApiProperty({ description: 'Current odometer mileage in km', example: 45000 })
  @IsNumber()
  @Min(0)
  mileage: number;

  @ApiProperty({
    description: 'Initial vehicle status',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE,
    required: false,
  })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
