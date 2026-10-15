import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ListMunicipalitiesDto,
  MunicipalityConfigurationDto,
  MunicipalityIdDto,
} from './dto/municipality-configuration.dto';
import { MunicipalitiesService } from './municipalities.service';

type MunicipalityMessage<T> = {
  data: T;
  context: { userId: string; ip: string };
};

@Controller()
export class MunicipalitiesController {
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  @MessagePattern('municipalities.config.list')
  list(@Payload() payload: MunicipalityMessage<ListMunicipalitiesDto>) {
    return this.municipalitiesService.list(payload.data.includeInactive ?? false);
  }

  @MessagePattern('municipalities.config.get')
  get(@Payload() payload: MunicipalityMessage<MunicipalityIdDto>) {
    return this.municipalitiesService.get(payload.data.id);
  }

  @MessagePattern('municipalities.config.upsert')
  upsert(@Payload() payload: MunicipalityMessage<MunicipalityConfigurationDto>) {
    return this.municipalitiesService.upsert(
      payload.data,
      payload.context.userId,
      payload.context.ip,
    );
  }
}