import { Module } from '@nestjs/common';
import { NatsModule } from '../nats/nats.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditPublisher } from '../utils/audit.publisher';
import { MunicipalitiesController } from './municipalities.controller';
import { MunicipalitiesService } from './municipalities.service';

@Module({
  imports: [NatsModule, PrismaModule],
  controllers: [MunicipalitiesController],
  providers: [MunicipalitiesService, AuditPublisher],
})
export class MunicipalitiesModule {}