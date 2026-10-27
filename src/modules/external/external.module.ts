import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from '../../common/guards/api-key.guard.js';
import { MaintenancesModule } from '../maintenances/maintenances.module.js';
import { ExternalController } from './external.controller.js';

@Module({
  imports: [ConfigModule, MaintenancesModule],
  controllers: [ExternalController],
  providers: [ApiKeyGuard],
})
export class ExternalModule {}
