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
import { Status } from '../../common/enums/status.enum.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { MechanicsService } from './mechanics.service.js';

/**
 * MechanicsController
 * 
 * In this controller, I expose endpoints to manage the fleet mechanic roster.
 * Administrative operations (creation, update, status toggling, logical inactivation)
 * require the ADMIN role, whereas queries are accessible across all authenticated roles.
 */
@ApiTags('Mechanics')
@ApiBearerAuth('JWT')
@Controller('mechanics')
export class MechanicsController {
  constructor(private readonly mechanicsService: MechanicsService) {}

  /**
   * I register a new mechanic in the catalog (ADMIN only).
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Register a new mechanic (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Mechanic registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async create(@Body() createMechanicDto: CreateMechanicDto) {
    return this.mechanicsService.create(createMechanicDto);
  }

  /**
   * I list all mechanics with optional filtering by operational status.
   */
  @Get()
  @ApiOperation({ summary: 'List all registered mechanics' })
  @ApiQuery({
    name: 'status',
    enum: Status,
    required: false,
    description: 'Filter mechanics by status (ACTIVE, INACTIVE)',
  })
  async findAll(@Query('status') status?: Status) {
    return this.mechanicsService.findAll(status);
  }

  /**
   * I retrieve a mechanic's profile details and maintenance history by their UUID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get mechanic details by ID' })
  @ApiResponse({ status: 200, description: 'Mechanic details' })
  @ApiResponse({ status: 404, description: 'Mechanic not found' })
  async findOne(@Param('id') id: string) {
    return this.mechanicsService.findById(id);
  }

  /**
   * I update a mechanic's information (ADMIN only).
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update mechanic details (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Mechanic updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateMechanicDto: UpdateMechanicDto,
  ) {
    return this.mechanicsService.update(id, updateMechanicDto);
  }

  /**
   * I manually modify a mechanic's operational status (ADMIN only).
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate or inactivate a mechanic (ADMIN only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: Status,
  ) {
    return this.mechanicsService.setStatus(id, status);
  }

  /**
   * I logically inactivate a mechanic without deleting historical maintenance records (ADMIN only).
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Logically inactivate a mechanic without deleting history (ADMIN only)',
  })
  async inactivate(@Param('id') id: string) {
    return this.mechanicsService.inactivate(id);
  }
}

