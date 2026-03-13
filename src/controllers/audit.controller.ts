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
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly queryService: AuditQueryService,
    private readonly exportService: AuditExportService,
  ) {}

  @Get('api/v1/O/:orgId/audit/logs')
  @UseGuards(NamespaceGuard)
  @ApiOperation({ summary: 'Query audit logs', description: 'Query audit logs with filters and pagination.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs returned.' })
  async queryLogs(
    @Param('orgId') orgId: string,
    @Query() query: AuditQueryDto,
  ): Promise<PaginatedResult<AuditRecord>> {
    return this.queryService.query(orgId, query);
  }

  @Get('api/v1/O/:orgId/audit/logs/:logId')
  @UseGuards(NamespaceGuard)
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
  @ApiOperation({ summary: 'Get audit statistics', description: 'Get aggregate audit statistics (global).' })
  @ApiResponse({ status: 200, description: 'Audit statistics returned.' })
  async getStats(): Promise<AuditStatsResult> {
    return this.queryService.getStats();
  }

  @Get('api/v1/O/:orgId/audit/export')
  @UseGuards(NamespaceGuard)
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
