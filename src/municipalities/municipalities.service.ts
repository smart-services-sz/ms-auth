import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLevel } from '../auth/dto/audit-event.dto';
import { AuditPublisher } from '../utils/audit.publisher';
import { MunicipalityConfigurationDto } from './dto/municipality-configuration.dto';

const municipalityInclude = {
  areas: { orderBy: { name: 'asc' as const } },
  categories: { orderBy: { name: 'asc' as const } },
  neighborhoods: { orderBy: { name: 'asc' as const } },
  rules: { orderBy: { key: 'asc' as const } },
};

@Injectable()
export class MunicipalitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditPublisher,
  ) {}

  list(includeInactive = false) {
    return this.prisma.municipality.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: municipalityInclude,
      orderBy: { name: 'asc' },
    });
  }

  async get(id: string) {
    const municipality = await this.prisma.municipality.findUnique({
      where: { id },
      include: municipalityInclude,
    });
    if (!municipality) {
      throw new NotFoundException('Municipio no encontrado');
    }
    return municipality;
  }

  async upsert(
    dto: MunicipalityConfigurationDto,
    performedBy: string,
    ipAddress: string,
  ) {
    const municipality = await this.prisma.$transaction(async (tx) => {
      await tx.municipality.upsert({
        where: { id: dto.id },
        create: {
          id: dto.id,
          name: dto.name.trim(),
          country: dto.country.trim(),
          province: dto.province?.trim() || null,
          defaultCity: dto.defaultCity?.trim() || null,
          timezone: dto.timezone?.trim() || 'America/Argentina/Buenos_Aires',
          allowedCountries: this.cleanStrings(dto.allowedCountries),
          allowedAdminAreas: this.cleanStrings(dto.allowedAdminAreas),
          isActive: dto.isActive ?? true,
        },
        update: {
          name: dto.name.trim(),
          country: dto.country.trim(),
          province: dto.province?.trim() || null,
          defaultCity: dto.defaultCity?.trim() || null,
          timezone: dto.timezone?.trim() || 'America/Argentina/Buenos_Aires',
          allowedCountries: this.cleanStrings(dto.allowedCountries),
          allowedAdminAreas: this.cleanStrings(dto.allowedAdminAreas),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      for (const area of dto.areas ?? []) {
        await tx.municipalityArea.upsert({
          where: {
            municipalityId_slug: { municipalityId: dto.id, slug: area.slug },
          },
          create: {
            municipalityId: dto.id,
            slug: area.slug,
            name: area.name.trim(),
            description: area.description?.trim() || null,
            isActive: area.isActive ?? true,
          },
          update: {
            name: area.name.trim(),
            description: area.description?.trim() || null,
            ...(area.isActive !== undefined ? { isActive: area.isActive } : {}),
          },
        });
      }

      for (const category of dto.categories ?? []) {
        await tx.municipalityCategory.upsert({
          where: {
            municipalityId_code: {
              municipalityId: dto.id,
              code: category.code,
            },
          },
          create: {
            municipalityId: dto.id,
            code: category.code,
            name: category.name.trim(),
            description: category.description?.trim() || null,
            defaultPriority: category.defaultPriority ?? 'media',
            isActive: category.isActive ?? true,
          },
          update: {
            name: category.name.trim(),
            description: category.description?.trim() || null,
            defaultPriority: category.defaultPriority ?? 'media',
            ...(category.isActive !== undefined
              ? { isActive: category.isActive }
              : {}),
          },
        });
      }

      for (const neighborhood of dto.neighborhoods ?? []) {
        await tx.municipalityNeighborhood.upsert({
          where: {
            municipalityId_slug: {
              municipalityId: dto.id,
              slug: neighborhood.slug,
            },
          },
          create: {
            municipalityId: dto.id,
            slug: neighborhood.slug,
            name: neighborhood.name.trim(),
            areaSlug: neighborhood.areaSlug || null,
            isActive: neighborhood.isActive ?? true,
          },
          update: {
            name: neighborhood.name.trim(),
            areaSlug: neighborhood.areaSlug || null,
            ...(neighborhood.isActive !== undefined
              ? { isActive: neighborhood.isActive }
              : {}),
          },
        });
      }

      for (const rule of dto.rules ?? []) {
        await tx.municipalityRule.upsert({
          where: {
            municipalityId_key: { municipalityId: dto.id, key: rule.key },
          },
          create: {
            municipalityId: dto.id,
            key: rule.key,
            value: rule.value as Prisma.InputJsonValue,
            description: rule.description?.trim() || null,
            isActive: rule.isActive ?? true,
          },
          update: {
            value: rule.value as Prisma.InputJsonValue,
            description: rule.description?.trim() || null,
            ...(rule.isActive !== undefined ? { isActive: rule.isActive } : {}),
          },
        });
      }

      return tx.municipality.findUniqueOrThrow({
        where: { id: dto.id },
        include: municipalityInclude,
      });
    });

    this.audit.log({
      action: 'MUNICIPAL_CONFIGURATION_SAVED',
      entity: 'Municipality',
      entityId: municipality.id,
      performedBy,
      ipAddress,
      level: AuditLevel.INFO,
      metadata: {
        areaCount: municipality.areas.length,
        categoryCount: municipality.categories.length,
        neighborhoodCount: municipality.neighborhoods.length,
        ruleCount: municipality.rules.length,
      },
    });
    return municipality;
  }

  private cleanStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}