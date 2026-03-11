import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Defines retention policies for audit records.
 * Controls how long audit records are kept per organization and event pattern.
 */
@Entity('audit_retention_policies')
export class AuditRetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Organization this policy applies to */
  @Column({ name: 'organization_hash_id', length: 20 })
  @Index()
  organizationHashId!: string;

  /**
   * Event pattern to match, e.g. 'identity.*', 'pii.token.*', '*'
   * Uses simple glob-style matching.
   */
  @Column({ name: 'event_pattern', length: 128 })
  eventPattern!: string;

  /** Number of days to retain matching audit records */
  @Column({ name: 'retention_days', type: 'integer' })
  retentionDays!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
