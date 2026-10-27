import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Status } from '../../../common/enums/status.enum.js';

export class CreateWorkshopDto {
  @ApiProperty({ description: 'Workshop business name', example: 'Taller Central FleetCore' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Workshop physical address', example: 'Av. Industrial #45-12, Bogotá' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    description: 'Initial workshop operational status',
    enum: Status,
    default: Status.ACTIVE,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
