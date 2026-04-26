import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ZorbitAuthModule } from '@zorbit-platform/sdk-node';
import { AuditModule } from './modules/audit.module';
import { EventsModule } from './modules/events.module';
import { AuditRecord } from './models/entities/audit-record.entity';
import { AuditRetentionPolicy } from './models/entities/audit-retention-policy.entity';
import { HealthController } from './controllers/health.controller';
import { SeedModule } from './seed/seed.module';
import { ModuleAnnouncementService } from './events/module-announcement.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // EPIC-9 / SDK 0.5.2 — single-line auth wiring at the AppModule level
    // (replaces the per-feature PassportModule.register() + JwtModule
    // .registerAsync() + local JwtStrategy that previously lived inside
    // AuditModule). See 00_docs/platform/sdk-di-factory-design.md.
    ZorbitAuthModule.forRoot({
      jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5438),
        database: config.get<string>('DATABASE_NAME', 'zorbit_audit'),
        username: config.get<string>('DATABASE_USER', 'zorbit'),
        password: config.get<string>('DATABASE_PASSWORD', 'zorbit_dev'),
        entities: [AuditRecord, AuditRetentionPolicy],
        synchronize: config.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    ScheduleModule.forRoot(),
    EventsModule,
    AuditModule,
    SeedModule,
  ],
  controllers: [HealthController],
  providers: [ModuleAnnouncementService],
})
export class AppModule {}
