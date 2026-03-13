import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { AuditPublisher } from '../utils/audit.publisher';
import { NatsModule } from '../nats/nats.module';

@Module({
  imports: [
    NatsModule,
  ],
  controllers: [RolesController],
  providers: [
    RolesService,
    AuditPublisher,
  ],
})
export class RolesModule {}
