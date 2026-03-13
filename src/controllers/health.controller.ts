import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/G/health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'zorbit-audit',
      timestamp: new Date().toISOString(),
    };
  }
}
