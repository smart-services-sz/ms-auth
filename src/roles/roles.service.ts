import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { AuditPublisher } from '../utils/audit.publisher';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { AuditLevel } from '../auth/dto/audit-event.dto';
import { JwtUser } from '../common/decorators/current-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignUserRolesDto } from './dto/assign-user-role.dto';


@Injectable()
export class RolesService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('NATS_CLIENT')
        private readonly natsClient: ClientProxy,
        private readonly audit: AuditPublisher,
    ){}

  async getAllRoles(
    pagination: PaginationDto,
    performedBy: string,
    ip: string,
  ){
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const skip = (page - 1) * limit;

    const search = (pagination.search || '').trim();

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count(),
    ]);

    this.audit.log({
      action: 'ROLE_LIST_VIEWED',
      entity: 'Rol',
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
      metadata: { page, limit },
    });

    return {
      data,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRoleById(
    id: string,
    performedBy: string,
    ip: string,
  ){
    const role = await this.prisma.role.findUnique({
      where: {
        id,
      },
    });

    if(!role){
      throw new RpcException({
        statusCode: 404,
        message: 'Rol no encontrado',
      });
    }

    this.audit.log({
      action: 'ROLE_VIEWED',
      entity: 'Rol',
      entityId: id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
    });

    return role;
  }

  async createRole(
    dto: CreateRoleDto,
    user: JwtUser,
    ip: string
  ){
    try {

      const exist = await this.prisma.role.findUnique({
        where: {
          name: dto.name,
        },
      });

      if(exist){
        throw new RpcException({
          statusCode: 404,
          message: 'Ya existe un rol con este nombre',
        });
      }
      
      const role = await this.prisma.role.create({
        data: {
          name: dto.name,
        },
      });

      this.audit.log({
        action: 'ROLE_CREATED',
        entity: 'Rol',
        entityId: role.id,
        performedBy: user.userId,
        ipAddress: ip,
        level: AuditLevel.INFO,
        metadata: { role },
      });

      return role;
    } catch (error) {

      this.audit.log({
        action: 'ROLE_CREATE_FAILED',
        entity: 'Rol',
        performedBy: user?.userId,
        ipAddress: ip,
        level: AuditLevel.ERROR,
        metadata: { error: error.message },
      });

      throw new RpcException({
        statusCode: 400,
        message: 'Error al crear rol: ' + error.message,
      });
    }
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    user: JwtUser,
    ip: string,
  ){
    try {

      const exist = await this.prisma.role.findUnique({
        where: {
          name: dto.name,
        },
      });

      if(exist){
        throw new RpcException({
          statusCode: 404,
          message: 'Ya existe un rol con este nombre',
        });
      }

      const role = await this.prisma.role.update({
        data: {
          name: dto.name,
        },
        where: {
          id
        },
      });

      this.audit.log({
        action: 'ROLE_UPDATED',
        entity: 'Rol',
        entityId: role.id,
        performedBy: user.userId,
        ipAddress: ip,
        level: AuditLevel.INFO,
        metadata: { role },
      });

      return role;
    } catch (error) {
      
      this.audit.log({
        action: 'ROLE_UPDATE_FAILED',
        entity: 'Rol',
        performedBy: user?.userId,
        ipAddress: ip,
        level: AuditLevel.ERROR,
        metadata: { error: error.message },
      });

      throw new RpcException({
        statusCode: 400,
        message: 'Error al actualizar rol: ' + error.message,
      });
    }
  }

  async getUserRoles(userId: string, performedBy: string, ip: string) {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { role: { name: 'asc' } },
    });

    this.audit.log({
      action: 'USER_ROLES_VIEWED',
      entity: 'User',
      entityId: userId,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
    });

    return rows.map(r => r.role); 
  }

  async setUserRoles(dto: AssignUserRolesDto, user: JwtUser, ip: string) {
    // Validar user existe
    const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!target) {
      throw new RpcException({ statusCode: 404, message: 'Usuario no encontrado' });
    }

    // Validar roles existen
    const perms = await this.prisma.role.findMany({
      where: { id: { in: dto.rolesIds } },
      select: { id: true, name: true },
    });

    if (perms.length !== dto.rolesIds.length) {
      throw new RpcException({
        statusCode: 400,
        message: 'Uno o más roles no existen',
      });
    }

    // SET absoluto: borra y recrea
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: dto.userId } }),
      this.prisma.userRole.createMany({
        data: dto.rolesIds.map(roleId => ({
          userId: dto.userId,
          roleId,
        })),
        skipDuplicates: true,
      }),
    ]);

    this.audit.log({
      action: 'USER_ROLES_UPDATED',
      entity: 'User',
      entityId: dto.userId,
      performedBy: user.userId,
      ipAddress: ip,
      level: AuditLevel.INFO,
      metadata: { permissionIds: dto.rolesIds },
    });

    // devolvemos permisos para refrescar UI
    return this.getUserRoles(dto.userId, user.userId, ip);
  }
}
