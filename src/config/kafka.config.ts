import { ConfigService } from '@nestjs/config';

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
}

export function createKafkaConfig(configService: ConfigService): KafkaConfig {
  const brokersRaw = configService.get<string>('KAFKA_BROKERS', 'localhost:9097');
  return {
    brokers: brokersRaw.split(',').map((b) => b.trim()),
    clientId: configService.get<string>('KAFKA_CLIENT_ID', 'zorbit-audit'),
    groupId: configService.get<string>('KAFKA_GROUP_ID', 'zorbit-audit-group'),
  };
}
