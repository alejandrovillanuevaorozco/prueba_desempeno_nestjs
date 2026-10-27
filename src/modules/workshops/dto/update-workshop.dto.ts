import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Status } from '../../../common/enums/status.enum.js';

export class UpdateWorkshopDto {
  @ApiPropertyOptional({ description: 'Workshop name', example: 'Taller Norte FleetCore' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Physical address', example: 'Calle 100 #15-20' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Workshop status',
    enum: Status,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
