import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditRecord } from '../models/entities/audit-record.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(AuditRecord)
    private readonly auditRecordRepo: Repository<AuditRecord>,
  ) {}

  async seedSystem(): Promise<Record<string, unknown>> {
    const count = await this.auditRecordRepo.count();

    if (count > 0) {
      return { seeded: 0, message: 'Audit records already present' };
    }

    const records: Partial<AuditRecord>[] = [
      {
        hashId: 'AUD-SYS1',
        eventType: 'platform.boot',
        source: 'zorbit-audit',
        action: 'boot',
        actor: { hashId: 'SYSTEM', type: 'system', displayName: 'Platform Boot' },
        namespace: { type: 'G', id: 'GLOBAL' },
        organizationHashId: 'O-OZPY',
        eventTimestamp: new Date('2026-04-01T00:00:00Z'),
        metadata: { message: 'Platform initialized' },
        resourceType: null,
        resourceId: null,
        previousState: null,
        newState: null,
        ipAddress: null,
      },
      {
        hashId: 'AUD-SYS2',
        eventType: 'identity.user.created',
        source: 'zorbit-identity',
        action: 'created',
        actor: { hashId: 'SYSTEM', type: 'system' },
        namespace: { type: 'O', id: 'O-OZPY' },
        organizationHashId: 'O-OZPY',
        eventTimestamp: new Date('2026-04-01T00:01:00Z'),
        metadata: null,
        resourceType: 'user',
        resourceId: null,
        previousState: null,
        newState: null,
        ipAddress: null,
      },
      {
        hashId: 'AUD-SYS3',
        eventType: 'authorization.role.assigned',
        source: 'zorbit-authorization',
        action: 'assigned',
        actor: { hashId: 'SYSTEM', type: 'system' },
        namespace: { type: 'O', id: 'O-OZPY' },
        organizationHashId: 'O-OZPY',
        eventTimestamp: new Date('2026-04-01T00:02:00Z'),
        metadata: null,
        resourceType: 'role',
        resourceId: null,
        previousState: null,
        newState: null,
        ipAddress: null,
      },
    ];

    let seeded = 0;
    for (const record of records) {
      try {
        const entity = this.auditRecordRepo.create(record);
        await this.auditRecordRepo.save(entity);
        seeded++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Skipping duplicate audit record ${record.hashId}: ${message}`);
      }
    }

    this.logger.log(`Seeded ${seeded} system audit records`);
    return { success: true, seeded: { auditRecords: seeded } };
  }

  async seedDemo(): Promise<Record<string, unknown>> {
    // Delete previous demo data (identified by source='demo-seed')
    const existing = await this.auditRecordRepo.find({ where: { source: 'demo-seed' } });
    if (existing.length > 0) {
      await this.auditRecordRepo.remove(existing);
    }

    const demoActor = { hashId: 'U-DM01', displayName: 'Arjun Sharma', type: 'user' };
    const demoOrg = 'O-DEMO1';
    const demoNS = { type: 'O', id: demoOrg };

    const records: Partial<AuditRecord>[] = [
      {
        hashId: 'AUD-DM01',
        eventType: 'hi_quotation.quotation.created',
        source: 'demo-seed',
        action: 'created',
        actor: demoActor,
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-01T09:00:00Z'),
        metadata: { quotationId: 'QT-DEMO01', product: 'Group Health Insurance' },
        resourceType: 'quotation',
        resourceId: 'QT-DEMO01',
        previousState: null,
        newState: { status: 'draft' },
        ipAddress: '192.168.1.1',
      },
      {
        hashId: 'AUD-DM02',
        eventType: 'hi_quotation.member.added',
        source: 'demo-seed',
        action: 'added',
        actor: demoActor,
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-01T09:15:00Z'),
        metadata: { quotationId: 'QT-DEMO01', memberCount: 5 },
        resourceType: 'member',
        resourceId: 'QT-DEMO01',
        previousState: null,
        newState: { memberCount: 5 },
        ipAddress: '192.168.1.1',
      },
      {
        hashId: 'AUD-DM03',
        eventType: 'hi_quotation.quotation.submitted',
        source: 'demo-seed',
        action: 'submitted',
        actor: demoActor,
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-02T10:00:00Z'),
        metadata: { quotationId: 'QT-DEMO01', premium: 125000 },
        resourceType: 'quotation',
        resourceId: 'QT-DEMO01',
        previousState: { status: 'draft' },
        newState: { status: 'submitted' },
        ipAddress: '192.168.1.1',
      },
      {
        hashId: 'AUD-DM04',
        eventType: 'uw_workflow.queue.assigned',
        source: 'demo-seed',
        action: 'assigned',
        actor: { hashId: 'SYSTEM', type: 'system', displayName: 'UW Queue Engine' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-02T10:05:00Z'),
        metadata: { quotationId: 'QT-DEMO01', queue: 'GROUP_HEALTH_UW', priority: 'NORMAL' },
        resourceType: 'uw_queue',
        resourceId: 'QT-DEMO01',
        previousState: null,
        newState: { queueStatus: 'pending_uw' },
        ipAddress: null,
      },
      {
        hashId: 'AUD-DM05',
        eventType: 'hi_uw_decisioning.evaluation.started',
        source: 'demo-seed',
        action: 'started',
        actor: { hashId: 'U-UW01', displayName: 'Priya Nair', type: 'user' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-03T11:00:00Z'),
        metadata: { quotationId: 'QT-DEMO01', uwRef: 'UW-DEMO01' },
        resourceType: 'uw_evaluation',
        resourceId: 'UW-DEMO01',
        previousState: null,
        newState: { status: 'under_review' },
        ipAddress: '10.0.0.5',
      },
      {
        hashId: 'AUD-DM06',
        eventType: 'hi_uw_decisioning.medical_review.requested',
        source: 'demo-seed',
        action: 'requested',
        actor: { hashId: 'U-UW01', displayName: 'Priya Nair', type: 'user' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-04T14:30:00Z'),
        metadata: { uwRef: 'UW-DEMO01', reason: 'Pre-existing conditions declared' },
        resourceType: 'medical_review',
        resourceId: 'UW-DEMO01',
        previousState: { status: 'under_review' },
        newState: { status: 'pending_medical_review' },
        ipAddress: '10.0.0.5',
      },
      {
        hashId: 'AUD-DM07',
        eventType: 'hi_uw_decisioning.medical_review.completed',
        source: 'demo-seed',
        action: 'completed',
        actor: { hashId: 'U-MED01', displayName: 'Dr. Ramesh Kumar', type: 'user' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-07T09:00:00Z'),
        metadata: { uwRef: 'UW-DEMO01', outcome: 'acceptable_with_loading' },
        resourceType: 'medical_review',
        resourceId: 'UW-DEMO01',
        previousState: { status: 'pending_medical_review' },
        newState: { status: 'medical_cleared', loading: '15%' },
        ipAddress: '10.0.0.8',
      },
      {
        hashId: 'AUD-DM08',
        eventType: 'hi_uw_decisioning.evaluation.completed',
        source: 'demo-seed',
        action: 'completed',
        actor: { hashId: 'U-UW01', displayName: 'Priya Nair', type: 'user' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-08T16:00:00Z'),
        metadata: { uwRef: 'UW-DEMO01', decision: 'approve_with_loading', loadingPct: 15 },
        resourceType: 'uw_evaluation',
        resourceId: 'UW-DEMO01',
        previousState: { status: 'under_review' },
        newState: { status: 'completed', decision: 'approve_with_loading' },
        ipAddress: '10.0.0.5',
      },
      {
        hashId: 'AUD-DM09',
        eventType: 'uw_workflow.decision.approved',
        source: 'demo-seed',
        action: 'approved',
        actor: { hashId: 'U-MGR01', displayName: 'Sunita Verma', type: 'user' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-09T10:00:00Z'),
        metadata: { uwRef: 'UW-DEMO01', approvedBy: 'U-MGR01' },
        resourceType: 'uw_decision',
        resourceId: 'UW-DEMO01',
        previousState: { approvalStatus: 'pending' },
        newState: { approvalStatus: 'approved' },
        ipAddress: '10.0.0.2',
      },
      {
        hashId: 'AUD-DM10',
        eventType: 'hi_quotation.quotation.approved',
        source: 'demo-seed',
        action: 'approved',
        actor: { hashId: 'SYSTEM', type: 'system', displayName: 'UW Decision Engine' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-09T10:05:00Z'),
        metadata: { quotationId: 'QT-DEMO01', finalPremium: 143750 },
        resourceType: 'quotation',
        resourceId: 'QT-DEMO01',
        previousState: { status: 'submitted' },
        newState: { status: 'approved', premium: 143750 },
        ipAddress: null,
      },
      {
        hashId: 'AUD-DM11',
        eventType: 'hi_quotation.policy.issued',
        source: 'demo-seed',
        action: 'issued',
        actor: { hashId: 'SYSTEM', type: 'system', displayName: 'Policy Issuance Engine' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-10T11:00:00Z'),
        metadata: { quotationId: 'QT-DEMO01', policyId: 'POL-DEMO01' },
        resourceType: 'policy',
        resourceId: 'POL-DEMO01',
        previousState: null,
        newState: { status: 'active', policyNumber: 'GHI-2026-001234' },
        ipAddress: null,
      },
      {
        hashId: 'AUD-DM12',
        eventType: 'hi_quotation.customer.notified',
        source: 'demo-seed',
        action: 'notified',
        actor: { hashId: 'SYSTEM', type: 'system', displayName: 'Notification Service' },
        namespace: demoNS,
        organizationHashId: demoOrg,
        eventTimestamp: new Date('2026-04-10T11:02:00Z'),
        metadata: { policyId: 'POL-DEMO01', channel: 'email', recipient: 'PII-DM01' },
        resourceType: 'notification',
        resourceId: 'POL-DEMO01',
        previousState: null,
        newState: { notified: true },
        ipAddress: null,
      },
    ];

    let seeded = 0;
    for (const record of records) {
      try {
        const entity = this.auditRecordRepo.create(record);
        await this.auditRecordRepo.save(entity);
        seeded++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Skipping duplicate audit record ${record.hashId}: ${message}`);
      }
    }

    this.logger.log(`Seeded ${seeded} demo audit records`);
    return { success: true, seeded: { auditRecords: seeded } };
  }

  async flushDemo(): Promise<Record<string, unknown>> {
    const existing = await this.auditRecordRepo.find({ where: { source: 'demo-seed' } });
    const count = existing.length;
    if (count > 0) {
      await this.auditRecordRepo.remove(existing);
    }
    this.logger.log(`Flushed ${count} demo audit records`);
    return { success: true, flushed: { auditRecords: count } };
  }

  async flushAll(): Promise<Record<string, unknown>> {
    const count = await this.auditRecordRepo.count();
    await this.auditRecordRepo.clear();
    this.logger.log(`Flushed all ${count} audit records`);
    return { success: true, flushed: { auditRecords: count } };
  }
}
