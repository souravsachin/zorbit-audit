import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Immutable audit record. INSERT only — no UPDATE or DELETE allowed.
 *
 * There is intentionally NO @UpdateDateColumn on this entity.
 * Audit records must never be modified after creation.
 */
@Entity('audit_records')
export class AuditRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. AUD-81F3 */
  @Column({ name: 'hash_id', unique: true, length: 20 })
  @Index()
  hashId!: string;

  /** The event type, e.g. 'identity.user.created' */
  @Column({ name: 'event_type', length: 128 })
  @Index()
  eventType!: string;

  /** The service that emitted the event, e.g. 'zorbit-identity' */
  @Column({ length: 64 })
  source!: string;

  /** Actor information: { hashId, type, displayName } */
  @Column({ type: 'jsonb', default: '{}' })
  actor!: Record<string, unknown>;

  /** Namespace context: { type, id } e.g. { type: 'O', id: 'O-92AF' } */
  @Column({ type: 'jsonb', default: '{}' })
  namespace!: Record<string, unknown>;

  /** The type of resource affected, e.g. 'user', 'session', 'token' */
  @Column({ name: 'resource_type', type: 'varchar', length: 64, nullable: true })
  @Index()
  resourceType!: string | null;

  /** The identifier of the affected resource */
  @Column({ name: 'resource_id', type: 'varchar', length: 64, nullable: true })
  @Index()
  resourceId!: string | null;

  /** The action performed, e.g. 'created', 'updated', 'deleted' */
  @Column({ length: 64 })
  @Index()
  action!: string;

  /** State before the action (for updates) */
  @Column({ name: 'previous_state', type: 'jsonb', nullable: true })
  previousState!: Record<string, unknown> | null;

  /** State after the action */
  @Column({ name: 'new_state', type: 'jsonb', nullable: true })
  newState!: Record<string, unknown> | null;

  /** Additional metadata from the event envelope */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  /** IP address of the original requester */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  /** Timestamp of the original event (from the event envelope) */
  @Column({ name: 'event_timestamp', type: 'timestamptz' })
  @Index()
  eventTimestamp!: Date;

  /** Organization this record belongs to (for namespace isolation queries) */
  @Column({ name: 'organization_hash_id', type: 'varchar', length: 20, nullable: true })
  @Index()
  organizationHashId!: string | null;

  /** When this audit record was ingested into the audit service */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // NOTE: Intentionally NO @UpdateDateColumn — audit records are immutable.
}
