import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditRecord } from '../models/entities/audit-record.entity';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditRecord])],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
