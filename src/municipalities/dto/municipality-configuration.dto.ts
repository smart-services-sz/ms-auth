import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const SLUG_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const CLAIM_CATEGORIES = [
  'agua_y_cloacas',
  'alumbrado',
  'baches_y_pavimento',
  'arbolado',
  'residuos',
  'electricidad',
  'gas',
  'transporte',
  'infraestructura',
  'otros',
] as const;

export class MunicipalityAreaDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MunicipalityCategoryDto {
  @IsString()
  @IsIn(CLAIM_CATEGORIES)
  code!: (typeof CLAIM_CATEGORIES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['alta', 'media', 'baja'])
  defaultPriority?: 'alta' | 'media' | 'baja';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MunicipalityNeighborhoodDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN)
  areaSlug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MunicipalityRuleDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  key!: string;

  @IsObject()
  value!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MunicipalityConfigurationDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  defaultCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsArray()
  @IsString({ each: true })
  allowedCountries!: string[];

  @IsArray()
  @IsString({ each: true })
  allowedAdminAreas!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MunicipalityAreaDto)
  areas?: MunicipalityAreaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MunicipalityCategoryDto)
  categories?: MunicipalityCategoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MunicipalityNeighborhoodDto)
  neighborhoods?: MunicipalityNeighborhoodDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MunicipalityRuleDto)
  rules?: MunicipalityRuleDto[];
}

export class ListMunicipalitiesDto {
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

export class MunicipalityIdDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  id!: string;
}