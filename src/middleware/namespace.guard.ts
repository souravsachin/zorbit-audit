import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators';
import { JwtPayload } from './jwt.strategy';

/**
 * Guard that enforces namespace isolation.
 *
 * For Organization-scoped routes (O namespace):
 *   Validates that the orgId in the URL matches the org claim in the JWT.
 *   Users with 'platform.namespace.bypass' privilege can access other orgs.
 *
 * This prevents users from accessing audit records outside their namespace.
 */
@Injectable()
export class NamespaceGuard implements CanActivate {
  private readonly logger = new Logger(NamespaceGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const params = request.params;
    const canBypass = (user as any).privileges?.includes('platform.namespace.bypass');

    // Organization namespace check
    if (params.orgId && params.orgId !== user.org) {
      if (canBypass) {
        this.logger.log(`Privileged user ${user.sub} accessing audit for org ${params.orgId}`);
        return true;
      }
      throw new ForbiddenException(
        `Access denied: namespace mismatch for organization ${params.orgId}`,
      );
    }

    return true;
  }
}
