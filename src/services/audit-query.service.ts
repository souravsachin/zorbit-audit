import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, Like } from 'typeorm';
import { AuditRecord } from '../models/entities/audit-record.entity';
import { AuditQueryDto, AuditStatsResult, PaginatedResult } from '../models/dto/audit-query.dto';

/**
 * Provides query and search capabilities for audit records.
 * Supports filtering by date range, actor, action, resource type, event type, and source.
 */
@Injectable()
export class AuditQueryService {
  private readonly logger = new Logger(AuditQueryService.name);

  constructor(
    @InjectRepository(AuditRecord)
    private readonly auditRepository: Repository<AuditRecord>,
  ) {}

  /**
   * Query audit records with filters and pagination.
   */
  async query(
    orgId: string,
    filters: AuditQueryDto,
  ): Promise<PaginatedResult<AuditRecord>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.organization_hash_id = :orgId', { orgId });

    if (filters.startDate && filters.endDate) {
      qb.andWhere('audit.event_timestamp BETWEEN :start AND :end', {
        start: new Date(filters.startDate),
        end: new Date(filters.endDate),
      });
    } else if (filters.startDate) {
      qb.andWhere('audit.event_timestamp >= :start', {
        start: new Date(filters.startDate),
      });
    } else if (filters.endDate) {
      qb.andWhere('audit.event_timestamp <= :end', {
        end: new Date(filters.endDate),
      });
    }

    if (filters.actor) {
      qb.andWhere("audit.actor->>'hashId' = :actor", { actor: filters.actor });
    }

    if (filters.action) {
      qb.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.resourceType) {
      qb.andWhere('audit.resource_type = :resourceType', {
        resourceType: filters.resourceType,
      });
    }

    if (filters.resourceId) {
      qb.andWhere('audit.resource_id = :resourceId', {
        resourceId: filters.resourceId,
      });
    }

    if (filters.eventType) {
      qb.andWhere('audit.event_type LIKE :eventType', {
        eventType: `%${filters.eventType}%`,
      });
    }

    if (filters.source) {
      qb.andWhere('audit.source = :source', { source: filters.source });
    }

    qb.orderBy('audit.event_timestamp', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single audit record by hashId within an organization.
   */
  async findOne(orgId: string, logId: string): Promise<AuditRecord> {
    const record = await this.auditRepository.findOne({
      where: {
        hashId: logId,
        organizationHashId: orgId,
      },
    });

    if (!record) {
      throw new NotFoundException(`Audit record ${logId} not found in org ${orgId}`);
    }

    return record;
  }

  /**
   * Get aggregate audit statistics (global).
   */
  async getStats(): Promise<AuditStatsResult> {
    const totalRecords = await this.auditRepository.count();

    const recordsBySource = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.source')
      .orderBy('count', 'DESC')
      .getRawMany();

    const recordsByAction = await this.auditRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recordsLast24h = await this.auditRepository.count({
      where: { eventTimestamp: MoreThanOrEqual(oneDayAgo) },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recordsLast7d = await this.auditRepository.count({
      where: { eventTimestamp: MoreThanOrEqual(sevenDaysAgo) },
    });

    return {
      totalRecords,
      recordsBySource: recordsBySource.map((r) => ({
        source: r.source,
        count: parseInt(r.count, 10),
      })),
      recordsByAction: recordsByAction.map((r) => ({
        action: r.action,
        count: parseInt(r.count, 10),
      })),
      recordsLast24h,
      recordsLast7d,
    };
  }

  /**
   * Get all records for an organization matching filters (for export).
   */
  async findAllForExport(
    orgId: string,
    filters: { startDate?: string; endDate?: string; actor?: string; action?: string; eventType?: string },
  ): Promise<AuditRecord[]> {
    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.organization_hash_id = :orgId', { orgId });

    if (filters.startDate) {
      qb.andWhere('audit.event_timestamp >= :start', {
        start: new Date(filters.startDate),
      });
    }

    if (filters.endDate) {
      qb.andWhere('audit.event_timestamp <= :end', {
        end: new Date(filters.endDate),
      });
    }

    if (filters.actor) {
      qb.andWhere("audit.actor->>'hashId' = :actor", { actor: filters.actor });
    }

    if (filters.action) {
      qb.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.eventType) {
      qb.andWhere('audit.event_type LIKE :eventType', {
        eventType: `%${filters.eventType}%`,
      });
    }

    qb.orderBy('audit.event_timestamp', 'DESC');
    qb.take(10000); // Safety limit

    return qb.getMany();
  }
}
