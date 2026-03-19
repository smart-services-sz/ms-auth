import { Inject, Injectable } from '@nestjs/common';
import { PaginationDto } from '../auth/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { AuditPublisher } from '../utils/audit.publisher';
import { AuditLevel } from '../auth/dto/audit-event.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { JwtUser } from '../common/decorators/current-user.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AssignUserPermissionsDto } from './dto/assign-user-permissions.dto';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_CLIENT')
    private readonly natsClient: ClientProxy,
    private readonly audit: AuditPublisher,
  ){}

  async getAllPermissions(
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
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.permission.count(),
    ]);

    this.audit.log({
      action: 'PERM_LIST_VIEWED',
      entity: 'Permiso',
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

  async getPermissionById(
    id: string,
    performedBy: string,
    ip: string,
  ){
    const permission = await this.prisma.permission.findUnique({
      where: {
        id,
      },
    });

    if(!permission){
      throw new RpcException({
        statusCode: 404,
        message: 'Permiso no encontrado',
      });
    }

    this.audit.log({
      action: 'PERM_VIEWED',
      entity: 'Permiso',
      entityId: id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
    });

    return permission;
  }

  async createPermission(
    dto: CreatePermissionDto,
    user: JwtUser,
    ip: string
  ){
    try {

      const exist = await this.prisma.permission.findUnique({
        where: {
          name: dto.name,
        },
      });

      if(exist){
        throw new RpcException({
          statusCode: 404,
          message: 'Ya existe un permiso con este nombre',
        });
      }

      const permission = await this.prisma.permission.create({
        data: {
          name: dto.name,
        },
      });

      this.audit.log({
        action: 'PERM_CREATED',
        entity: 'Permiso',
        entityId: permission.id,
        performedBy: user.userId,
        ipAddress: ip,
        level: AuditLevel.INFO,
        metadata: { permission },
      });

      return permission;
    } catch (error) {

      this.audit.log({
        action: 'PERM_CREATE_FAILED',
        entity: 'Permiso',
        performedBy: user?.userId,
        ipAddress: ip,
        level: AuditLevel.ERROR,
        metadata: { error: error.message },
      });

      throw new RpcException({
        statusCode: 400,
        message: 'Error al crear permiso: ' + error.message,
      });
    }
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
    user: JwtUser,
    ip: string,
  ){
    try {

      const exist = await this.prisma.permission.findUnique({
        where: {
          name: dto.name,
        },
      });

      if(exist){
        throw new RpcException({
          statusCode: 404,
          message: 'Ya existe un permiso con este nombre',
        });
      }

      const permission = await this.prisma.permission.update({
        data: {
          name: dto.name,
        },
        where: {
          id
        },
      });

      this.audit.log({
        action: 'PERM_UPDATED',
        entity: 'Permiso',
        entityId: permission.id,
        performedBy: user.userId,
        ipAddress: ip,
        level: AuditLevel.INFO,
        metadata: { permission },
      });

      return permission;
    } catch (error) {
      
      this.audit.log({
        action: 'PERM_UPDATE_FAILED',
        entity: 'Permiso',
        performedBy: user?.userId,
        ipAddress: ip,
        level: AuditLevel.ERROR,
        metadata: { error: error.message },
      });

      throw new RpcException({
        statusCode: 400,
        message: 'Error al actualizar permiso: ' + error.message,
      });
    }
  }

  async deletePermission(
    id: string,
    user: JwtUser,
    ip: string,
  ) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!permission) {
        throw new RpcException({
          statusCode: 404,
          message: 'Permiso no encontrado',
        });
      }

      const activeAssignments = await this.prisma.userPermission.count({
        where: {
          permissionId: id,
          user: {
            isActive: true,
          },
        },
      });

      if (activeAssignments > 0) {
        throw new RpcException({
          statusCode: 400,
          message: 'No se puede eliminar el permiso porque está asignado a usuarios activos',
        });
      }

      await this.prisma.permission.delete({
        where: { id },
      });

      this.audit.log({
        action: 'PERM_DELETED',
        entity: 'Permiso',
        entityId: id,
        performedBy: user.userId,
        ipAddress: ip,
        level: AuditLevel.INFO,
        metadata: { permissionName: permission.name },
      });

      return { success: true };
    } catch (error) {
      this.audit.log({
        action: 'PERM_DELETE_FAILED',
        entity: 'Permiso',
        entityId: id,
        performedBy: user?.userId,
        ipAddress: ip,
        level: AuditLevel.ERROR,
        metadata: { error: error.message },
      });

      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        statusCode: 400,
        message: 'Error al eliminar permiso: ' + error.message,
      });
    }
  }

  async getUserPermissions(userId: string, performedBy: string, ip: string) {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
      orderBy: { permission: { name: 'asc' } },
    });

    this.audit.log({
      action: 'USER_PERMS_VIEWED',
      entity: 'User',
      entityId: userId,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
    });

    return rows.map(r => r.permission); 
  }

  async setUserPermissions(dto: AssignUserPermissionsDto, user: JwtUser, ip: string) {
    // Validar user existe
    const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!target) {
      throw new RpcException({ statusCode: 404, message: 'Usuario no encontrado' });
    }

    // Validar permissions existen
    const perms = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
      select: { id: true, name: true },
    });

    if (perms.length !== dto.permissionIds.length) {
      throw new RpcException({
        statusCode: 400,
        message: 'Uno o más permisos no existen',
      });
    }

    // SET absoluto: borra y recrea
    await this.prisma.$transaction([
      this.prisma.userPermission.deleteMany({ where: { userId: dto.userId } }),
      this.prisma.userPermission.createMany({
        data: dto.permissionIds.map(permissionId => ({
          userId: dto.userId,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);

    this.audit.log({
      action: 'USER_PERMS_UPDATED',
      entity: 'User',
      entityId: dto.userId,
      performedBy: user.userId,
      ipAddress: ip,
      level: AuditLevel.INFO,
      metadata: { permissionIds: dto.permissionIds },
    });

    // devolvemos permisos para refrescar UI
    return this.getUserPermissions(dto.userId, user.userId, ip);
  }

}
