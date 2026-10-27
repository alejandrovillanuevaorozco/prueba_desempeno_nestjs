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
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { WorkshopsService } from './workshops.service.js';

@ApiTags('Workshops')
@ApiBearerAuth('JWT')
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Register a new maintenance workshop (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Workshop created successfully' })
  async create(@Body() createWorkshopDto: CreateWorkshopDto) {
    return this.workshopsService.create(createWorkshopDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all workshops with optional status filter' })
  @ApiQuery({
    name: 'status',
    enum: Status,
    required: false,
    description: 'Filter by status (ACTIVE, INACTIVE)',
  })
  async findAll(@Query('status') status?: Status) {
    return this.workshopsService.findAll(status);
  }

  @Get('active')
  @ApiOperation({ summary: 'List all active workshops ready for assignments' })
  @ApiResponse({ status: 200, description: 'Active workshops list' })
  async findActive() {
    return this.workshopsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workshop details by ID' })
  @ApiResponse({ status: 200, description: 'Workshop details' })
  @ApiResponse({ status: 404, description: 'Workshop not found' })
  async findOne(@Param('id') id: string) {
    return this.workshopsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update workshop information (ADMIN only)' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkshopDto: UpdateWorkshopDto,
  ) {
    return this.workshopsService.update(id, updateWorkshopDto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate or inactivate a workshop (ADMIN only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: Status,
  ) {
    return this.workshopsService.setStatus(id, status);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Logically inactivate a workshop without deleting historical data (ADMIN only)',
  })
  async inactivate(@Param('id') id: string) {
    return this.workshopsService.inactivate(id);
  }
}
