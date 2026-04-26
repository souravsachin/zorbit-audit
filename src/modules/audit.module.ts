import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// EPIC-9 / SDK 0.5.2 — auth wiring lifted to AppModule via
// ZorbitAuthModule.forRoot(). PassportModule + JwtModule + JwtStrategy
// removed from this feature module per cycle-104 sample (pii-vault).
import { AuditController } from '../controllers/audit.controller';
import { AuditIngestionService } from '../services/audit-ingestion.service';
import { AuditQueryService } from '../services/audit-query.service';
import { AuditExportService } from '../services/audit-export.service';
import { RetentionService } from '../services/retention.service';
import { HashIdService } from '../services/hash-id.service';
import { AuditRecord } from '../models/entities/audit-record.entity';
import { AuditRetentionPolicy } from '../models/entities/audit-retention-policy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditRecord, AuditRetentionPolicy]),
  ],
  controllers: [AuditController],
  providers: [
    AuditIngestionService,
    AuditQueryService,
    AuditExportService,
    RetentionService,
    HashIdService,
  ],
  exports: [AuditQueryService],
})
export class AuditModule {}
