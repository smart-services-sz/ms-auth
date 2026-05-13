import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordService } from './password.service';
import { TokenService } from './jwt.service';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';
import { PaginationDto } from './dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserPayloadDto } from './dto/update-user-payload.dto';
import { AuditPublisher } from '../utils/audit.publisher';
import { AuditLevel } from './dto/audit-event.dto';


@Injectable()
export class AuthService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly audit: AuditPublisher,
  ) {}

  /* ===================================================== */
  /* REGISTER                                              */
  /* ===================================================== */

  async register(email: string, password: string, ip: string) {

    const hash = await this.passwordService.hash(password);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
      },
    });

    this.audit.log({
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: newUser.id,
      performedBy: newUser.id,
      ipAddress: ip,
      level: AuditLevel.INFO,
      metadata: { email },
    });

    return newUser;
  }

  /* ===================================================== */
  /* LOGIN                                                 */
  /* ===================================================== */

  async login(email: string, password: string, ip: string) {

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {

      this.audit.log({
        action: 'LOGIN_FAILED',
        entity: 'User',
        ipAddress: ip,
        level: AuditLevel.SECURITY,
        metadata: { email, reason: 'User not found or inactive' },
      });

      throw new RpcException({ statusCode: 401, message: 'Credenciales inválidas' });
    }

    const valid = await this.passwordService.compare(
      password,
      user.passwordHash,
    );

    if (!valid) {

      this.audit.log({
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        ipAddress: ip,
        level: AuditLevel.SECURITY,
        metadata: { reason: 'Invalid password' },
      });

      throw new RpcException({ statusCode: 401, message: 'Credenciales inválidas' });
    }

    if (!user.name) {
      throw new RpcException({ statusCode: 401, message: 'El usuario no tiene nombre configurado' });
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId: user.id,
      },
      include: {
        role: true,
      },
    });

    const roles = userRoles.map( r => r.role.name );

    if (roles.length === 0) {
      throw new RpcException({ statusCode: 403, message: 'El usuario no tiene roles asignados' });
    }

    const [userPerms, rolePerms] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: {
          userId: user.id,
        },
        include: {
          permission: true,
        },
      }),
      this.prisma.rolePermission.findMany({
        where: {
          roleId: { in: userRoles.map((row) => row.role.id) },
        },
        include: {
          permission: true,
        },
      }),
    ]);

    const permissions = Array.from(
      new Set([
        ...userPerms.map((row) => row.permission.name),
        ...rolePerms.map((row) => row.permission.name),
      ]),
    );

    const refreshId = randomUUID();

    const accessToken = this.tokenService.generateAccessToken(
      user.id,
      user.name,
      user.email,
      roles,
      permissions,
      user.cargo,
      user.legajo,
      user.area,
    );

    const refreshToken = this.tokenService.generateRefreshToken(
      user.id,
      refreshId,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenService.create(
      user.id,
      refreshToken,
      expiresAt,
    );

    this.audit.log({
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      performedBy: user.id,
      ipAddress: ip,
      level: AuditLevel.SECURITY,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /* ===================================================== */
  /* LOGOUT                                                */
  /* ===================================================== */

  async logout(refreshToken: string, ip: string) {

    if (!refreshToken) return;

    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    await this.refreshTokenService.revokeByUser(payload.sub);

    this.audit.log({
      action: 'LOGOUT',
      entity: 'User',
      entityId: payload.sub,
      performedBy: payload.sub,
      ipAddress: ip,
      level: AuditLevel.SECURITY,
    });

    return { success: true };
  }

  async revokeUserSessions(userId: string, performedBy: string, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'Usuario no encontrado' });
    }

    await this.refreshTokenService.revokeByUser(userId);

    this.audit.log({
      action: 'USER_SESSIONS_REVOKED',
      entity: 'User',
      entityId: user.id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.SECURITY,
      metadata: { email: user.email },
    });

    return { success: true };
  }

  /* ===================================================== */
  /* REFRESH                                               */
  /* ===================================================== */

  async refresh(refreshToken: string, ip: string) {

    if (!refreshToken) throw new UnauthorizedException();

    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    const tokenRecord = await this.refreshTokenService.validate(
      payload.sub,
      refreshToken,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {

      this.audit.log({
        action: 'REFRESH_FAILED',
        entity: 'User',
        entityId: payload.sub,
        ipAddress: ip,
        level: AuditLevel.SECURITY,
      });

      throw new UnauthorizedException();
    }

    if (!user.name) {
      throw new RpcException({ statusCode: 401, message: 'El usuario no tiene nombre configurado' });
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId: user.id,
      },
      include: {
        role: true,
      },
    });

    const roles = userRoles.map( r => r.role.name );

    if (roles.length === 0) {
      throw new RpcException({ statusCode: 403, message: 'El usuario no tiene roles asignados' });
    }

    const [userPerms, rolePerms] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { userId: user.id },
        include: { permission: true },
      }),
      this.prisma.rolePermission.findMany({
        where: {
          roleId: { in: userRoles.map((row) => row.role.id) },
        },
        include: { permission: true },
      }),
    ]);

    const permissions = Array.from(
      new Set([
        ...userPerms.map((row) => row.permission.name),
        ...rolePerms.map((row) => row.permission.name),
      ]),
    );

    const newRefreshId = randomUUID();

    const newAccessToken = this.tokenService.generateAccessToken(
      user.id,
      user.name,
      user.email,
      roles,
      permissions,
      user.cargo,
      user.legajo,
      user.area,
    );

    const newRefreshToken = this.tokenService.generateRefreshToken(
      user.id,
      newRefreshId,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenService.revoke(tokenRecord.id, newRefreshId);

    await this.refreshTokenService.create(
      user.id,
      newRefreshToken,
      expiresAt,
    );

    this.audit.log({
      action: 'TOKEN_REFRESHED',
      entity: 'User',
      entityId: user.id,
      performedBy: user.id,
      ipAddress: ip,
      level: AuditLevel.SECURITY,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /* ===================================================== */
  /* USERS CRUD                                            */
  /* ===================================================== */

  async getAllUsers(
    pagination: PaginationDto,
    performedBy: string,
    ip: string,
  ) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const skip = (page - 1) * limit;

    // ✅ SEARCH
    const search = (pagination.search || '').trim();

    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } },
            { whatsappNumber: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,                 // ✅
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // (opcional) para no devolver passwordHash etc:
        // select: { id: true, email: true, name: true, roles: true, isActive: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.user.count({ where }), // ✅
    ]);

    this.audit.log({
      action: 'USERS_LIST_VIEWED',
      entity: 'User',
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
      metadata: { page, limit, search },
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

  async getUserById(
    id: string,
    performedBy: string,
    ip: string,
  ) {

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new RpcException({
        statusCode: 404,
        message: 'Usuario no encontrado',
      });
    }

    this.audit.log({
      action: 'USER_VIEWED',
      entity: 'User',
      entityId: id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
    });

    return user;
  }

  async getUserByWhatsappNumber(phoneNumber: string) {
    const normalized = (phoneNumber ?? '').replace(/\D/g, '');

    if (!normalized) {
      throw new RpcException({ statusCode: 400, message: 'Número inválido' });
    }

    const variants = [
      normalized,
      `+${normalized}`,
      phoneNumber,
    ].filter(Boolean);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: variants.map((value) => ({ whatsappNumber: value })),
      },
      select: {
        id: true,
        name: true,
        email: true,
        area: true,
        cargo: true,
        legajo: true,
        whatsappNumber: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  async createUser(
    dto: CreateUserDto,
    performedBy: string,
    ip: string,
  ) {

    const hash = await this.passwordService.hash(dto.password);

    const newUser = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        isActive: dto.isActive,
        passwordHash: hash,
        cargo: dto.cargo,
        legajo: dto.legajo,
        area: dto.area,
        whatsappNumber: dto.whatsappNumber,
      },
    });

    this.audit.log({
      action: 'USER_CREATED_BY_ADMIN',
      entity: 'User',
      entityId: newUser.id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
      metadata: { email: newUser.email },
    });

    return newUser;
  }

  async toggleStatus(
    id: string,
    performedBy: string,
    ip: string,
  ) {

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) throw new RpcException({ statusCode: 404 });

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    this.audit.log({
      action: 'USER_STATUS_CHANGED',
      entity: 'User',
      entityId: id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.WARNING,
    });

    return updatedUser;
  }

  async updateUser(
    payload: UpdateUserPayloadDto,
    performedBy: string,
    ip: string,
  ) {

    const { id, dto } = payload;

    const data: any = {
      name: dto.name,
      email: dto.email,
      isActive: dto.isActive,
      cargo: dto.cargo,
      legajo: dto.legajo,
      area: dto.area,
      whatsappNumber: dto.whatsappNumber,
    };

    if (dto.password) {
      data.passwordHash = await this.passwordService.hash(dto.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data
    });

    this.audit.log({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.INFO,
      metadata: data,
    });

    return updatedUser;
  }

  async deleteUser(
    id: string,
    performedBy: string,
    ip: string,
  ) {
    if (id === performedBy) {
      throw new RpcException({
        statusCode: 400,
        message: 'No puedes eliminar tu propio usuario',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new RpcException({
        statusCode: 404,
        message: 'Usuario no encontrado',
      });
    }

    await this.prisma.user.delete({
      where: { id },
    });

    this.audit.log({
      action: 'USER_DELETED',
      entity: 'User',
      entityId: id,
      performedBy,
      ipAddress: ip,
      level: AuditLevel.WARNING,
      metadata: { email: user.email },
    });

    return { success: true };
  }
}
