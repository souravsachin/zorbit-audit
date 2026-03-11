import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditController } from '../controllers/audit.controller';
import { AuditIngestionService } from '../services/audit-ingestion.service';
import { AuditQueryService } from '../services/audit-query.service';
import { AuditExportService } from '../services/audit-export.service';
import { RetentionService } from '../services/retention.service';
import { HashIdService } from '../services/hash-id.service';
import { JwtStrategy } from '../middleware/jwt.strategy';
import { AuditRecord } from '../models/entities/audit-record.entity';
import { AuditRetentionPolicy } from '../models/entities/audit-retention-policy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditRecord, AuditRetentionPolicy]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
      }),
    }),
  ],
  controllers: [AuditController],
  providers: [
    AuditIngestionService,
    AuditQueryService,
    AuditExportService,
    RetentionService,
    HashIdService,
    JwtStrategy,
  ],
  exports: [AuditQueryService],
})
export class AuditModule {}
