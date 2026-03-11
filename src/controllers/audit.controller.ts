import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditQueryService } from '../services/audit-query.service';
import { AuditExportService } from '../services/audit-export.service';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { AuditRecord } from '../models/entities/audit-record.entity';
import {
  AuditQueryDto,
  AuditExportDto,
  AuditStatsResult,
  PaginatedResult,
} from '../models/dto/audit-query.dto';

/**
 * Audit log query and export endpoints.
 * Organization-scoped endpoints enforce namespace isolation.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly queryService: AuditQueryService,
    private readonly exportService: AuditExportService,
  ) {}

  /**
   * GET /api/v1/O/:orgId/audit/logs
   * Query audit logs with filters and pagination.
   */
  @Get('api/v1/O/:orgId/audit/logs')
  @UseGuards(NamespaceGuard)
  async queryLogs(
    @Param('orgId') orgId: string,
    @Query() query: AuditQueryDto,
  ): Promise<PaginatedResult<AuditRecord>> {
    return this.queryService.query(orgId, query);
  }

  /**
   * GET /api/v1/O/:orgId/audit/logs/:logId
   * Get a single audit record by hashId.
   */
  @Get('api/v1/O/:orgId/audit/logs/:logId')
  @UseGuards(NamespaceGuard)
  async findOne(
    @Param('orgId') orgId: string,
    @Param('logId') logId: string,
  ): Promise<AuditRecord> {
    return this.queryService.findOne(orgId, logId);
  }

  /**
   * GET /api/v1/G/audit/stats
   * Get aggregate audit statistics (global).
   */
  @Get('api/v1/G/audit/stats')
  async getStats(): Promise<AuditStatsResult> {
    return this.queryService.getStats();
  }

  /**
   * GET /api/v1/O/:orgId/audit/export
   * Export audit logs as CSV or JSON.
   */
  @Get('api/v1/O/:orgId/audit/export')
  @UseGuards(NamespaceGuard)
  async exportLogs(
    @Param('orgId') orgId: string,
    @Query() query: AuditExportDto,
    @Res() res: Response,
  ): Promise<void> {
    const records = await this.queryService.findAllForExport(orgId, {
      startDate: query.startDate,
      endDate: query.endDate,
      actor: query.actor,
      action: query.action,
    });

    const format = query.format || 'json';

    if (format === 'csv') {
      const csv = this.exportService.exportCsv(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      res.send(csv);
    } else {
      const json = this.exportService.exportJson(records);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-${orgId}-${new Date().toISOString().slice(0, 10)}.json`,
      );
      res.send(json);
    }
  }
}
