import { Controller } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaginationDto } from '../auth/dto/pagination.dto';

@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @MessagePattern('permissions.all')
  async getAllPermissions(@Payload() payload: any){
    const { data, context } = payload;

    return this.permissionsService.getAllPermissions(
      data as PaginationDto,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('permission.id')
  async getPermissionById(@Payload() payload: any){
    const { data, context } = payload;

    return this.permissionsService.getPermissionById(
      data.id,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('permission.create')
  async createPermission(@Payload() payload: any){
    const { data, context } = payload;

    return this.permissionsService.createPermission(
      data.dto,
      data.user,
      context.ip,
    );
  }

  @MessagePattern('permission.update')
  async updatePermission(@Payload() payload: any){
    const { data, context } = payload;

    return this.permissionsService.updatePermission(
      data.id,
      data.dto,
      data.user,
      context.ip,
    );
  }

  @MessagePattern('permission.delete')
  async deletePermission(@Payload() payload: any) {
    const { data, context } = payload;

    return this.permissionsService.deletePermission(
      data.id,
      data.user,
      context.ip,
    );
  }

  @MessagePattern('user.permissions.set') 
  set(@Payload() payload: any) {
    const { data, context } = payload;
    return this.permissionsService.setUserPermissions(data.dto, data.user, context.ip);
  }

  @MessagePattern('user.permissions.get')
  get(@Payload() payload: any) {
    const { data, context } = payload;
    return this.permissionsService.getUserPermissions(data.userId, context.userId, context.ip);
  }
}
