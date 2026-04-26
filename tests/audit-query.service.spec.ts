import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditQueryService } from '../src/services/audit-query.service';
import { AuditRecord } from '../src/models/entities/audit-record.entity';

describe('AuditQueryService', () => {
  let service: AuditQueryService;
  let auditRepository: jest.Mocked<Repository<AuditRecord>>;
  let mockQueryBuilder: any;

  const mockAuditRecords: Partial<AuditRecord>[] = [
    {
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
      newState: { userHashId: 'U-NEW1' },
      metadata: null,
      ipAddress: null,
      eventTimestamp: new Date('2026-01-01'),
      organizationHashId: 'O-92AF',
      createdAt: new Date('2026-01-01'),
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      hashId: 'AUD-92AF',
      eventType: 'identity.user.updated',
      source: 'zorbit-identity',
      actor: { hashId: 'U-81F3', type: 'user' },
      namespace: { type: 'O', id: 'O-92AF' },
      resourceType: 'user',
      resourceId: 'U-NEW1',
      action: 'updated',
      previousState: { displayName: 'Old Name' },
      newState: { displayName: 'New Name' },
      metadata: null,
      ipAddress: '127.0.0.1',
      eventTimestamp: new Date('2026-01-02'),
      organizationHashId: 'O-92AF',
      createdAt: new Date('2026-01-02'),
    },
  ];

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([mockAuditRecords, 2]),
      getMany: jest.fn().mockResolvedValue(mockAuditRecords),
      getRawMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(2),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditQueryService,
        {
          provide: getRepositoryToken(AuditRecord),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<AuditQueryService>(AuditQueryService);
    auditRepository = module.get(getRepositoryToken(AuditRecord)) as jest.Mocked<Repository<AuditRecord>>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('query', () => {
    it('should return paginated audit records for an organization', async () => {
      const result = await service.query('O-92AF', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.organization_hash_id = :orgId',
        { orgId: 'O-92AF' },
      );
    });

    it('should apply date range filters', async () => {
      await service.query('O-92AF', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.event_timestamp BETWEEN :start AND :end',
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      );
    });

    it('should apply actor filter', async () => {
      await service.query('O-92AF', {
        actor: 'U-81F3',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "audit.actor->>'hashId' = :actor",
        { actor: 'U-81F3' },
      );
    });

    it('should apply action filter', async () => {
      await service.query('O-92AF', {
        action: 'created',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action = :action',
        { action: 'created' },
      );
    });

    it('should apply event type filter with LIKE', async () => {
      await service.query('O-92AF', {
        eventType: 'identity',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.event_type LIKE :eventType',
        { eventType: '%identity%' },
      );
    });

    it('should handle pagination correctly', async () => {
      await service.query('O-92AF', { page: 3, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should return a single audit record', async () => {
      auditRepository.findOne.mockResolvedValue(mockAuditRecords[0] as AuditRecord);

      const result = await service.findOne('O-92AF', 'AUD-81F3');

      expect(result.hashId).toBe('AUD-81F3');
      expect(auditRepository.findOne).toHaveBeenCalledWith({
        where: { hashId: 'AUD-81F3', organizationHashId: 'O-92AF' },
      });
    });

    it('should throw NotFoundException if record not found', async () => {
      auditRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('O-92AF', 'AUD-0000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('count (E-OVERFETCH cycle-105)', () => {
    it('should return {count} for an org with no filters', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(42);

      const result = await service.count('O-92AF', {});

      expect(result).toEqual({ count: 42 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.organization_hash_id = :orgId',
        { orgId: 'O-92AF' },
      );
      // Crucially: no skip/take/getManyAndCount path — we never assemble row data
      expect(mockQueryBuilder.getManyAndCount).not.toHaveBeenCalled();
    });

    it('should apply the same filter shape as query()', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(7);

      await service.count('O-92AF', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        actor: 'U-81F3',
        action: 'created',
        eventType: 'identity',
        source: 'zorbit-identity',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.event_timestamp BETWEEN :start AND :end',
        expect.any(Object),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "audit.actor->>'hashId' = :actor",
        { actor: 'U-81F3' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action = :action',
        { action: 'created' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.event_type LIKE :eventType',
        { eventType: '%identity%' },
      );
    });
  });

  describe('countGlobal (E-OVERFETCH cycle-105)', () => {
    it('should return {count} across all orgs', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(1247);

      const result = await service.countGlobal({});

      expect(result).toEqual({ count: 1247 });
      // Global = no org_hash_id where clause
      expect(mockQueryBuilder.where).not.toHaveBeenCalledWith(
        'audit.organization_hash_id = :orgId',
        expect.any(Object),
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregate statistics', async () => {
      auditRepository.count
        .mockResolvedValueOnce(100) // totalRecords
        .mockResolvedValueOnce(50)  // last 24h
        .mockResolvedValueOnce(80); // last 7d

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { source: 'zorbit-identity', count: '60' },
          { source: 'zorbit-pii-vault', count: '40' },
        ])
        .mockResolvedValueOnce([
          { action: 'created', count: '50' },
          { action: 'updated', count: '30' },
          { action: 'deleted', count: '20' },
        ]);

      const result = await service.getStats();

      expect(result.totalRecords).toBe(100);
      expect(result.recordsBySource).toHaveLength(2);
      expect(result.recordsByAction).toHaveLength(3);
    });
  });
});
