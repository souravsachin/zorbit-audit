import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)', example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)', example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Actor (user hash ID) filter', example: 'U-81F3' })
  @IsOptional()
  @IsString()
  actor?: string;

  @ApiPropertyOptional({ description: 'Action filter', example: 'identity.user.created' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Resource type filter', example: 'users' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Resource ID filter', example: 'U-81F3' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Event type filter', example: 'identity.user.created' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Source service filter', example: 'zorbit-identity' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (max 100)', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AuditExportDto {
  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)', example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)', example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Actor filter', example: 'U-81F3' })
  @IsOptional()
  @IsString()
  actor?: string;

  @ApiPropertyOptional({ description: 'Action filter', example: 'identity.user.created' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Event type filter', example: 'identity.user.created' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Export format', example: 'json', enum: ['csv', 'json'] })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'json';
}

export interface AuditStatsResult {
  totalRecords: number;
  recordsBySource: Array<{ source: string; count: number }>;
  recordsByAction: Array<{ action: string; count: number }>;
  recordsLast24h: number;
  recordsLast7d: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
