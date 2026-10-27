import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Status } from '../../../common/enums/status.enum.js';

export class UpdateMechanicDto {
  @ApiPropertyOptional({ description: 'Mechanic full name', example: 'Carlos Pérez' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Mechanic email address', example: 'carlos.perez@fleetcore.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Technical specialty', example: 'Brakes & Suspension' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({
    description: 'Mechanic status',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({
    description: 'Associated User UUID',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
