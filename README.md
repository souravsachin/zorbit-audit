# zorbit-audit

Zorbit Platform Audit Service — immutable audit trail for all platform operations.

## Quick Start

```bash
npm install
cp .env.example .env
docker-compose up -d
npm run start:dev
```

Service runs on **port 3006**.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/O/:orgId/audit/logs | Query audit logs with filters |
| GET | /api/v1/O/:orgId/audit/logs/:logId | Get single audit record |
| GET | /api/v1/G/audit/stats | Aggregate audit statistics |
| GET | /api/v1/O/:orgId/audit/export | Export logs (CSV/JSON) |

## Architecture

Audit records are **immutable** — INSERT only, no UPDATE or DELETE. All platform events are consumed from Kafka and stored as audit records with full context (actor, namespace, resource, timestamps).
