import { Injectable, Logger } from '@nestjs/common';
import { AuditRecord } from '../models/entities/audit-record.entity';

/**
 * Handles exporting audit records to CSV or JSON format.
 */
@Injectable()
export class AuditExportService {
  private readonly logger = new Logger(AuditExportService.name);

  /**
   * Export audit records as a JSON string.
   */
  exportJson(records: AuditRecord[]): string {
    const exportData = records.map((record) => ({
      hashId: record.hashId,
      eventType: record.eventType,
      source: record.source,
      actor: record.actor,
      namespace: record.namespace,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      action: record.action,
      previousState: record.previousState,
      newState: record.newState,
      metadata: record.metadata,
      ipAddress: record.ipAddress,
      eventTimestamp: record.eventTimestamp,
      organizationHashId: record.organizationHashId,
      createdAt: record.createdAt,
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export audit records as a CSV string.
   */
  exportCsv(records: AuditRecord[]): string {
    const headers = [
      'timestamp',
      'eventType',
      'actor',
      'resource',
      'resourceId',
      'details',
    ];

    const rows = records.map((record) => [
      this.escapeCsv(record.eventTimestamp?.toISOString() || ''),
      this.escapeCsv(record.eventType),
      this.escapeCsv(record.actor ? JSON.stringify(record.actor) : ''),
      this.escapeCsv(record.resourceType || ''),
      this.escapeCsv(record.resourceId || ''),
      this.escapeCsv(record.action),
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ];

    return csvLines.join('\n');
  }

  /**
   * Escape a value for CSV output.
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
