import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehiclesService } from './vehicles.service.js';

/**
 * VehiclesController
 * 
 * In this controller, I expose endpoints to manage fleet vehicle assets.
 * Mutation endpoints (creation, specification update, status change, soft-inactivation)
 * are restricted to the ADMIN role, while inquiry endpoints are accessible to all authenticated staff.
 */
@ApiTags('Vehicles')
@ApiBearerAuth('JWT')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /**
   * I register a new vehicle into the fleet database (ADMIN only).
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Register a new fleet vehicle (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Vehicle registered successfully' })
  @ApiResponse({ status: 409, description: 'License plate already registered' })
  async create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  /**
   * I list all fleet vehicles, supporting an optional status query filter.
   */
  @Get()
  @ApiOperation({ summary: 'List all registered fleet vehicles' })
  @ApiQuery({
    name: 'status',
    enum: VehicleStatus,
    required: false,
    description: 'Filter by vehicle status',
  })
  async findAll(@Query('status') status?: VehicleStatus) {
    return this.vehiclesService.findAll(status);
  }

  /**
   * I retrieve details of a specific vehicle by its UUID or license plate.
   */
  @Get(':identifier')
  @ApiOperation({ summary: 'Retrieve vehicle details by UUID or license plate' })
  @ApiResponse({ status: 200, description: 'Vehicle details with maintenance history' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('identifier') identifier: string) {
    return this.vehiclesService.findByIdOrPlate(identifier);
  }

  /**
   * I update vehicle specifications such as mileage or model (ADMIN only).
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update vehicle specifications (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  /**
   * I manually update vehicle operational status (ADMIN only).
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update vehicle status (ADMIN only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: VehicleStatus,
  ) {
    return this.vehiclesService.setStatus(id, status);
  }

  /**
   * I logically inactivate a vehicle without destroying historical records (ADMIN only).
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Logically inactivate a vehicle without deleting historical data (ADMIN only)',
  })
  @ApiResponse({ status: 200, description: 'Vehicle status set to INACTIVE' })
  async inactivate(@Param('id') id: string) {
    return this.vehiclesService.inactivate(id);
  }
}

