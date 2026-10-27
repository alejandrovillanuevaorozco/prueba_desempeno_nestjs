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

/**
 * ExternalController
 * 
 * In this controller, I expose B2B integration endpoints designed for third-party
 * logistics partners and external auditing platforms.
 * 
 * Security Architecture:
 * 1. I apply @Public() so that the global JwtAuthGuard bypasses JWT bearer token verification.
 * 2. I apply @UseGuards(ApiKeyGuard) to enforce authentication through the 'x-api-key' request header.
 */
@ApiTags('External Integration (x-api-key)')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('external')
export class ExternalController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  /**
   * I retrieve the operational status and historical completed maintenance records
   * for a given vehicle license plate.
   */
  @Get('vehicles/:plate/history')
  @ApiHeader({
    name: 'x-api-key',
    description: 'External partner integration API Key (configured in API_KEYS)',
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
    // 1. I query the vehicle and completed maintenances via MaintenancesService
    const history = await this.maintenancesService.findVehicleHistory(plate);

    // 2. I shape the output specifically matching the PDF external partner contract format
    return {
      vehicle: {
        id: history.vehicle.id,
        plate: history.vehicle.plate,
        brand: history.vehicle.brand,
        model: history.vehicle.model,
        available: history.vehicle.status === 'AVAILABLE',
      },
      maintenances: history.maintenances.map((m) => ({
        id: m.id,
        type: m.type === 'PREVENTIVE' ? 'PREVENTIVO' : m.type === 'CORRECTIVE' ? 'CORRECTIVO' : m.type,
        status: m.status === 'COMPLETED' ? 'COMPLETADO' : m.status,
        description: m.description,
        mileage: Number(m.mileage),
        cost: Number(m.finalCost || 0),
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

