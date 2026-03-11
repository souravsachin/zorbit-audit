import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * Generates short hash identifiers following the Zorbit PREFIX-HASH pattern.
 * Hash portion is 4 uppercase hex characters derived from crypto.randomBytes.
 * These identifiers are immutable, globally unique (best-effort), and non-sequential.
 */
@Injectable()
export class HashIdService {
  /**
   * Generate a short hash identifier.
   * @param prefix - Entity prefix, e.g. 'AUD'
   * @returns identifier like 'AUD-81F3'
   */
  generate(prefix: string): string {
    const bytes = randomBytes(2); // 2 bytes = 4 hex chars
    const hash = bytes.toString('hex').toUpperCase();
    return `${prefix}-${hash}`;
  }
}
