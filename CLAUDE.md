# Zorbit Service: zorbit-audit

## Purpose

This repository implements the audit service for the Zorbit platform.

Zorbit is a MACH-compliant shared platform infrastructure used to build enterprise applications.

The audit service provides an immutable audit trail for all platform operations. It consumes
events from all platform services via Kafka and stores them as immutable audit records.

## Responsibilities

- Capture all platform events from Kafka (identity.*, authorization.*, navigation.*, pii.*, messaging.*)
- Store immutable audit records (INSERT only — never UPDATE or DELETE)
- Query and search audit logs with filters (date range, actor, action, resource, namespace)
- Aggregate statistics for compliance dashboards
- Export audit logs in CSV/JSON format
- Manage retention policies per organization and event type

## Architecture Context

This service follows Zorbit platform architecture.

Key rules:

- REST API grammar: /api/v1/{namespace}/{namespace_id}/resource
- namespace-based multi-tenancy (G, O, D, U)
- short hash identifiers (PREFIX-HASH, e.g. AUD-81F3)
- event-driven integration (domain.entity.action)
- service isolation
- Audit records are IMMUTABLE — no UPDATE or DELETE allowed

## Dependencies

Allowed dependencies:

- zorbit-identity (JWT validation)
- zorbit-messaging (Kafka — consumes all platform events)

Forbidden dependencies:

- direct database access to other services
- cross-service code imports

## Platform Dependencies

Upstream services:
- zorbit-messaging (Kafka — consumes all platform events)
- zorbit-identity (JWT authentication)

Downstream consumers:
- zorbit-admin-console (audit log UI)
- Compliance tools and dashboards

## Repository Structure

- /src/api — route definitions
- /src/controllers — request handlers (AuditController)
- /src/services — business logic (AuditIngestionService, AuditQueryService, AuditExportService, RetentionService)
- /src/models — database entities (AuditRecord, AuditRetentionPolicy) and DTOs
- /src/events — event publishers and consumers
- /src/middleware — JWT, namespace, logging middleware
- /src/config — configuration module
- /tests — unit and integration tests

## Running Locally

```bash
npm install
cp .env.example .env
docker-compose up -d  # PostgreSQL + Kafka
npm run start:dev
```

Service runs on port 3006.

## Events Published

- audit.record.created
- audit.retention.expired

## Events Consumed

- ALL platform events:
  - identity.user.created, identity.user.updated, identity.user.deleted
  - identity.session.created, identity.session.expired
  - identity.organization.created, identity.organization.updated
  - authorization.* (all authorization events)
  - navigation.* (all navigation events)
  - pii.token.created, pii.token.accessed, pii.token.deleted
  - messaging.* (all messaging events)

## API Endpoints

- GET /api/v1/O/:orgId/audit/logs — query audit logs with filters
- GET /api/v1/O/:orgId/audit/logs/:logId — get a single audit record
- GET /api/v1/G/audit/stats — aggregate audit statistics
- GET /api/v1/O/:orgId/audit/export — export audit logs (CSV/JSON)

## Development Guidelines

Follow Zorbit architecture rules.

- Audit records are IMMUTABLE — never use UPDATE or DELETE
- Entity has NO @UpdateDateColumn — INSERT only
- All records include full event context (actor, namespace, resource, timestamps)
- Support high-throughput event ingestion from Kafka
- Retention policies control automatic cleanup of old records
