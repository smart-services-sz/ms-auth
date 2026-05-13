import { Controller } from '@nestjs/common';
import { RolesService } from './roles.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaginationDto } from '../auth/dto/pagination.dto';

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @MessagePattern('roles.all')
  async getAllPermissions(@Payload() payload: any){
    const { data, context } = payload;

    return this.rolesService.getAllRoles(
      data as PaginationDto,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('roles.id')
  async getRoleById(@Payload() payload: any){
    const { data, context } = payload;

    return this.rolesService.getRoleById(
      data.id,
      context.userId,
      context.ip,
    );
  }

  @MessagePattern('roles.create')
  async createRole(@Payload() payload: any){
    const { data, context } = payload;

    return this.rolesService.createRole(
      data.dto,
      data.user,
      context.ip,
    );
  }

  @MessagePattern('roles.update')
  async updateRole(@Payload() payload: any){
    const { data, context } = payload;

    return this.rolesService.updateRole(
      data.id,
      data.dto,
      data.user,
      context.ip,
    );
  }

  @MessagePattern('roles.delete')
  async deleteRole(@Payload() payload: any) {
    const { data, context } = payload;

    return this.rolesService.deleteRole(
      data.id,
      data.user,
      context.ip,
    );
  }

  
  @MessagePattern('user.roles.set') // set absoluto (reemplaza)
  set(@Payload() payload: any) {
    const { data, context } = payload; // { dto, user } etc
    return this.rolesService.setUserRoles(data.dto, data.user, context.ip);
  }

  @MessagePattern('user.roles.get')
  get(@Payload() payload: any) {
    const { data, context } = payload;
    return this.rolesService.getUserRoles(data.userId, context.userId, context.ip);
  }

  @MessagePattern('role.permissions.get')
  getRolePermissions(@Payload() payload: any) {
    const { data, context } = payload;
    return this.rolesService.getRolePermissions(data.roleId, context.userId, context.ip);
  }

  @MessagePattern('role.permissions.set')
  setRolePermissions(@Payload() payload: any) {
    const { data, context } = payload;
    return this.rolesService.setRolePermissions(data.dto, data.user, context.ip);
  }
}
