import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditRecord } from '../models/entities/audit-record.entity';
import { AuditRetentionPolicy } from '../models/entities/audit-retention-policy.entity';
import { EventPublisherService } from '../events/event-publisher.service';
import { AuditEvents } from '../events/audit.events';

/**
 * Manages retention of audit records.
 * Runs a scheduled job to delete expired records based on retention policies.
 *
 * NOTE: This is the ONLY place where audit records are deleted, and only
 * based on explicit retention policies. Audit records are otherwise immutable.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectRepository(AuditRecord)
    private readonly auditRepository: Repository<AuditRecord>,
    @InjectRepository(AuditRetentionPolicy)
    private readonly policyRepository: Repository<AuditRetentionPolicy>,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Scheduled job to apply retention policies and delete expired records.
   * Runs daily at 2 AM by default.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async applyRetentionPolicies(): Promise<void> {
    this.logger.log('Starting retention policy enforcement...');

    const policies = await this.policyRepository.find();

    if (policies.length === 0) {
      this.logger.debug('No retention policies configured — skipping');
      return;
    }

    let totalDeleted = 0;

    for (const policy of policies) {
      const cutoffDate = new Date(
        Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000,
      );

      const qb = this.auditRepository
        .createQueryBuilder('audit')
        .where('audit.organization_hash_id = :orgId', {
          orgId: policy.organizationHashId,
        })
        .andWhere('audit.event_timestamp < :cutoff', { cutoff: cutoffDate });

      // Apply event pattern matching
      if (policy.eventPattern !== '*') {
        const likePattern = policy.eventPattern.replace(/\*/g, '%');
        qb.andWhere('audit.event_type LIKE :pattern', {
          pattern: likePattern,
        });
      }

      const count = await qb.getCount();

      if (count > 0) {
        // Delete in batches to avoid overwhelming the database
        const batchSize = 1000;
        let deleted = 0;

        while (deleted < count) {
          const recordsToDelete = await qb.take(batchSize).getMany();
          if (recordsToDelete.length === 0) break;

          await this.auditRepository.remove(recordsToDelete);
          deleted += recordsToDelete.length;
        }

        totalDeleted += deleted;

        this.logger.log(
          `Deleted ${deleted} expired audit records for org ${policy.organizationHashId} matching ${policy.eventPattern}`,
        );

        // Publish retention event
        await this.eventPublisher.publish(
          AuditEvents.RETENTION_EXPIRED,
          'O',
          policy.organizationHashId,
          {
            organizationHashId: policy.organizationHashId,
            eventPattern: policy.eventPattern,
            recordsDeleted: deleted,
            cutoffDate: cutoffDate.toISOString(),
          },
        );
      }
    }

    this.logger.log(`Retention enforcement complete: ${totalDeleted} records deleted`);
  }

  /**
   * Get all retention policies for an organization.
   */
  async getPolicies(orgId: string): Promise<AuditRetentionPolicy[]> {
    return this.policyRepository.find({
      where: { organizationHashId: orgId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new retention policy.
   */
  async createPolicy(
    organizationHashId: string,
    eventPattern: string,
    retentionDays: number,
  ): Promise<AuditRetentionPolicy> {
    const policy = this.policyRepository.create({
      organizationHashId,
      eventPattern,
      retentionDays,
    });

    return this.policyRepository.save(policy);
  }
}
