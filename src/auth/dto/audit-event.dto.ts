import { IsEnum, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';

export enum AuditLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

export class AuditEventDto {
  @IsString()
  service: string; // ms-auth, ms-actas, etc

  @IsString()
  action: string; // USER_CREATED, ACTA_APPROVED, etc

  @IsString()
  entity: string; // User, Constatacion, Order

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  performedBy?: string; // userId

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsEnum(AuditLevel)
  @IsOptional()
  level?: AuditLevel = AuditLevel.INFO;

  @IsOptional()
  timestamp?: string;
}