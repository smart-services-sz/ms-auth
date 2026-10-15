import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditPublisher } from '../utils/audit.publisher';
import { MunicipalitiesService } from './municipalities.service';

describe('MunicipalitiesService', () => {
  let prisma: {
    municipality: Record<string, jest.Mock>;
    municipalityArea: Record<string, jest.Mock>;
    municipalityCategory: Record<string, jest.Mock>;
    municipalityNeighborhood: Record<string, jest.Mock>;
    municipalityRule: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let service: MunicipalitiesService;

  beforeEach(() => {
    const municipalityResult = {
      id: 'funes',
      name: 'Funes',
      areas: [],
      categories: [],
      neighborhoods: [],
      rules: [],
    };
    const tx = {
      municipality: {
        upsert: jest.fn().mockResolvedValue(municipalityResult),
        findUniqueOrThrow: jest.fn().mockResolvedValue(municipalityResult),
      },
      municipalityArea: { upsert: jest.fn().mockResolvedValue({}) },
      municipalityCategory: { upsert: jest.fn().mockResolvedValue({}) },
      municipalityNeighborhood: { upsert: jest.fn().mockResolvedValue({}) },
      municipalityRule: { upsert: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      municipality: {
        ...tx.municipality,
        findMany: jest.fn().mockResolvedValue([municipalityResult]),
        findUnique: jest.fn().mockResolvedValue(municipalityResult),
      },
      municipalityArea: tx.municipalityArea,
      municipalityCategory: tx.municipalityCategory,
      municipalityNeighborhood: tx.municipalityNeighborhood,
      municipalityRule: tx.municipalityRule,
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    audit = { log: jest.fn() };
    service = new MunicipalitiesService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditPublisher,
    );
  });

  it('lists active municipalities by default and includes inactive only on request', async () => {
    await service.list();
    expect(prisma.municipality.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );

    await service.list(true);
    expect(prisma.municipality.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('returns 404 when a municipality does not exist', async () => {
    prisma.municipality.findUnique.mockResolvedValue(null);
    await expect(service.get('unknown')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('upserts catalog entities in one transaction and audits counts only', async () => {
    const result = await service.upsert(
      {
        id: 'funes',
        name: ' Funes ',
        country: ' Argentina ',
        province: 'Santa Fe',
        defaultCity: 'Funes',
        allowedCountries: [' Argentina ', 'Argentina'],
        allowedAdminAreas: ['Santa Fe'],
        areas: [{ slug: 'alumbrado', name: 'Alumbrado', isActive: true }],
        categories: [
          {
            code: 'alumbrado',
            name: 'Alumbrado',
            defaultPriority: 'alta',
            isActive: true,
          },
        ],
        neighborhoods: [
          {
            slug: 'centro',
            name: 'Centro',
            areaSlug: 'alumbrado',
            isActive: true,
          },
        ],
        rules: [
          {
            key: 'routing_limits',
            value: { daily: 20 },
            isActive: true,
          },
        ],
      } as never,
      'admin-1',
      '127.0.0.1',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.municipality.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'funes' },
        create: expect.objectContaining({
          name: 'Funes',
          country: 'Argentina',
          allowedCountries: ['Argentina'],
        }),
      }),
    );
    expect(prisma.municipalityArea.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.municipalityCategory.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.municipalityNeighborhood.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.municipalityRule.upsert).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MUNICIPAL_CONFIGURATION_SAVED',
        entityId: 'funes',
        performedBy: 'admin-1',
        metadata: {
          areaCount: 0,
          categoryCount: 0,
          neighborhoodCount: 0,
          ruleCount: 0,
        },
      }),
    );
    expect(result.id).toBe('funes');
  });
});