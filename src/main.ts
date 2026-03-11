import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // OpenTelemetry must be initialized before the app starts
  initOpenTelemetry();

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Zorbit Audit')
    .setDescription('Immutable audit trail for all platform operations. Captures events from all services via Kafka and provides query, search, statistics, and export capabilities.')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('audit', 'Audit log query, statistics, and export')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3006);

  await app.listen(port);
  console.log(`zorbit-audit service listening on port ${port}`);
}

function initOpenTelemetry(): void {
  // TODO: Initialize OpenTelemetry SDK when @opentelemetry/sdk-node is configured
  // const sdk = new NodeSDK({
  //   serviceName: process.env.OTEL_SERVICE_NAME || 'zorbit-audit',
  //   traceExporter: new OTLPTraceExporter({
  //     url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  //   }),
  // });
  // sdk.start();
}

bootstrap();
