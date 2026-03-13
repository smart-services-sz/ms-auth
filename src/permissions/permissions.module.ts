import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { NatsModule } from '../nats/nats.module';
import { AuditPublisher } from '../utils/audit.publisher';

@Module({
  imports: [
    NatsModule,
  ],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    AuditPublisher,
  ],
})
export class PermissionsModule {}
