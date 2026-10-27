import {
  Body,
  Controller,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-status.dto.js';
import { MaintenancesService } from './maintenances.service.js';

@ApiTags('Maintenances')
@ApiBearerAuth('JWT')
@Controller('maintenances')
export class MaintenancesController {
  /**
   * I inject MaintenancesService to delegate all business decisions,
   * keeping this controller thin and focused purely on HTTP routing and Swagger docs.
   */
  constructor(private readonly maintenancesService: MaintenancesService) {}

  /**
   * I expose an endpoint to schedule new maintenance operations.
   * I restrict this action strictly to the ADMIN role using @Roles(Role.ADMIN).
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Schedule a new maintenance operation (ADMIN only)',
    description:
      'Enforces business constraints: vehicle and mechanic availability, active workshops, and non-decreasing mileage.',
  })
  @ApiResponse({ status: 201, description: 'Maintenance scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Domain rule violation (e.g. inactive vehicle/mechanic)' })
  @ApiResponse({ status: 409, description: 'Conflict: Vehicle or mechanic already active' })
  async create(@Body() createDto: CreateMaintenanceDto) {
    return this.maintenancesService.create(createDto);
  }

  /**
   * I expose an endpoint allowing authenticated users to list all maintenance jobs,
   * optionally filtering by status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED).
   */
  @Get()
  @ApiOperation({ summary: 'List all maintenance records' })
  @ApiQuery({
    name: 'status',
    enum: MaintenanceStatus,
    required: false,
    description: 'Filter by maintenance status',
  })
  async findAll(@Query('status') status?: MaintenanceStatus) {
    return this.maintenancesService.findAll({ status });
  }

  /**
   * I expose a specialized endpoint returning active operations only
   * (records in SCHEDULED or IN_PROGRESS status).
   */
  @Get('active')
  @ApiOperation({ summary: 'List all active maintenances (SCHEDULED or IN_PROGRESS)' })
  @ApiResponse({ status: 200, description: 'Active fleet maintenances list' })
  async findActive() {
    return this.maintenancesService.findActive();
  }

  /**
   * I allow technicians to inspect only the jobs assigned to their linked mechanic profile.
   * I extract the logged-in user payload using my custom @CurrentUser() decorator.
   */
  @Get('my-tasks')
  @Roles(Role.TECHNICIAN, Role.ADMIN)
  @ApiOperation({
    summary: 'List maintenances assigned to the authenticated technician',
  })
  async findMyTasks(@CurrentUser() user: any) {
    if (user.mechanicId) {
      return this.maintenancesService.findByMechanic(user.mechanicId);
    }
    return [];
  }

  /**
   * I allow querying all maintenance history associated with a specific vehicle UUID.
   */
  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'List all maintenances for a specific vehicle' })
  async findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.maintenancesService.findByVehicle(vehicleId);
  }

  /**
   * I provide an audit endpoint to retrieve completed maintenance records
   * for a given vehicle by either its UUID or license plate.
   */
  @Get('vehicle/:identifier/history')
  @ApiOperation({
    summary: 'Retrieve historical completed maintenances of a vehicle by ID or plate',
  })
  @ApiResponse({ status: 200, description: 'Historical maintenance audit trail' })
  async findVehicleHistory(@Param('identifier') identifier: string) {
    return this.maintenancesService.findVehicleHistory(identifier);
  }

  /**
   * I allow listing all maintenance operations dispatched to a particular mechanic.
   */
  @Get('mechanic/:mechanicId')
  @ApiOperation({ summary: 'List all maintenances assigned to a specific mechanic' })
  async findByMechanic(@Param('mechanicId') mechanicId: string) {
    return this.maintenancesService.findByMechanic(mechanicId);
  }

  /**
   * I retrieve the detailed breakdown of a single maintenance job by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve maintenance details by ID' })
  @ApiResponse({ status: 200, description: 'Maintenance record details' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  async findOne(@Param('id') id: string) {
    return this.maintenancesService.findById(id);
  }

  /**
   * I expose the endpoint to advance or cancel maintenance states.
   * Permitted for both ADMIN and TECHNICIAN roles.
   * I pass the currentUser object to the service to enforce that technicians
   * can only update their own assigned maintenance tasks.
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @ApiOperation({
    summary: 'Transition maintenance state machine (ADMIN, TECHNICIAN)',
    description:
      'Transitions: SCHEDULED -> IN_PROGRESS (vehicle becomes IN_MAINTENANCE), IN_PROGRESS -> COMPLETED (requires closure data, vehicle becomes AVAILABLE), or CANCELLED.',
  })
  @ApiResponse({ status: 200, description: 'Status updated and vehicle state synchronized' })
  @ApiResponse({ status: 400, description: 'Invalid state transition or missing closure fields' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenancesService.updateStatus(id, dto, user);
  }
}
