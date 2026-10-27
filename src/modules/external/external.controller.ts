import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiKeyGuard } from '../../common/guards/api-key.guard.js';
import { MaintenancesService } from '../maintenances/maintenances.service.js';

@ApiTags('External Integration (x-api-key)')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('external')
export class ExternalController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Get('vehicles/:plate/history')
  @ApiHeader({
    name: 'x-api-key',
    description: 'External partner integration API Key',
    required: true,
  })
  @ApiOperation({
    summary: 'Partner endpoint: Fetch vehicle status and historical completed maintenances',
    description: 'Secured via x-api-key authentication for third-party B2B integrations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle info with completed maintenance list',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid x-api-key' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicleHistory(@Param('plate') plate: string) {
    const history = await this.maintenancesService.findVehicleHistory(plate);

    return {
      vehicle: {
        id: history.vehicle.id,
        plate: history.vehicle.plate,
        brand: history.vehicle.brand,
        model: history.vehicle.model,
        mileage: history.vehicle.mileage,
        status: history.vehicle.status,
        available: history.vehicle.status === 'AVAILABLE',
      },
      maintenances: history.maintenances.map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        description: m.description,
        mileage: m.mileage,
        cost: m.finalCost,
        finishedAt: m.completedAt,
        mechanic: {
          id: m.mechanic?.id,
          name: m.mechanic?.name,
        },
        workshop: {
          id: m.workshop?.id,
          name: m.workshop?.name,
        },
      })),
    };
  }
}
