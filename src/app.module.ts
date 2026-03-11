import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditModule } from './modules/audit.module';
import { EventsModule } from './modules/events.module';
import { AuditRecord } from './models/entities/audit-record.entity';
import { AuditRetentionPolicy } from './models/entities/audit-retention-policy.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
        synchronize: false,
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    ScheduleModule.forRoot(),
    EventsModule,
    AuditModule,
  ],
})
export class AppModule {}
