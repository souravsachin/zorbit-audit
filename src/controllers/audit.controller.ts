import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditQueryService } from '../services/audit-query.service';
import { AuditExportService } from '../services/audit-export.service';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { ZorbitPrivilegeGuard } from '../middleware/zorbit-privilege.guard';
import { RequirePrivileges } from '../middleware/decorators';
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
@ApiTags('audit')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, ZorbitPrivilegeGuard)
export class AuditController {
  constructor(
    private readonly queryService: AuditQueryService,
    private readonly exportService: AuditExportService,
  ) {}

  @Get('api/v1/O/:orgId/audit/logs')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('audit.log.read')
  @ApiOperation({ summary: 'Query audit logs', description: 'Query audit logs with filters and pagination.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs returned.' })
  async queryLogs(
    @Param('orgId') orgId: string,
    @Query() query: AuditQueryDto,
  ): Promise<PaginatedResult<AuditRecord>> {
    return this.queryService.query(orgId, query);
  }

  /**
   * Lightweight count endpoint for audit logs in an organization.
   *
   * Cycle-105 E-OVERFETCH (MSG-082): SPA count badges previously
   * fetched the paginated list just to read `total`. This sibling
   * `_count` endpoint accepts the same filter query string but
   * returns only `{count: N}` (~30 bytes), instead of ~25 KB of rows.
   * Re-uses `audit.log.read` privilege.
   */
  @Get('api/v1/O/:orgId/audit/logs/_count')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('audit.log.read')
  @ApiOperation({
    summary: 'Count audit logs',
    description:
      'Count audit logs for an org applying the same filters as the list endpoint. Returns {count: N} only — ~30 bytes payload vs ~25 KB for the full list.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'Audit log count returned.' })
  async countLogs(
    @Param('orgId') orgId: string,
    @Query() query: AuditQueryDto,
  ): Promise<{ count: number }> {
    return this.queryService.count(orgId, query);
  }

  @Get('api/v1/O/:orgId/audit/logs/:logId')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('audit.log.read')
  @ApiOperation({ summary: 'Get audit record', description: 'Get a single audit record by hashId.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'logId', description: 'Audit record short hash ID', example: 'AUD-81F3' })
  @ApiResponse({ status: 200, description: 'Audit record returned.' })
  @ApiResponse({ status: 404, description: 'Audit record not found.' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('logId') logId: string,
  ): Promise<AuditRecord> {
    return this.queryService.findOne(orgId, logId);
  }

  @Get('api/v1/G/audit/stats')
  @RequirePrivileges('audit.log.read')
  @ApiOperation({ summary: 'Get audit statistics', description: 'Get aggregate audit statistics (global).' })
  @ApiResponse({ status: 200, description: 'Audit statistics returned.' })
  async getStats(): Promise<AuditStatsResult> {
    return this.queryService.getStats();
  }

  /**
   * Cycle-104 follow-up (MSG-052/MSG-055): the audit module manifest
   * declares `/api/audit/api/v1/G/events` as the `beRoute` for the
   * `DT-AUD-LOG` DataTable, but no global events list endpoint
   * existed — the SPA was getting 404. This adds a paginated global
   * events feed for super-admin / global audit views, complementing
   * the existing `/O/:orgId/audit/logs` org-scoped endpoint.
   */
  @Get('api/v1/G/events')
  @RequirePrivileges('audit.log.read')
  @ApiOperation({
    summary: 'Query global audit events',
    description:
      'Paginated list of audit events across all organizations. Used by the platform-wide audit DataTable (DT-AUD-LOG).',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit events returned.' })
  async queryGlobalEvents(
    @Query() query: AuditQueryDto,
  ): Promise<PaginatedResult<AuditRecord>> {
    return this.queryService.queryGlobal(query);
  }

  /**
   * Lightweight count endpoint for the global audit events feed.
   *
   * Cycle-105 E-OVERFETCH (MSG-082): companion to
   * `GET /api/v1/G/events`. Used by the platform-wide audit DataTable
   * (DT-AUD-LOG) and dashboard count badges. ~30 bytes vs full list.
   */
  @Get('api/v1/G/events/_count')
  @RequirePrivileges('audit.log.read')
  @ApiOperation({
    summary: 'Count global audit events',
    description:
      'Count audit events across all orgs with the same filter shape as the list endpoint. Returns {count: N} only.',
  })
  @ApiResponse({ status: 200, description: 'Global audit event count returned.' })
  async countGlobalEvents(
    @Query() query: AuditQueryDto,
  ): Promise<{ count: number }> {
    return this.queryService.countGlobal(query);
  }

  @Get('api/v1/O/:orgId/audit/export')
  @UseGuards(NamespaceGuard)
  @RequirePrivileges('audit.log.export')
  @ApiOperation({ summary: 'Export audit logs', description: 'Export audit logs as CSV or JSON.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'Audit logs exported.' })
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
      eventType: query.eventType,
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
