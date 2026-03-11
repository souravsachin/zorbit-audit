import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuditIngestionService } from '../src/services/audit-ingestion.service';
import { AuditRecord } from '../src/models/entities/audit-record.entity';
import { HashIdService } from '../src/services/hash-id.service';
import { EventPublisherService } from '../src/events/event-publisher.service';
import { ZorbitEventEnvelope } from '../src/events/audit.events';

describe('AuditIngestionService', () => {
  let service: AuditIngestionService;
  let auditRepository: jest.Mocked<Repository<AuditRecord>>;
  let hashIdService: jest.Mocked<HashIdService>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockAuditRecord: Partial<AuditRecord> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    hashId: 'AUD-81F3',
    eventType: 'identity.user.created',
    source: 'zorbit-identity',
    actor: { hashId: 'U-81F3', type: 'user' },
    namespace: { type: 'O', id: 'O-92AF' },
    resourceType: 'user',
    resourceId: 'U-NEW1',
    action: 'created',
    previousState: null,
    newState: { userHashId: 'U-NEW1', displayName: 'Test User' },
    metadata: null,
    ipAddress: null,
    eventTimestamp: new Date('2026-01-01'),
    organizationHashId: 'O-92AF',
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditIngestionService,
        {
          provide: getRepositoryToken(AuditRecord),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('localhost:9092'),
          },
        },
        {
          provide: HashIdService,
          useValue: { generate: jest.fn() },
        },
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuditIngestionService>(AuditIngestionService);
    auditRepository = module.get(getRepositoryToken(AuditRecord)) as jest.Mocked<Repository<AuditRecord>>;
    hashIdService = module.get(HashIdService) as jest.Mocked<HashIdService>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestEvent', () => {
    const mockEnvelope: ZorbitEventEnvelope = {
      eventId: 'evt-123',
      eventType: 'identity.user.created',
      timestamp: '2026-01-01T00:00:00.000Z',
      source: 'zorbit-identity',
      namespace: 'O',
      namespaceId: 'O-92AF',
      payload: {
        userHashId: 'U-NEW1',
        displayName: 'Test User',
        organizationHashId: 'O-92AF',
      },
    };

    it('should create an immutable audit record from an event envelope', async () => {
      hashIdService.generate.mockReturnValue('AUD-NEW1');
      auditRepository.create.mockReturnValue(mockAuditRecord as AuditRecord);
      auditRepository.save.mockResolvedValue(mockAuditRecord as AuditRecord);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.ingestEvent(mockEnvelope);

      expect(hashIdService.generate).toHaveBeenCalledWith('AUD');
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hashId: 'AUD-NEW1',
          eventType: 'identity.user.created',
          source: 'zorbit-identity',
          action: 'created',
          resourceType: 'user',
        }),
      );
      expect(auditRepository.save).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'audit.record.created',
        'O',
        'O-92AF',
        expect.objectContaining({
          auditHashId: 'AUD-81F3',
          eventType: 'identity.user.created',
        }),
      );
    });

    it('should extract actor from userHashId in payload', async () => {
      hashIdService.generate.mockReturnValue('AUD-NEW2');
      auditRepository.create.mockReturnValue(mockAuditRecord as AuditRecord);
      auditRepository.save.mockResolvedValue(mockAuditRecord as AuditRecord);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.ingestEvent(mockEnvelope);

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: { hashId: 'U-NEW1', type: 'user' },
        }),
      );
    });

    it('should extract organizationHashId from O namespace', async () => {
      hashIdService.generate.mockReturnValue('AUD-NEW3');
      auditRepository.create.mockReturnValue(mockAuditRecord as AuditRecord);
      auditRepository.save.mockResolvedValue(mockAuditRecord as AuditRecord);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.ingestEvent(mockEnvelope);

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationHashId: 'O-92AF',
        }),
      );
    });

    it('should set organizationHashId to null for non-org namespaces', async () => {
      const globalEnvelope = {
        ...mockEnvelope,
        namespace: 'G',
        namespaceId: 'G',
      };

      hashIdService.generate.mockReturnValue('AUD-NEW4');
      auditRepository.create.mockReturnValue(mockAuditRecord as AuditRecord);
      auditRepository.save.mockResolvedValue(mockAuditRecord as AuditRecord);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.ingestEvent(globalEnvelope);

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationHashId: null,
        }),
      );
    });

    it('should handle PII events with different actor fields', async () => {
      const piiEnvelope: ZorbitEventEnvelope = {
        eventId: 'evt-456',
        eventType: 'pii.token.created',
        timestamp: '2026-01-01T00:00:00.000Z',
        source: 'zorbit-pii-vault',
        namespace: 'G',
        namespaceId: 'G',
        payload: {
          tokenHashId: 'PII-ABCD',
          createdBy: 'U-81F3',
          dataType: 'email',
        },
      };

      hashIdService.generate.mockReturnValue('AUD-PII1');
      auditRepository.create.mockReturnValue(mockAuditRecord as AuditRecord);
      auditRepository.save.mockResolvedValue(mockAuditRecord as AuditRecord);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.ingestEvent(piiEnvelope);

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: { hashId: 'U-81F3', type: 'user' },
          resourceId: 'PII-ABCD',
          action: 'created',
        }),
      );
    });
  });
});
