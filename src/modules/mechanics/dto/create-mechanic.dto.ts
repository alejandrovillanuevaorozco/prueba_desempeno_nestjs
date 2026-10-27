import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Status } from '../../../common/enums/status.enum.js';

export class CreateMechanicDto {
  @ApiProperty({ description: 'Mechanic full name', example: 'Carlos Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Mechanic email address', example: 'carlos.perez@fleetcore.com' })
  @IsEmail({}, { message: 'Invalid email address format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Mechanic technical specialty', example: 'Diesel Engines & Transmission' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiPropertyOptional({
    description: 'Initial mechanic status',
    enum: Status,
    default: Status.ACTIVE,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({
    description: 'Optional User UUID to associate this mechanic with a system TECHNICIAN login',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
