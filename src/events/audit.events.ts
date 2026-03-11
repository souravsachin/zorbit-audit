/**
 * Canonical event type constants for the audit domain.
 * Naming convention: domain.entity.action
 */
export const AuditEvents = {
  RECORD_CREATED: 'audit.record.created',
  RETENTION_EXPIRED: 'audit.retention.expired',
} as const;

export type AuditEventType = (typeof AuditEvents)[keyof typeof AuditEvents];

/**
 * Canonical event envelope for all Zorbit platform events.
 */
export interface ZorbitEventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  namespace: string;
  namespaceId: string;
  payload: T;
  metadata?: Record<string, string>;
}

/**
 * Topics to subscribe to for platform-wide audit.
 * Uses regex pattern to subscribe to all platform event topics.
 */
export const AUDIT_SUBSCRIBED_TOPIC_PATTERN = /^(identity|authorization|navigation|pii|messaging)-/;
