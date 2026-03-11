import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload, Admin } from 'kafkajs';
import { createKafkaConfig } from '../config/kafka.config';
import { AuditRecord } from '../models/entities/audit-record.entity';
import { ZorbitEventEnvelope, AUDIT_SUBSCRIBED_TOPIC_PATTERN, AuditEvents } from '../events/audit.events';
import { EventPublisherService } from '../events/event-publisher.service';
import { HashIdService } from './hash-id.service';

/**
 * Consumes all platform events from Kafka and stores them as immutable audit records.
 * Subscribes to all topics matching the platform event pattern.
 */
@Injectable()
export class AuditIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditIngestionService.name);
  private consumer!: Consumer;
  private admin!: Admin;
  private kafka!: Kafka;

  constructor(
    @InjectRepository(AuditRecord)
    private readonly auditRepository: Repository<AuditRecord>,
    private readonly configService: ConfigService,
    private readonly hashIdService: HashIdService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = createKafkaConfig(this.configService);
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });
    this.consumer = this.kafka.consumer({ groupId: kafkaConfig.groupId });
    this.admin = this.kafka.admin();

    try {
      await this.admin.connect();
      await this.consumer.connect();

      // Get all existing topics and subscribe to matching ones
      const topics = await this.admin.listTopics();
      const matchingTopics = topics.filter((t) =>
        AUDIT_SUBSCRIBED_TOPIC_PATTERN.test(t),
      );

      if (matchingTopics.length > 0) {
        for (const topic of matchingTopics) {
          await this.consumer.subscribe({ topic, fromBeginning: false });
        }
        this.logger.log(`Subscribed to ${matchingTopics.length} topics: ${matchingTopics.join(', ')}`);
      } else {
        this.logger.warn('No matching platform event topics found — will retry on next restart');
      }

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('Audit ingestion consumer started');
    } catch (error) {
      this.logger.warn('Kafka consumer connection failed — audit ingestion unavailable', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.consumer?.disconnect();
      await this.admin?.disconnect();
    } catch {
      // swallow on shutdown
    }
  }

  /**
   * Process a single Kafka message and store it as an audit record.
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    if (!message.value) {
      return;
    }

    try {
      const envelope: ZorbitEventEnvelope = JSON.parse(message.value.toString());
      await this.ingestEvent(envelope);
    } catch (error) {
      this.logger.error('Failed to ingest audit event', error);
    }
  }

  /**
   * Transform a platform event envelope into an immutable audit record and store it.
   */
  async ingestEvent(envelope: ZorbitEventEnvelope): Promise<AuditRecord> {
    const eventParts = envelope.eventType.split('.');
    const action = eventParts[eventParts.length - 1] || 'unknown';
    const resourceType = eventParts.length >= 2 ? eventParts[eventParts.length - 2] : null;

    const eventPayload = envelope.payload as Record<string, unknown> | undefined;

    // Extract resource ID from payload if available
    const resourceId = this.extractResourceId(eventPayload);

    // Extract organization hash ID from namespace
    const organizationHashId = envelope.namespace === 'O' ? envelope.namespaceId : null;

    const record = this.auditRepository.create({
      hashId: this.hashIdService.generate('AUD'),
      eventType: envelope.eventType,
      source: envelope.source,
      actor: this.extractActor(eventPayload),
      namespace: {
        type: envelope.namespace,
        id: envelope.namespaceId,
      },
      resourceType,
      resourceId,
      action,
      previousState: (eventPayload?.previousState as Record<string, unknown>) || null,
      newState: (eventPayload?.newState as Record<string, unknown>) || eventPayload || null,
      metadata: (envelope.metadata as Record<string, unknown>) || null,
      ipAddress: (eventPayload?.ipAddress as string) || null,
      eventTimestamp: new Date(envelope.timestamp),
      organizationHashId,
    });

    const saved = await this.auditRepository.save(record);

    // Publish audit.record.created event (but don't create infinite loop)
    await this.eventPublisher.publish(
      AuditEvents.RECORD_CREATED,
      envelope.namespace,
      envelope.namespaceId,
      { auditHashId: saved.hashId, eventType: envelope.eventType },
    );

    this.logger.debug(`Ingested audit record ${saved.hashId} for event ${envelope.eventType}`);
    return saved;
  }

  /**
   * Extract actor information from the event payload.
   */
  private extractActor(payload: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!payload) return {};

    // Common patterns for actor fields in platform events
    if (payload.userHashId) {
      return { hashId: payload.userHashId, type: 'user' };
    }
    if (payload.createdBy) {
      return { hashId: payload.createdBy, type: 'user' };
    }
    if (payload.deletedBy) {
      return { hashId: payload.deletedBy, type: 'user' };
    }
    if (payload.accessedBy) {
      return { hashId: payload.accessedBy, type: 'user' };
    }

    return {};
  }

  /**
   * Extract resource ID from the event payload.
   */
  private extractResourceId(payload: Record<string, unknown> | undefined): string | null {
    if (!payload) return null;

    // Common patterns for resource ID fields
    const idFields = [
      'userHashId',
      'sessionHashId',
      'tokenHashId',
      'organizationHashId',
      'resourceHashId',
      'hashId',
    ];

    for (const field of idFields) {
      if (payload[field] && typeof payload[field] === 'string') {
        return payload[field] as string;
      }
    }

    return null;
  }
}
